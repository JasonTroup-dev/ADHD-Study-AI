import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const preferences = {maxTasksPerDay:3,weekdayCapacity:[3,3,3,3,3,3,3],unavailableDates:[]};
const assignmentId = '00000000-0000-4000-8000-000000000003';
const changeId = '00000000-0000-4000-8000-000000000007';
const due = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
const today = new Date().toISOString().slice(0,10);
const preview = {version:'v1',preferences,existingCounts:{[today]:1},conflicts:[],blocks:[{id:'1',title:'Essay: Compare two sources',scheduledDate:today,previousDate:'2026-01-01',reason:'Recovery block before the deadline.',checklist:['Three claims are written.']}]};
async function mockPlanner(page: Page) {
  await page.route('**/api/planner',async route => {
    const body = route.request().method() === 'GET' ? null : route.request().postDataJSON();
    await route.fulfill({json: !body ? {preferences,lastChangeId:null} : body.action === 'preview' ? preview : {changeId,updatedTaskCount:1}});
  });
}
test('syllabus review requires a preview and invalidates it after changes',async ({page}) => {
  await mockPlanner(page);
  await page.route('**/api/syllabus/analyze',route => route.fulfill({json:{course:{name:'History',classCode:'HIST 1',instructor:'Teacher',confidence:1},classMatch:null,assignments:[{title:'Essay',kind:'assignment',dueDate:due,dueDateStatus:'explicit',points:10,difficulty:'easy',confidence:1,notes:'',sourceQuote:`Essay due ${due}`,dueDateOrigin:'source'}]}}));
  let applied = false;
  await page.route('**/api/syllabus/import',route => {
    const body = route.request().postDataJSON();
    if (body.action === 'apply') { applied = true; expect(body.version).toBe('v1'); }
    return route.fulfill({json:body.action === 'preview' ? preview : {assignmentCount:1,studySessionCount:1,classId:assignmentId,className:'History',classCreated:true}});
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Generate Study Plan'}).click();
  await page.locator('#study-plan-source-file').setInputFiles({name:'syllabus.pdf',mimeType:'application/pdf',buffer:Buffer.from('Test syllabus')});
  await page.getByRole('button',{name:'Analyze syllabus'}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Create detected class'}).click();
  await expect(dialog.getByRole('button',{name:'Create study plan',exact:true})).toBeDisabled();
  await dialog.getByText('View deadline evidence').click();
  await expect(dialog.getByText(`Essay due ${due}`,{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Preview schedule',exact:true}).click();
  await dialog.getByRole('checkbox').check();
  await expect(dialog.getByRole('button',{name:'Create study plan',exact:true})).toBeEnabled();
  await dialog.getByLabel('Monday',{exact:true}).selectOption('0');
  await expect(dialog.getByRole('button',{name:'Create study plan',exact:true})).toBeDisabled();
  await dialog.getByRole('button',{name:'Preview schedule',exact:true}).click();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'Create study plan',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Study plan created');
  expect(applied).toBe(true);
});
test('catch-up previews conflicts, applies and supports undo',async ({page}) => {
  let action = '';
  await page.route('**/api/planner',async route => {
    const body = route.request().method() === 'GET' ? null : route.request().postDataJSON();
    action = body?.action ?? '';
    await route.fulfill({json: !body ? {preferences,lastChangeId:null} : body.action === 'preview' ? {...preview,preferences:body.preferences,conflicts:body.preferences.maxTasksPerDay === 1 ? [{title:'Essay',reason:'No available block.'}] : []} : {changeId,updatedTaskCount:1}});
  });
  await page.goto('/'); await page.getByRole('button',{name:'Help me catch up'}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Maximum study blocks per day').selectOption('1');
  await dialog.getByRole('button',{name:'Preview catch-up plan'}).click();
  await expect(dialog.getByRole('alert')).toContainText('1 blocks need attention');
  await expect(dialog.getByRole('button',{name:'Apply this plan'})).toBeDisabled();
  await dialog.getByLabel('Maximum study blocks per day').selectOption('3');
  await dialog.getByRole('button',{name:'Preview catch-up plan'}).click();
  await dialog.getByRole('button',{name:'Apply this plan'}).click();
  await expect(dialog.getByRole('status')).toContainText('1 tasks rescheduled');
  await dialog.getByRole('button',{name:'Undo last plan change'}).click();
  await expect(dialog.getByRole('status')).toContainText('restored'); expect(action).toBe('undo');
});
test('concrete steps show split/merge scope, evidence and completion criteria before applying',async ({page}) => {
  await mockPlanner(page);
  let applied = false;
  await page.route('**/api/assignments/*/work-breakdown',route => {
    const body = route.request().postDataJSON(); applied = body.action === 'apply';
    return route.fulfill({json:applied ? {changeId,updatedTaskCount:1} : {...preview,previousTaskCount:3,proposal:{summary:'Combine the source work into one step.',tasks:[{title:preview.blocks[0].title,checklist:['Three claims are written.'],sourceName:'Rubric',sourceQuote:'Compare two sources.'}]}}});
  });
  await page.goto('/'); await page.getByRole('button',{name:'Plan concrete steps'}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Preview concrete steps'}).click();
  await expect(dialog.getByText('Replace 3 unfinished tasks with 1 concrete steps.')).toBeVisible();
  await dialog.getByText('Check the source evidence').click();
  await expect(dialog.locator('blockquote')).toContainText('Compare two sources.');
  await expect(dialog.getByText('Three claims are written.',{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Apply task breakdown'}).click();
  await expect(dialog.getByRole('status')).toContainText('completion checklists'); expect(applied).toBe(true);
});
test('mobile availability and preview remain usable and accessible',async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await mockPlanner(page);
  await page.goto('/'); await page.getByRole('button',{name:'Help me catch up'}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Preview catch-up plan'}).click();
  await expect(dialog.getByText('Essay: Compare two sources',{exact:true})).toBeVisible();
  const overflow = await dialog.evaluate(el => el.scrollWidth > el.clientWidth + 1);
  expect(overflow).toBe(false);
  const results = await new AxeBuilder({page}).include('[role="dialog"]').withTags(['wcag2a','wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({path:'test-results/planning-mobile.png',fullPage:true});
});
