import { getWeekDatesFromMonday, toISODateString } from './dates';
import { loadNamespacedData, saveNamespacedData } from './digitalOceanStorage';

// A single wellness task: fully user-editable text and weight, deletable, addable.
export interface WellnessTask {
  id: string;
  text: string;
  weight: number;
}

export const DEFAULT_WELLNESS_TASKS: WellnessTask[] = [
  { id: 'meditation', text: 'Meditation', weight: 4 },
  { id: 'kneeWorkout', text: 'Knee workout', weight: 3 },
  { id: 'strengthTraining', text: 'Strength training', weight: 3 },
  { id: 'handWorkout', text: 'Hand workout', weight: 3 },
];

export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 10;
// Small weights are for rare recurrences: 0.5 ~ roughly every other week, 0.25 ~ roughly monthly
export const WEIGHT_STEP = 0.25;

export const makeTaskId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Every day gets at least 1 task, so the cap can never go below 7 (1/day * 7 days);
// it can never exceed 14 (2/day * 7 days) since no day gets more than 2 tasks.
export const MIN_WEEK_TASK_CAP = 7;
export const MAX_WEEK_TASK_CAP = 14;
export const DEFAULT_WEEK_TASK_CAP = 10;

const clampCap = (cap: number): number =>
  Math.min(MAX_WEEK_TASK_CAP, Math.max(MIN_WEEK_TASK_CAP, Math.round(cap)));

export interface WellnessSettings {
  tasks: WellnessTask[];
  cap: number;
}

export interface WeeklyWellnessPlan {
  weekStart: string; // ISO date of the Monday this plan covers
  tasks: WellnessTask[]; // tasks used to generate this plan
  cap: number; // weekly task cap used to generate this plan
  assignments: Record<string, string[]>; // ISO date -> task text for that day
  savedDays: Record<string, boolean>; // ISO date -> whether tasks were pushed to Todoist
}

const settingsNamespace = (routeName: string) => `${routeName.toLowerCase()}-wellness-settings`;
const planNamespace = (routeName: string) => `${routeName.toLowerCase()}-wellness-plan`;
const SETTINGS_KEY = 'default';

// Shape used before tasks were unified into one flat, fully-editable list
interface LegacyWellnessSettings {
  weights?: Record<string, number>;
  cap?: number;
  customTasks?: WellnessTask[];
}

const LEGACY_ACTIVITY_LABELS: Record<string, string> = {
  meditation: 'Meditation',
  kneeWorkout: 'Knee workout',
  strengthTraining: 'Strength training',
  handWorkout: 'Hand workout',
};

const migrateLegacySettings = (legacy: LegacyWellnessSettings): WellnessSettings => {
  const tasks: WellnessTask[] = Object.keys(LEGACY_ACTIVITY_LABELS).map(id => ({
    id,
    text: LEGACY_ACTIVITY_LABELS[id],
    weight: legacy.weights?.[id] ?? DEFAULT_WELLNESS_TASKS.find(t => t.id === id)?.weight ?? 0,
  }));
  (legacy.customTasks ?? []).forEach(task => tasks.push({ ...task }));
  return { tasks, cap: clampCap(legacy.cap ?? DEFAULT_WEEK_TASK_CAP) };
};

export const loadWellnessSettings = async (routeName: string): Promise<WellnessSettings> => {
  const loaded = await loadNamespacedData<WellnessSettings & LegacyWellnessSettings>(
    settingsNamespace(routeName),
    SETTINGS_KEY
  );

  if (!loaded) {
    return { tasks: DEFAULT_WELLNESS_TASKS.map(t => ({ ...t })), cap: DEFAULT_WEEK_TASK_CAP };
  }
  if (loaded.tasks) {
    return { tasks: loaded.tasks, cap: clampCap(loaded.cap ?? DEFAULT_WEEK_TASK_CAP) };
  }
  if (loaded.weights) {
    return migrateLegacySettings(loaded);
  }
  return { tasks: DEFAULT_WELLNESS_TASKS.map(t => ({ ...t })), cap: DEFAULT_WEEK_TASK_CAP };
};

export const saveWellnessSettings = async (routeName: string, settings: WellnessSettings): Promise<boolean> => {
  return saveNamespacedData(settingsNamespace(routeName), SETTINGS_KEY, settings);
};

export const loadWeeklyPlan = async (routeName: string, weekStart: string): Promise<WeeklyWellnessPlan | null> => {
  return loadNamespacedData<WeeklyWellnessPlan>(planNamespace(routeName), weekStart);
};

export const saveWeeklyPlan = async (routeName: string, plan: WeeklyWellnessPlan): Promise<boolean> => {
  return saveNamespacedData(planNamespace(routeName), plan.weekStart, plan);
};

export interface WeightedCandidate {
  text: string;
  weight: number;
}

// Builds the weighted pool of pickable task texts from the current task list
export const buildWellnessPool = (tasks: WellnessTask[]): WeightedCandidate[] =>
  tasks
    .filter(task => task.text.trim().length > 0)
    .map(task => ({ text: task.text.trim(), weight: Math.max(task.weight ?? 0, 0) }));

// Picks one candidate's text, weighted by its weight; null if the pool is empty or all-zero weight
const pickWeightedCandidate = (candidates: WeightedCandidate[]): string | null => {
  const totalWeight = candidates.reduce((sum, c) => sum + Math.max(c.weight, 0), 0);
  if (candidates.length === 0 || totalWeight <= 0) return null;

  let r = Math.random() * totalWeight;
  for (const candidate of candidates) {
    r -= Math.max(candidate.weight, 0);
    if (r <= 0) return candidate.text;
  }
  return candidates[candidates.length - 1].text;
};

// Picks up to `count` distinct task texts (no repeats) from the given pool
export const pickTasksFromPool = (pool: WeightedCandidate[], count: number): string[] => {
  const remaining = pool.filter(c => c.weight > 0);
  const picks: string[] = [];

  for (let n = 0; n < count && remaining.length > 0; n++) {
    const pickedText = pickWeightedCandidate(remaining);
    if (!pickedText) break;
    picks.push(pickedText);
    const index = remaining.findIndex(c => c.text === pickedText);
    if (index !== -1) remaining.splice(index, 1);
  }

  return picks;
};

// A single ad-hoc day gets 1 or 2 tasks, unrelated to any weekly cap
export const pickSingleDayTaskCount = (): number => (Math.random() < 0.5 ? 1 : 2);

// Decides how many tasks (1 or 2) each of the 7 days gets, capped at the given weekly total
const pickDailyCounts = (cap: number): number[] => {
  const clampedCap = clampCap(cap);
  const counts = Array(7).fill(1);
  let total = 7;

  const order = [0, 1, 2, 3, 4, 5, 6];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  for (const dayIndex of order) {
    if (total >= clampedCap) break;
    if (Math.random() < 0.5) {
      counts[dayIndex] = 2;
      total += 1;
    }
  }

  return counts;
};

export const generateWeeklyPlan = (tasks: WellnessTask[], cap: number, monday: Date): WeeklyWellnessPlan => {
  const clampedCap = clampCap(cap);
  const days = getWeekDatesFromMonday(monday);
  const counts = pickDailyCounts(clampedCap);
  const pool = buildWellnessPool(tasks);
  const assignments: Record<string, string[]> = {};

  days.forEach((date, i) => {
    const key = toISODateString(date);
    assignments[key] = pickTasksFromPool(pool, counts[i]);
  });

  return {
    weekStart: toISODateString(monday),
    tasks,
    cap: clampedCap,
    assignments,
    savedDays: {},
  };
};
