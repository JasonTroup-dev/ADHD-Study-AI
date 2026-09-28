# Adaptive planning

The planner now uses saved weekday capacities and specific days off, checks all existing class workload, and requires a schedule preview before syllabus import. Conflicts block saving rather than exceeding capacity. Import is transactional.

Numbered problem sets and homework respect same-class exam boundaries during import, catch-up, and concrete task planning. Explicit numbered exam coverage takes precedence; otherwise an exam between earlier and later numbered coursework marks a course-phase boundary. Later work starts the day after the exam, leaving the exam day clear for that course's later work. Projects and unrelated classes can still overlap. All requested sessions are retained; insufficient post-exam availability produces a conflict with the exam named in the explanation. Pinned, edited, started, and completed tasks retain their existing protections. Use catch-up preview to repair previously generated schedules.

The `planner_course_sequence` migration includes assignment descriptions and saved item kinds in the versioned planner snapshot. New syllabus imports preserve exam coverage in notes and item kind in deadline metadata; older imports fall back to exam titles and course chronology.

`Help me catch up` previews movement of unfinished generated tasks across classes, preserves future dates when possible, and keeps completed, started, pinned, edited, and legacy-session work fixed. Missed deadlines remain unchanged and recovery blocks are labeled. Users can undo the latest catch-up or task restructuring; undo fails safely if affected work changed or started.

`Plan concrete steps`, available on assignment and task pages, uses uploaded instructions to propose 1–12 tasks, allowing splits and merges. Each task includes verified source quotations and completion criteria. Students review the changed task count, schedule, and evidence before applying. No model change is required.

Syllabus date verification now checks the assignment's own passage and rejects a conflicting printed year. Source passages and student date corrections are displayed during review and retained with imported assignments.

## Deployment

Apply `supabase/migrations/20260908213451_adaptive_planning.sql` before deploying the application changes. It adds pinned/checklist/evidence fields, per-user availability and undo records, and invoker-rights RPCs protected by RLS. No hosted migration is applied by these code changes.

Also apply `supabase/migrations/20260909234247_planner_course_sequence.sql` to make saved exam coverage and item kinds available to scheduling. It preserves the workspace function's invoker rights, owner filters, and grants, and includes coverage changes in the preview version check.

## Verification

- `npm test` covers scheduling, source evidence, grounded output validation, and Postgres transaction/RLS/undo behavior. Embedded Postgres tests do not require Docker or hosted credentials.
- `npm run test:planning-ui` starts an isolated fixture app using the real product components with mocked HTTP responses. It checks import review, preview invalidation, conflicts, apply/undo, task restructuring, mobile overflow, and WCAG A/AA accessibility.
- `npm run typecheck` and `npm run lint` validate integration.

The UI tests do not call the live model or a hosted database. Review model quality on representative coursework before release. `planner_changes` records applied changes and undos; task status and study-session links can be joined to those records to measure follow-through without storing additional student content in analytics.
