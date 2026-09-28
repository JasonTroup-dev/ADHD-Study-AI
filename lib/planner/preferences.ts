import { z } from "zod";

export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}, "Choose a valid date.");

export const planningPreferencesSchema = z.object({
  maxTasksPerDay: z.number().int().min(1).max(5).default(3),
  // Sunday first. Zero means unavailable; a lower number makes a lighter day.
  weekdayCapacity: z.array(z.number().int().min(0).max(5)).length(7).default([3, 3, 3, 3, 3, 3, 3]),
  unavailableDates: z.array(dateOnlySchema).max(366).default([]),
  dateMinutes: z.record(dateOnlySchema, z.number().int().min(0).max(1440))
    .refine(value => Object.keys(value).length <= 366, "Choose up to 366 daily time limits.").optional(),
});
export type PlanningPreferences = z.infer<typeof planningPreferencesSchema>;
export const defaultPlanningPreferences = planningPreferencesSchema.parse({});

export function capacityOnDate(date: string, preferences: PlanningPreferences) {
  if (preferences.unavailableDates.includes(date) || preferences.dateMinutes?.[date] === 0) return 0;
  return Math.min(preferences.maxTasksPerDay, preferences.weekdayCapacity[new Date(`${date}T00:00:00Z`).getUTCDay()]);
}

export function addPlanningDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
