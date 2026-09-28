import { z } from "zod";
import { dateOnlySchema } from "@/lib/planner/preferences";

export const createCalendarTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    date: dateOnlySchema,
    classId: z.string().uuid().nullable(),
    estimatedMinutes: z.number().int().min(1).max(1440).nullable(),
  })
  .strict();

export const rescheduleCalendarTaskSchema = z
  .object({
    id: z.string().uuid(),
    date: dateOnlySchema,
    previousDate: dateOnlySchema,
  })
  .strict();
