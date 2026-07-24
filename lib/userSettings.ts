export const FOCUS_MINUTE_OPTIONS = [15, 25, 45, 60] as const;

export type FocusMinutes = (typeof FOCUS_MINUTE_OPTIONS)[number];

export type StudyPreferences = {
  focusMinutes: FocusMinutes;
  breakReminders: boolean;
};

export const DEFAULT_STUDY_PREFERENCES: StudyPreferences = {
  focusMinutes: 25,
  breakReminders: true,
};

type UserMetadata = Record<string, unknown> | null | undefined;

export function getDisplayName(metadata: UserMetadata) {
  const value = metadata?.full_name ?? metadata?.name;
  return typeof value === "string" ? value : "";
}

export function getStudyPreferences(
  metadata: UserMetadata,
): StudyPreferences {
  const rawPreferences = metadata?.study_preferences;

  if (
    typeof rawPreferences !== "object" ||
    rawPreferences === null
  ) {
    return DEFAULT_STUDY_PREFERENCES;
  }

  const preferences = rawPreferences as Record<string, unknown>;
  const focusMinutes = FOCUS_MINUTE_OPTIONS.includes(
    preferences.focus_minutes as FocusMinutes,
  )
    ? (preferences.focus_minutes as FocusMinutes)
    : DEFAULT_STUDY_PREFERENCES.focusMinutes;

  return {
    focusMinutes,
    breakReminders:
      typeof preferences.break_reminders === "boolean"
        ? preferences.break_reminders
        : DEFAULT_STUDY_PREFERENCES.breakReminders,
  };
}

export function toStudyPreferencesMetadata(
  preferences: StudyPreferences,
) {
  return {
    focus_minutes: preferences.focusMinutes,
    break_reminders: preferences.breakReminders,
  };
}
