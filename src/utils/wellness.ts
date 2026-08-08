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

const WEEK_TASK_CAP = 10;

export interface WellnessSettings {
  weights: WellnessWeights;
}

export interface WeeklyWellnessPlan {
  weekStart: string; // ISO date of the Monday this plan covers
  weights: WellnessWeights; // weights used to generate this plan
  assignments: Record<string, ActivityType[]>; // ISO date -> activities for that day
  savedDays: Record<string, boolean>; // ISO date -> whether tasks were pushed to Todoist
}

const settingsNamespace = (routeName: string) => `${routeName.toLowerCase()}-wellness-settings`;
const planNamespace = (routeName: string) => `${routeName.toLowerCase()}-wellness-plan`;
const SETTINGS_KEY = 'default';

export const loadWellnessSettings = async (routeName: string): Promise<WellnessSettings> => {
  const loaded = await loadNamespacedData<WellnessSettings>(settingsNamespace(routeName), SETTINGS_KEY);
  return loaded?.weights ? loaded : { weights: { ...DEFAULT_WELLNESS_WEIGHTS } };
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

// Picks one activity, weighted by the given weights
const pickWeightedActivity = (weights: WellnessWeights): ActivityType => {
  const entries = ACTIVITY_TYPES.map(type => [type, Math.max(weights[type] ?? 0, 0)] as [ActivityType, number]);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);

  if (totalWeight <= 0) {
    return ACTIVITY_TYPES[Math.floor(Math.random() * ACTIVITY_TYPES.length)];
  }

  let r = Math.random() * totalWeight;
  for (const [type, weight] of entries) {
    r -= weight;
    if (r <= 0) return type;
  }
  return entries[entries.length - 1][0];
};

// Decides how many tasks (1 or 2) each of the 7 days gets, capped at WEEK_TASK_CAP total
const pickDailyCounts = (): number[] => {
  const counts = Array(7).fill(1);
  let total = 7;

  const order = ACTIVITY_TYPES.length ? [0, 1, 2, 3, 4, 5, 6] : [];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  for (const dayIndex of order) {
    if (total >= WEEK_TASK_CAP) break;
    if (Math.random() < 0.5) {
      counts[dayIndex] = 2;
      total += 1;
    }
  }

  return counts;
};

export const generateWeeklyPlan = (weights: WellnessWeights, monday: Date): WeeklyWellnessPlan => {
  const days = getWeekDatesFromMonday(monday);
  const counts = pickDailyCounts();
  const assignments: Record<string, ActivityType[]> = {};

  days.forEach((date, i) => {
    const key = toISODateString(date);
    const activities: ActivityType[] = [];
    for (let n = 0; n < counts[i]; n++) {
      activities.push(pickWeightedActivity(weights));
    }
    assignments[key] = activities;
  });

  return {
    weekStart: toISODateString(monday),
    weights,
    assignments,
    savedDays: {},
  };
};
