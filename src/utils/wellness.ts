import { getWeekDatesFromMonday, toISODateString } from './dates';
import { loadNamespacedData, saveNamespacedData } from './digitalOceanStorage';

export type ActivityType = 'meditation' | 'kneeWorkout' | 'strengthTraining' | 'handWorkout';

export const ACTIVITY_TYPES: ActivityType[] = ['meditation', 'kneeWorkout', 'strengthTraining', 'handWorkout'];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  meditation: 'Meditation',
  kneeWorkout: 'Knee workout',
  strengthTraining: 'Strength training',
  handWorkout: 'Hand workout',
};

export type WellnessWeights = Record<ActivityType, number>;

export const DEFAULT_WELLNESS_WEIGHTS: WellnessWeights = {
  meditation: 4,
  kneeWorkout: 3,
  strengthTraining: 3,
  handWorkout: 3,
};

// Every day gets at least 1 task, so the cap can never go below 7 (1/day * 7 days);
// it can never exceed 14 (2/day * 7 days) since no day gets more than 2 tasks.
export const MIN_WEEK_TASK_CAP = 7;
export const MAX_WEEK_TASK_CAP = 14;
export const DEFAULT_WEEK_TASK_CAP = 10;

const clampCap = (cap: number): number =>
  Math.min(MAX_WEEK_TASK_CAP, Math.max(MIN_WEEK_TASK_CAP, Math.round(cap)));

export interface WellnessSettings {
  weights: WellnessWeights;
  cap: number;
}

export interface WeeklyWellnessPlan {
  weekStart: string; // ISO date of the Monday this plan covers
  weights: WellnessWeights; // weights used to generate this plan
  cap: number; // weekly task cap used to generate this plan
  assignments: Record<string, ActivityType[]>; // ISO date -> activities for that day
  savedDays: Record<string, boolean>; // ISO date -> whether tasks were pushed to Todoist
}

const settingsNamespace = (routeName: string) => `${routeName.toLowerCase()}-wellness-settings`;
const planNamespace = (routeName: string) => `${routeName.toLowerCase()}-wellness-plan`;
const SETTINGS_KEY = 'default';

export const loadWellnessSettings = async (routeName: string): Promise<WellnessSettings> => {
  const loaded = await loadNamespacedData<WellnessSettings>(settingsNamespace(routeName), SETTINGS_KEY);
  return loaded?.weights
    ? { weights: loaded.weights, cap: clampCap(loaded.cap ?? DEFAULT_WEEK_TASK_CAP) }
    : { weights: { ...DEFAULT_WELLNESS_WEIGHTS }, cap: DEFAULT_WEEK_TASK_CAP };
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

// Picks one activity, weighted by the given weights, from the given candidate pool
const pickWeightedActivity = (weights: WellnessWeights, candidates: ActivityType[]): ActivityType => {
  const entries = candidates.map(type => [type, Math.max(weights[type] ?? 0, 0)] as [ActivityType, number]);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);

  if (totalWeight <= 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  let r = Math.random() * totalWeight;
  for (const [type, weight] of entries) {
    r -= weight;
    if (r <= 0) return type;
  }
  return entries[entries.length - 1][0];
};

// Picks `count` distinct activities (no repeats within the same day) for a single day
const pickDayActivities = (weights: WellnessWeights, count: number): ActivityType[] => {
  const remaining = [...ACTIVITY_TYPES];
  const picks: ActivityType[] = [];

  for (let n = 0; n < count && remaining.length > 0; n++) {
    const activity = pickWeightedActivity(weights, remaining);
    picks.push(activity);
    remaining.splice(remaining.indexOf(activity), 1);
  }

  return picks;
};

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

export const generateWeeklyPlan = (weights: WellnessWeights, cap: number, monday: Date): WeeklyWellnessPlan => {
  const clampedCap = clampCap(cap);
  const days = getWeekDatesFromMonday(monday);
  const counts = pickDailyCounts(clampedCap);
  const assignments: Record<string, ActivityType[]> = {};

  days.forEach((date, i) => {
    const key = toISODateString(date);
    assignments[key] = pickDayActivities(weights, counts[i]);
  });

  return {
    weekStart: toISODateString(monday),
    weights,
    cap: clampedCap,
    assignments,
    savedDays: {},
  };
};
