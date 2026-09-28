import { WeeklyPlanner } from '../../../../components/StudyPlanner/WeeklyPlanner';
import { weeklyPlannerFixture } from '../../../weeklyPlannerFixtures';
export default function PlannerPreview() { return <WeeklyPlanner initialDate={new Date(2026, 9, 13)} initialData={weeklyPlannerFixture} readOnly />; }
