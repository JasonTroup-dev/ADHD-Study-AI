import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlannerWorkspace } from '@/lib/planner/types';
import { defaultPlanningPreferences } from '@/lib/planner/preferences';

const mocks = vi.hoisted(() => ({ client: vi.fn(), workspace: vi.fn(), commit: vi.fn(), generate: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.client }));
vi.mock('@/lib/planner/server', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/planner/server')>(),
  loadPlannerWorkspace: mocks.workspace, commitPlannerChange: mocks.commit,
}));
vi.mock('@/lib/ai/workBreakdown', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/ai/workBreakdown')>(), generateWorkBreakdown: mocks.generate,
}));
import { POST as importSyllabus } from '@/app/api/syllabus/import/route';
import { POST as breakdown } from '@/app/api/assignments/[id]/work-breakdown/route';

const classId = '00000000-0000-4000-8000-000000000001';
const ps3Id = '00000000-0000-4000-8000-000000000002';
const proposal = { summary: 'Solve and check.', tasks: [
  { title: 'Solve problems', checklist: ['All solutions written.'], sourceName: 'Instructions', sourceQuote: 'Solve all problems.' },
  { title: 'Check solutions', checklist: ['Every solution checked.'], sourceName: 'Instructions', sourceQuote: 'Check every solution.' },
] };
let workspace: PlannerWorkspace;

function request(body: object) {
  return new Request('http://localhost/api/planner', { method: 'POST', body: JSON.stringify({
    action: 'preview', planningDate: '2026-09-01', preferences: defaultPlanningPreferences, ...body,
  }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-01T12:00:00Z'));
  workspace = {
    version: 'v1', tasks: [], sessions: [], preferences: defaultPlanningPreferences, lastChangeId: null,
    assignments: [
      { id: 'exam', class_id: classId, title: 'Midterm 1', due_date: '2026-09-15', status: 'not_started', importance: 'high', context_version: 0,
        description: 'Covers Problem Sets 1 and 2.', deadline_evidence: { kind: 'exam' } },
      { id: ps3Id, class_id: classId, title: 'Problem Set 3', due_date: '2026-09-23', status: 'not_started', importance: 'medium', context_version: 0 },
    ],
  };
  mocks.workspace.mockImplementation(async () => workspace);
  mocks.commit.mockResolvedValue('change');
  mocks.generate.mockResolvedValue(proposal);
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: ps3Id, name: 'Physics', original_file_name: 'Instructions', extracted_text: 'Solve all problems. Check every solution.' }, error: null }),
  };
  mocks.client.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user' } }, error: null }) },
    from: vi.fn().mockReturnValue(query),
  });
});
afterEach(() => vi.useRealTimers());

describe('exam boundaries through planner endpoints', () => {
  it('uses an already saved exam when importing only the next problem set', async () => {
    const input = { classId, assignments: [{ title: 'Problem Set 3', kind: 'assignment', dueDate: '2026-09-23',
      dueDateStatus: 'explicit', difficulty: 'hard', points: 40, confidence: 1, notes: '' }] };
    const response = await importSyllabus(request(input));
    const preview = await response.json();
    expect(response.status).toBe(200);
    expect(preview.conflicts).toEqual([]);
    expect(preview.blocks).toHaveLength(4);
    expect(preview.blocks.every((b: { scheduledDate: string }) => b.scheduledDate > '2026-09-15')).toBe(true);
    const applied = await importSyllabus(request({ ...input, action: 'apply', version: 'v1' }));
    expect(applied.status).toBe(200);
    expect(mocks.commit.mock.calls[0][1].assignments[0].deadline_evidence.kind).toBe('assignment');
  });

  it('keeps concrete steps after the exam during preview and apply', async () => {
    const response = await breakdown(request({}), { params: Promise.resolve({ id: ps3Id }) });
    const preview = await response.json();
    expect(response.status).toBe(200);
    expect(preview.blocks.map((b: { scheduledDate: string }) => b.scheduledDate)).toEqual(['2026-09-16', '2026-09-17']);
    expect(preview.blocks[0].reason).toContain('Midterm 1');
    const applied = await breakdown(request({ action: 'apply', version: 'v1', proposal }), { params: Promise.resolve({ id: ps3Id }) });
    expect(applied.status).toBe(200);
    expect(mocks.commit.mock.calls[0][1].changes.every((c: { after: { scheduled_date: string } }) => c.after.scheduled_date > '2026-09-15')).toBe(true);
  });

  it('blocks applying concrete steps that cannot fit after the exam', async () => {
    workspace.assignments[1].due_date = '2026-09-16';
    const response = await breakdown(request({ action: 'apply', version: 'v1', proposal }), { params: Promise.resolve({ id: ps3Id }) });
    expect(response.status).toBe(409);
    expect(mocks.commit).not.toHaveBeenCalled();
  });
});
