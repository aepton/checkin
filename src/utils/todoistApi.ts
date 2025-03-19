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
}

/**
 * Create a new task in Todoist
 */
export const createTask = async (
  config: TodoistConfig,
  task: TodoistTask
): Promise<boolean> => {
  try {
    const response = await fetch('https://api.todoist.com/rest/v2/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: task.content,
        description: task.description || '',
        project_id: task.projectId,
        due_datetime: task.dueDate,
        assignee_id: task.assignee || null
      }),
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