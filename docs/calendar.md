# Calendar

The calendar has a month overview and a dated agenda. Auto view uses the agenda below 640px. Selecting a day or its overflow button opens a keyboard-accessible side panel with full titles, study-session links, task creation, and rescheduling. Month cells show up to two items; classes, item types, and completion can be filtered together.

Workload summaries count unfinished study tasks. They add only saved estimates, identify tasks with no estimate, and exclude assignment deadlines from study time. Overdue assignments and missed sessions remain available even outside the viewed month. Catch-up planning reuses the existing preview/apply/undo flow.

The viewed month, selected day, and filters are kept in session storage. Live and demo preferences have separate keys. The demo remains read-only and uses its sample date for Today.

## Database rollout

Apply `supabase/migrations/20260909201644_calendar_task_estimates.sql` before deploying this calendar. An older migration removed `study_plan_tasks.estimated_minutes`; this migration restores it as an optional integer from 1 to 1440. Existing tasks receive NULL, not an invented estimate. Existing owner RLS policies remain in force. The catch-up feature also requires the existing adaptive-planning migration.

Calendar task writes use `/api/calendar/tasks`. The server authenticates the user, validates dates and estimates, and checks class ownership. Rescheduling compares the original date, excludes completed tasks, and sets `user_edited` so automatic replanning respects the manual move. A stale form can refresh the calendar rather than overwrite a newer schedule. Assignment deadlines are never moved by task rescheduling.

## Verification

```sh
npx vitest run tests/calendar.test.ts tests/calendar-task-route.test.ts tests/calendar-database.test.ts
npx playwright test --config playwright.calendar.config.ts
```

The database tests execute the historical baseline, estimate-removal migration, and new migration in PGlite, including authenticated RLS checks. Browser tests use an isolated Next.js fixture on port 3101, synthetic authentication, and intercepted network responses. They cover mobile overflow, accessibility, filters, state restoration, creation, rescheduling, session start, error recovery, and catch-up integration without writing live user data.
