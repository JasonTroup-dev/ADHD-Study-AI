import { confirmedStudyMinutes, type StudyTimeRecord } from "./studyTime";

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function progressDateRange(count: number, now = new Date()) {
  const dates = Array.from({ length: count }, (_, index) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - count + 1 + index));
  return {
    keys: dates.map(localDateKey),
    start: dates[0].toISOString(),
    // Calendar arithmetic handles daylight-saving transitions.
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
  };
}

export function studyActivityByDay(keys: string[], sessions: (StudyTimeRecord & { ended_at: string | null })[]) {
  return keys.map((key) => {
    const entries = sessions.filter((session) => session.ended_at && localDateKey(new Date(session.ended_at)) === key);
    return { key, sessions: entries.length, minutes: entries.reduce((sum, session) => sum + confirmedStudyMinutes(session), 0) };
  });
}
