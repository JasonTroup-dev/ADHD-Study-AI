import type { AssignmentImportance } from "@/types/assignments";
import type {
  SyllabusAssignment,
  SyllabusAssignmentDifficulty,
  SyllabusItemKind,
} from "@/types/syllabus";

export type StudyTaskPriority = Exclude<AssignmentImportance, "critical">;

export const DEFAULT_MAX_STUDY_TASKS_PER_DAY = 3;

const DAY_MS = 86_400_000;

const baseSessionCountByKind: Record<
  SyllabusItemKind,
  Record<SyllabusAssignmentDifficulty, number>
> = {
  assignment: { easy: 2, medium: 3, hard: 4 },
  exam: { easy: 2, medium: 3, hard: 4 },
  quiz: { easy: 1, medium: 2, hard: 3 },
};

const preparationDaysByKind: Record<
  SyllabusItemKind,
  Record<SyllabusAssignmentDifficulty, number>
> = {
  assignment: { easy: 4, medium: 10, hard: 18 },
  exam: { easy: 7, medium: 14, hard: 21 },
  quiz: { easy: 2, medium: 4, hard: 7 },
};

const projectTitlePattern =
  /\b(?:capstone|case study|journal|literature review|presentation|project|proposal|report|research)\b/i;

type StudyItem = Pick<
  SyllabusAssignment,
  "title" | "kind" | "dueDate" | "difficulty" | "points"
>;

export type ScheduledStudySession = {
  title: string;
  scheduledDate: string;
  priority: StudyTaskPriority;
};

export type SyllabusStudyPlanInput = {
  itemId: string;
  item: StudyItem;
};

export type BalancedStudySession = ScheduledStudySession & {
  itemId: string;
};

export type CreateBalancedStudyPlanOptions = {
  fromDate?: Date | string;
  existingTaskCounts?: ReadonlyMap<string, number> | Record<string, number>;
  maxTasksPerDay?: number;
};

type StudySessionCandidate = BalancedStudySession & {
  dueDate: string;
  earliestDate: string;
  latestDate: string;
  idealDate: string;
  sequence: number;
  sequenceFromEnd: number;
};

export function getAssignmentImportance(
  assignment: Pick<SyllabusAssignment, "difficulty" | "points">,
): AssignmentImportance {
  if (assignment.difficulty === "hard" && (assignment.points ?? 0) >= 100) {
    return "critical";
  }

  if (assignment.difficulty === "hard") return "high";
  if (assignment.difficulty === "medium") return "medium";
  return "low";
}

export function getStudyTaskPriority(
  assignment: Pick<SyllabusAssignment, "difficulty" | "points">,
): StudyTaskPriority {
  const importance = getAssignmentImportance(assignment);

  return importance === "critical" ? "high" : importance;
}

export function createBalancedStudyPlan(
  planItems: SyllabusStudyPlanInput[],
  options: CreateBalancedStudyPlanOptions = {},
): BalancedStudySession[] {
  const planningDate = getDateOnly(options.fromDate ?? new Date());
  const maxTasksPerDay = Math.max(
    1,
    Math.floor(options.maxTasksPerDay ?? DEFAULT_MAX_STUDY_TASKS_PER_DAY),
  );
  const taskCounts = getTaskCountMap(options.existingTaskCounts);
  const nextDateByItem = new Map<string, string>();
  const candidates = planItems
    .flatMap(({ itemId, item }) =>
      createStudySessionCandidates(itemId, item, planningDate),
    )
    .sort(compareCandidates);

  const scheduledSessions = candidates.map((candidate) => {
    const nextDate = nextDateByItem.get(candidate.itemId);
    const latestDate = nextDate
      ? maxDate(
          candidate.earliestDate,
          minDate(candidate.latestDate, addDays(nextDate, -1)),
        )
      : candidate.latestDate;
    const scheduledDate = findBestAvailableDate(
      candidate.idealDate,
      candidate.earliestDate,
      latestDate,
      taskCounts,
      maxTasksPerDay,
    );

    taskCounts.set(scheduledDate, (taskCounts.get(scheduledDate) ?? 0) + 1);
    nextDateByItem.set(candidate.itemId, scheduledDate);

    return {
      itemId: candidate.itemId,
      title: candidate.title,
      scheduledDate,
      priority: candidate.priority,
    };
  });

  return scheduledSessions.sort(
    (first, second) =>
      first.scheduledDate.localeCompare(second.scheduledDate) ||
      first.itemId.localeCompare(second.itemId) ||
      first.title.localeCompare(second.title),
  );
}

export function createStudyTasksForSyllabusItem(
  item: StudyItem,
  fromDate: Date | string = new Date(),
): ScheduledStudySession[] {
  return createBalancedStudyPlan(
    [{ itemId: "single-item", item }],
    { fromDate },
  ).map((session) => ({
    title: session.title,
    scheduledDate: session.scheduledDate,
    priority: session.priority,
  }));
}

function createStudySessionCandidates(
  itemId: string,
  item: StudyItem,
  planningDate: string,
): StudySessionCandidate[] {
  if (!item.dueDate || !isValidDateOnly(item.dueDate)) return [];
  if (item.dueDate < planningDate) return [];

  const dueDay = dateOnlyToDayNumber(item.dueDate);
  const planningDay = dateOnlyToDayNumber(planningDate);
  const lastStudyDay = dueDay <= planningDay + 1 ? planningDay : dueDay - 1;
  const normalStartDay = planningDay + 1;
  const preparationDays = getPreparationDays(item);
  const preferredStartDay = dueDay - preparationDays;
  const earliestStudyDay = Math.min(
    lastStudyDay,
    Math.max(normalStartDay, preferredStartDay),
  );
  const availableDays = lastStudyDay - earliestStudyDay + 1;
  const requestedSessionCount = getSessionCount(item);
  const sessionCount = Math.max(1, Math.min(requestedSessionCount, availableDays));
  const sessionTitles = getStudySessionTitles(item, sessionCount);
  const priority = getStudyTaskPriority(item);
  const earliestDate = dayNumberToDateOnly(
    Math.min(lastStudyDay, normalStartDay),
  );
  const latestDate = dayNumberToDateOnly(lastStudyDay);

  return sessionTitles.map((title, sequence) => {
    const offset =
      sessionCount === 1
        ? 0
        : Math.round((sequence * (availableDays - 1)) / (sessionCount - 1));

    return {
      itemId,
      title,
      scheduledDate: dayNumberToDateOnly(earliestStudyDay + offset),
      idealDate: dayNumberToDateOnly(earliestStudyDay + offset),
      earliestDate,
      latestDate,
      dueDate: item.dueDate as string,
      priority,
      sequence,
      sequenceFromEnd: sessionCount - sequence - 1,
    };
  });
}

function getSessionCount(item: StudyItem) {
  const baseCount = baseSessionCountByKind[item.kind][item.difficulty];
  const isSubstantialAssignment =
    item.kind === "assignment" &&
    (projectTitlePattern.test(item.title) || (item.points ?? 0) >= 100);

  return Math.min(5, baseCount + (isSubstantialAssignment ? 1 : 0));
}

function getPreparationDays(item: StudyItem) {
  const baseDays = preparationDaysByKind[item.kind][item.difficulty];
  const isProject = item.kind === "assignment" && projectTitlePattern.test(item.title);
  const projectDays =
    item.difficulty === "hard" ? 35 : item.difficulty === "medium" ? 21 : 14;
  const pointsMultiplier = (item.points ?? 0) >= 100 ? 1.5 : 1;

  return Math.round(Math.max(baseDays, isProject ? projectDays : 0) * pointsMultiplier);
}

function getStudySessionTitles(item: StudyItem, count: number) {
  if (item.kind === "assignment") {
    return Array.from({ length: count }, (_, index) =>
      createAssignmentStudySessionTitle(item.title, index + 1, count),
    );
  }

  const milestonePool = getMilestonePool(item);

  if (count === 1) {
    return [createMilestoneTitle(milestonePool.at(-1) as string, item.title)];
  }

  return Array.from({ length: count }, (_, index) => {
    const milestoneIndex = Math.round(
      (index * (milestonePool.length - 1)) / (count - 1),
    );
    return createMilestoneTitle(milestonePool[milestoneIndex], item.title);
  });
}

function getMilestonePool(item: StudyItem) {
  if (item.kind === "exam") {
    return [
      "Review key concepts",
      "Practice active recall",
      "Complete practice questions",
      "Review weak areas",
      "Final review",
    ];
  }

  if (item.kind === "quiz") {
    return ["Review quiz material", "Self-test", "Final review"];
  }

  return [];
}

function createAssignmentStudySessionTitle(
  assignmentTitle: string,
  sessionNumber: number,
  totalSessions: number,
) {
  const prefix = `Study Session ${sessionNumber}/${totalSessions}: `;
  const compactTitle =
    assignmentTitle.replace(/\s+/g, " ").trim() || "Assignment";
  const maxAssignmentTitleLength = Math.max(1, 120 - prefix.length);
  const shortenedTitle =
    compactTitle.length > maxAssignmentTitleLength
      ? `${compactTitle.slice(0, maxAssignmentTitleLength - 3).trim()}...`
      : compactTitle;

  return `${prefix}${shortenedTitle}`;
}

function createMilestoneTitle(milestone: string, itemTitle: string) {
  const compactTitle = itemTitle.replace(/\s+/g, " ").trim();
  const maxItemLength = Math.max(1, 177 - milestone.length);
  const shortenedTitle =
    compactTitle.length > maxItemLength
      ? `${compactTitle.slice(0, maxItemLength - 3).trim()}...`
      : compactTitle;

  return `${milestone}: ${shortenedTitle}`;
}

function compareCandidates(
  first: StudySessionCandidate,
  second: StudySessionCandidate,
) {
  return (
    first.dueDate.localeCompare(second.dueDate) ||
    first.sequenceFromEnd - second.sequenceFromEnd ||
    second.idealDate.localeCompare(first.idealDate) ||
    first.itemId.localeCompare(second.itemId)
  );
}

function findBestAvailableDate(
  idealDate: string,
  earliestDate: string,
  latestDate: string,
  taskCounts: Map<string, number>,
  maxTasksPerDay: number,
) {
  const earliestDay = dateOnlyToDayNumber(earliestDate);
  const latestDay = dateOnlyToDayNumber(latestDate);
  const idealDay = Math.min(
    latestDay,
    Math.max(earliestDay, dateOnlyToDayNumber(idealDate)),
  );
  const datesByPreference: string[] = [];

  for (let distance = 0; distance <= latestDay - earliestDay; distance += 1) {
    const earlierDay = idealDay - distance;
    const laterDay = idealDay + distance;

    if (earlierDay >= earliestDay) {
      datesByPreference.push(dayNumberToDateOnly(earlierDay));
    }
    if (distance > 0 && laterDay <= latestDay) {
      datesByPreference.push(dayNumberToDateOnly(laterDay));
    }
  }

  const availableDate = datesByPreference.find(
    (date) => (taskCounts.get(date) ?? 0) < maxTasksPerDay,
  );
  if (availableDate) return availableDate;

  return datesByPreference.reduce((leastBusyDate, date) => {
    const count = taskCounts.get(date) ?? 0;
    const leastBusyCount = taskCounts.get(leastBusyDate) ?? 0;
    return count < leastBusyCount ? date : leastBusyDate;
  }, datesByPreference[0] ?? latestDate);
}

function getTaskCountMap(
  counts: ReadonlyMap<string, number> | Record<string, number> | undefined,
) {
  if (!counts) return new Map<string, number>();
  if (counts instanceof Map) return new Map(counts);
  return new Map(Object.entries(counts));
}

function getDateOnly(value: Date | string) {
  if (typeof value === "string") {
    if (!isValidDateOnly(value)) throw new Error("Invalid planning date.");
    return value;
  }

  return value.toISOString().slice(0, 10);
}

function maxDate(first: string, second: string) {
  return first > second ? first : second;
}

function minDate(first: string, second: string) {
  return first < second ? first : second;
}

function addDays(value: string, days: number) {
  return dayNumberToDateOnly(dateOnlyToDayNumber(value) + days);
}

function dateOnlyToDayNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function dayNumberToDateOnly(dayNumber: number) {
  return new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
