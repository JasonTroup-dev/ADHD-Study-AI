/** Old elapsed timers are retained for review, but never counted as study time. */
export type StudyTimeRecord = {
  actual_minutes: number | null;
  time_confirmed_at?: string | null;
};

export const MAX_STUDY_MINUTES = 1440;

export function parseStudyMinutes(value: string): number | null {
  if (!value.trim()) return null;
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > MAX_STUDY_MINUTES) {
    throw new Error("Enter whole minutes between 0 and 1,440, or leave time blank.");
  }
  return minutes;
}

export function confirmedStudyMinutes(session: StudyTimeRecord): number {
  const minutes = session.actual_minutes;
  return session.time_confirmed_at && minutes !== null && Number.isInteger(minutes)
    && minutes >= 0 && minutes <= MAX_STUDY_MINUTES ? minutes : 0;
}

export function formatStudyMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}
