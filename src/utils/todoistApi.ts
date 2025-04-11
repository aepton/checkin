// Todoist API service
interface TodoistConfig {
  apiToken: string;
}

export interface TodoistTask {
  assignee?: string;
  label: string;
  content: string;
  description?: string;
  projectId?: string;
  dueDate?: string;
  priority?: number; // 1-4 (4 is highest)
  labels?: string[];

  // Convenience attributes for creating GCal events out of these tasks
  calendar: boolean;
  taskDate: Date;
  stateStartTime: string;
  stateEndTime: string;
}

const TODOIST_FUNCTION_URL = 'https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-db6c84e6-3d28-416d-9c58-b01c0e7fa4c6/default/todoist';


/**
 * Create a new task in Todoist
 */
export const createTask = async (
  config: TodoistConfig,
  task: TodoistTask
): Promise<boolean> => {
  if (!task.dueDate || !task.projectId) {
    return false;
  }
  try {
    const response = await fetch(`${TODOIST_FUNCTION_URL}?content=${encodeURIComponent(task.content)}&dueDate=${encodeURIComponent(task.dueDate)}&description=${encodeURIComponent(task.description || '')}&projectId=${encodeURIComponent(task.projectId)}&assignee=${encodeURIComponent(task.assignee || '')}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error creating Todoist task:', error);
    return false;
  }
};

/**
 * Create multiple tasks in Todoist
 */
export const createTasks = async (
  config: TodoistConfig,
  tasks: TodoistTask[]
): Promise<{ success: boolean; totalSuccess: number; totalFailed: number }> => {
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const task of tasks) {
    try {
      const success = await createTask(config, task);
      if (success) {
        totalSuccess++;
      } else {
        totalFailed++;
      }
    } catch (error) {
      console.error('Error creating task:', error);
      totalFailed++;
    }
  }

  return {
    success: totalFailed === 0,
    totalSuccess,
    totalFailed,
  };
};