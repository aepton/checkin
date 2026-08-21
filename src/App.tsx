import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './App.css';
import Grid from './components/Grid';
import WellnessModal from './components/WellnessModal';
import { getMondayWithOffset, toISODateString } from './utils/dates';
import { AppState, loadState, saveState } from './utils/digitalOceanStorage';
import { createTasks, TodoistTask } from './utils/todoistApi';
import { todoistConfig } from './config';
import {
  DEFAULT_WEEK_TASK_CAP,
  DEFAULT_WELLNESS_TASKS,
  WeeklyWellnessPlan,
  WellnessTask,
  buildWellnessPool,
  generateWeeklyPlan,
  loadWeeklyPlan,
  loadWellnessSettings,
  pickSingleDayTaskCount,
  pickTasksFromPool,
  saveWeeklyPlan,
  saveWellnessSettings,
} from './utils/wellness';

function App() {
  // Get the route parameter from the URL
  const { routeName } = useParams<{ routeName: string }>();
  const isSaveable = routeName?.toLowerCase() === 'berrypatch';
  
  // Define the states for the tiles (letters that will cycle through)
  const tileStates = [
    { label: ' ', color: '#f0f0f0' },
    { label: 'A', color: '#9AD7A4', calendar: false, todoistId: '35630104' },
    { label: 'L', color: '#FDAEA9', calendar: false, todoistId: '35677852' },
    { label: 'B', color: '#F0CA86' }
  ];
  const abrahamTodoistId = tileStates.find(state => state.label === 'A')?.todoistId;
  
  // State for the app
  const [appState, setAppState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [configValid, setConfigValid] = useState<boolean>(false);
  const [todoistConfigValid, setTodoistConfigValid] = useState<boolean>(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [syncToTodoistEnabled, setSyncToTodoistEnabled] = useState<boolean>(true);

  // Wellness (meditation/workout) task randomizer state
  const [wellnessTasks, setWellnessTasks] = useState<WellnessTask[]>(DEFAULT_WELLNESS_TASKS);
  const [wellnessCap, setWellnessCap] = useState<number>(DEFAULT_WEEK_TASK_CAP);
  const [wellnessPlan, setWellnessPlan] = useState<WeeklyWellnessPlan | null>(null);
  const [showWellnessModal, setShowWellnessModal] = useState<boolean>(false);
  const [wellnessStatus, setWellnessStatus] = useState<string>('');
  const wellnessPlanRef = useRef<WeeklyWellnessPlan | null>(null);

  // Used for status messages in console and UI updates, but not directly rendered
  const setSaveStatus = (status: string) => {
    console.log('Save status:', status);
  };

  // Ref to store the latest state without triggering re-renders
  const appStateRef = useRef<AppState | null>(null);

  // Load initial state from Digital Ocean Spaces and list available routes
  useEffect(() => {
    const fetchState = async () => {
      setIsLoading(true);
      
      try {
        // Load state for the current route
        const loadedState = await loadState(
          getMondayWithOffset(weekOffset),
          routeName
        );
        
        setAppState(loadedState);
        // Also update ref
        appStateRef.current = loadedState;
        
        if (loadedState) {
          setSaveStatus(`State for "${routeName}" loaded successfully`);
        } else {
          setSaveStatus(`No saved state found for "${routeName}", using defaults`);
        }
      } catch (error) {
        console.error('Error loading state:', error);
        setSaveStatus('Error loading state');
      }
      
      setIsLoading(false);
    };

    fetchState();
  }, [configValid, routeName, weekOffset]);

  // Load wellness settings and the plan for the currently selected week (matching the grid's
  // weekOffset), generating one if it doesn't exist yet
  useEffect(() => {
    if (!routeName) return;

    const fetchWellness = async () => {
      try {
        const settings = await loadWellnessSettings(routeName);
        setWellnessTasks(settings.tasks);
        setWellnessCap(settings.cap);

        const monday = getMondayWithOffset(weekOffset);
        const weekStart = toISODateString(monday);
        let plan = await loadWeeklyPlan(routeName, weekStart);

        if (!plan) {
          plan = generateWeeklyPlan(settings.tasks, settings.cap, monday);
          await saveWeeklyPlan(routeName, plan);
        }

        setWellnessPlan(plan);
        wellnessPlanRef.current = plan;
      } catch (error) {
        console.error('Error loading wellness data:', error);
      }
    };

    fetchWellness();
  }, [routeName, weekOffset]);

  // Persist the wellness tasks/cap as the default settings for future weeks
  const handleSaveDefaultWellness = async (newTasks: WellnessTask[], newCap: number) => {
    if (!routeName) return;
    setShowWellnessModal(false);

    try {
      await saveWellnessSettings(routeName, { tasks: newTasks, cap: newCap });
      setWellnessTasks(newTasks);
      setWellnessCap(newCap);
      setWellnessStatus('Wellness tasks saved as default');
    } catch (error) {
      console.error('Error saving wellness defaults:', error);
      setWellnessStatus('Error saving wellness defaults');
    }
  };

  // Generate one ad-hoc day's worth of wellness tasks from whatever is currently in the modal
  // (even if unsaved) and push them straight to Todoist for today
  const handleGenerateOneDay = async (tasks: WellnessTask[], _cap: number) => {
    setShowWellnessModal(false);
    setWellnessStatus('Generating a day\'s wellness tasks...');

    try {
      const pool = buildWellnessPool(tasks);
      const count = pickSingleDayTaskCount();
      const taskTexts = pickTasksFromPool(pool, count);

      if (taskTexts.length === 0) {
        setWellnessStatus('No wellness tasks to generate (all weights are 0)');
        return;
      }

      const todayKey = toISODateString(new Date());
      const todoistTasks: TodoistTask[] = taskTexts.map(text => ({
        label: text,
        content: text,
        assignee: abrahamTodoistId,
        dueDate: todayKey,
        projectId: todoistConfig.projectId || '6Q8CWgXvPmfx47Vg',
        calendar: false,
        taskDate: new Date(),
        stateStartTime: '',
        stateEndTime: '',
      }));

      const result = await createTasks(todoistConfig, todoistTasks);

      if (result.success) {
        setWellnessStatus(`Generated ${result.totalSuccess} wellness task(s) for today`);
      } else {
        setWellnessStatus(`Generated ${result.totalSuccess} task(s), ${result.totalFailed} failed`);
      }
    } catch (error) {
      console.error('Error generating a day\'s wellness tasks:', error);
      setWellnessStatus('Error generating wellness tasks');
    }
  };

  // Create Todoist tasks for the wellness activities assigned to the given dates,
  // and mark those dates as saved in the persisted weekly plan
  const saveWellnessTasksForDays = async (
    dateKeys: string[]
  ): Promise<{ success: boolean; totalSuccess: number; totalFailed: number } | null> => {
    if (!routeName || !wellnessPlanRef.current) return null;

    const plan = wellnessPlanRef.current;
    const tasks: TodoistTask[] = [];
    const daysWithActivities: string[] = [];

    dateKeys.forEach(dateKey => {
      const activities = plan.assignments[dateKey] || [];
      if (activities.length === 0) return;
      daysWithActivities.push(dateKey);
      activities.forEach(text => {
        tasks.push({
          label: text,
          content: text,
          assignee: abrahamTodoistId,
          dueDate: dateKey,
          projectId: todoistConfig.projectId || '6Q8CWgXvPmfx47Vg',
          calendar: false,
          taskDate: new Date(dateKey),
          stateStartTime: '',
          stateEndTime: '',
        });
      });
    });

    if (tasks.length === 0) {
      return { success: true, totalSuccess: 0, totalFailed: 0 };
    }

    const result = await createTasks(todoistConfig, tasks);

    const updatedSavedDays = { ...plan.savedDays };
    daysWithActivities.forEach(dateKey => {
      updatedSavedDays[dateKey] = true;
    });
    const updatedPlan: WeeklyWellnessPlan = { ...plan, savedDays: updatedSavedDays };
    await saveWeeklyPlan(routeName, updatedPlan);
    setWellnessPlan(updatedPlan);
    wellnessPlanRef.current = updatedPlan;

    return result;
  };

  // Push just today's weighted-random wellness activities to Todoist
  const handleSaveTodayWellness = async () => {
    if (!wellnessPlanRef.current) return;
    const todayKey = toISODateString(new Date());
    const todaysActivities = wellnessPlanRef.current.assignments[todayKey] || [];

    if (todaysActivities.length === 0) {
      setWellnessStatus('No wellness tasks scheduled for today');
      return;
    }

    setWellnessStatus('Saving today\'s wellness tasks...');
    try {
      const result = await saveWellnessTasksForDays([todayKey]);
      if (!result) return;

      if (result.success) {
        setWellnessStatus(`Saved ${result.totalSuccess} wellness task(s) to Todoist`);
      } else {
        setWellnessStatus(`Saved ${result.totalSuccess} task(s), ${result.totalFailed} failed`);
      }
    } catch (error) {
      console.error('Error saving wellness tasks:', error);
      setWellnessStatus('Error saving wellness tasks');
    }
  };

  // Push the whole week's wellness plan to Todoist (called from the main Save button)
  const handleSaveWeekWellness = async () => {
    if (!wellnessPlanRef.current) return;

    try {
      const dateKeys = Object.keys(wellnessPlanRef.current.assignments);
      const result = await saveWellnessTasksForDays(dateKeys);
      if (!result) return;

      if (result.totalSuccess === 0 && result.totalFailed === 0) {
        setWellnessStatus('No wellness tasks to sync this week');
      } else if (result.success) {
        setWellnessStatus(`Synced ${result.totalSuccess} wellness task(s) for the week to Todoist`);
      } else {
        setWellnessStatus(`Synced ${result.totalSuccess} wellness task(s), ${result.totalFailed} failed`);
      }
    } catch (error) {
      console.error('Error saving week\'s wellness tasks:', error);
      setWellnessStatus('Error saving week\'s wellness tasks');
    }
  };

  // Handle state changes from Grid component
  const handleStateChange = (newState: AppState) => {
    // Update the ref without triggering re-renders
    appStateRef.current = newState;
    // Now we can uncomment this line safely
    setAppState(newState);
    setHasUnsavedChanges(true);
  };

  // Save state to Digital Ocean Spaces
  const handleSave = async () => {
    // Use ref instead of state to avoid timing issues
    if (!appStateRef.current || !isSaveable) return;
    setSaveStatus('Saving...');
    try {
      const saved = await saveState(
        appStateRef.current, // Use ref instead of state
        getMondayWithOffset(weekOffset),
        routeName
      );
      
      if (saved) {
        setSaveStatus(`Saved "${routeName}" successfully`);
        setHasUnsavedChanges(false);
        
        // Automatically sync to Todoist if enabled (family tasks + the week's wellness tasks)
        if (todoistConfigValid && syncToTodoistEnabled) {
          syncToTodoist();
          handleSaveWeekWellness();
        }
      } else {
        setSaveStatus('Error saving state');
      }
    } catch (error) {
      console.error('Error saving state:', error);
      setSaveStatus('Error saving state');
    }
  };
  
  // Function to create tasks/events data
  const createTasksData = () => {
    const contents: { [key: string]: string } = {
      'AM 🍓': 'Drop off Imogen',
      'AM 🫐': 'Drop off Ida',
      'PM 🍓': 'Pick up Imogen',
      'PM 🫐': 'Pick up Ida',
      'Dinner': 'Cook dinner',
    };
    
    const times: { [key: string]: { start: string; end: string } } = {
      'AM 🍓': { start: '08:00', end: '08:30' },
      'AM 🫐': { start: '08:00', end: '08:30' },
      'PM 🍓': { start: '16:30', end: '17:00' },
      'PM 🫐': { start: '16:30', end: '17:00' },
      'Dinner': { start: '17:00', end: '18:00' }        
    };

    const monday = getMondayWithOffset(weekOffset);
    
    // Row headings for task descriptions
    const rowHeadings = ['AM 🍓', 'AM 🫐', 'PM 🍓', 'PM 🫐', 'Dinner'];
    
    // Data structures to hold tasks
    const todoistTasks: TodoistTask[] = [];

    // Process each tile in the grid state (using ref)
    if (!appStateRef.current) return { todoistTasks };
    
    appStateRef.current.gridState.forEach(tile => {
      // Skip empty tiles (state index 0)
      if (tile.stateIndex === 0) return;

      // Get the assignee
      const stateAssignee = tileStates[tile.stateIndex].todoistId;

      // Determine whether to add to calendar
      const calendar = tileStates[tile.stateIndex].calendar || false;

      // Get the row label ('AM 🍓', etc)
      const rowLabel = rowHeadings[tile.rowIndex];
      
      // Get the row description and time
      const content = contents[rowLabel];
      const stateStartTime = times[rowLabel].start;
      const stateEndTime = times[rowLabel].end;
      
      // Calculate the due date for this task (monday + colIndex days)
      const taskDate = new Date(monday);
      taskDate.setDate(monday.getDate() + tile.colIndex);
      
      // Format for Todoist
      const formattedTaskDate = `${taskDate.toISOString().split('T')[0]} ${stateStartTime}`; // YYYY-MM-DD HH:MM
      
      // Create a Todoist task
      todoistTasks.push({
        label: rowLabel,
        content,
        assignee: stateAssignee,
        dueDate: formattedTaskDate,
        projectId: todoistConfig.projectId || '6Q8CWgXvPmfx47Vg',
        taskDate,
        stateStartTime,
        stateEndTime,
        calendar
      });
    });

    const groupedTasks: TodoistTask[] = [];
    const groupableLabels = [
      { labels: ['AM 🍓', 'AM 🫐'], content: 'Drop kids off' },
      { labels: ['PM 🍓', 'PM 🫐'], content: 'Pick kids up' }
    ];
    const skippableIds: Number[] = [];
    todoistTasks.forEach((outerTask, outerId) => {
      if (skippableIds.indexOf(outerId) !== -1) {
        return;
      }

      let foundCombination = false;        
      todoistTasks.forEach((innerTask, innerId) => {
        if (skippableIds.indexOf(innerId) !== -1) {
          return;
        }

        if (outerId !== innerId) {
          groupableLabels.forEach(labelGroup => {
            if (
              labelGroup.labels.indexOf(outerTask.label) !== -1 &&
              labelGroup.labels.indexOf(innerTask.label) !== -1 &&
              outerTask.assignee === innerTask.assignee &&
              outerTask.dueDate === innerTask.dueDate
            ) {
              groupedTasks.push({
                ...outerTask,
                content: labelGroup.content,
              });
              skippableIds.push(innerId);
              foundCombination = true;
            }
          });
        }
      });
      if (!foundCombination) {
        groupedTasks.push(outerTask);
      }
    });

    // Ungroup tasks where the assignee field contains a separator, i.e. multiple assignees
    const ungroupedTasks: TodoistTask[] = [];
    groupedTasks.forEach(task => {
      if (task.assignee && task.assignee.indexOf(',') !== -1) {
        task.assignee.split(',').forEach(assignee => {
          ungroupedTasks.push({
            ...task,
            assignee
          });
        });
      } else {
        ungroupedTasks.push(task);
      }
    });

    console.log('Tasks created:', { todoistTasks: ungroupedTasks.filter(t => t.assignee) });

    return { todoistTasks: ungroupedTasks.filter(t => t.assignee) };
  };

  // Sync tasks to Todoist
  const syncToTodoist = async () => {
    if (!todoistConfigValid || !appStateRef.current || !isSaveable) return;
    
    setSyncStatus('Syncing to Todoist...');
    try {
      const { todoistTasks } = createTasksData();
      
      if (todoistTasks.length === 0) {
        setSyncStatus('No tasks to sync (all tiles are empty)');
        return;
      }
      
      // Send tasks to Todoist
      const result = await createTasks(todoistConfig, todoistTasks);
      
      if (result.success) {
        setSyncStatus(`Synced ${result.totalSuccess} tasks successfully to Todoist`);
      } else {
        setSyncStatus(`Synced ${result.totalSuccess} tasks to Todoist, ${result.totalFailed} failed`);
      }
    } catch (error) {
      console.error('Error syncing to Todoist:', error);
      setSyncStatus('Error syncing to Todoist');
      setShowSyncModal(false);
    }
  };

  return (
    <div className="App">      
      
      <main>
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <div className="grid-with-counts">
              <Grid
                rows={5}
                columns={5}
                states={tileStates}
                initialState={appState}
                onStateChange={handleStateChange}
                weekOffset={weekOffset}
                onWeekChange={setWeekOffset}
              />
              {appState && (() => {
                const userNames: {[key: string]: string} = { 'A': 'Abe', 'L': 'Lizz', 'B': 'Both', ' ': 'None' };
                const items = tileStates.map((state, index) => ({
                  state,
                  index,
                  count: appState.gridState.filter(t => t.stateIndex === index).length,
                  name: userNames[state.label],
                })).filter(item => item.count > 0 && item.name !== 'None');
                return items.length > 0 ? (
                  <div className="tile-counts">
                    {items.map(({ state, index, count, name }) => (
                      <div key={index} className="tile-count-item">
                        <span className="tile-count-dot" style={{ backgroundColor: state.color }} />
                        <span>{name}: {count}</span>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
            <div className="action-bar">
              {isSaveable && (
                <div className="action-group">
                  {hasUnsavedChanges && (
                    <label className="sync-toggle">
                      <input
                        type="checkbox"
                        checked={syncToTodoistEnabled}
                        onChange={(e) => setSyncToTodoistEnabled(e.target.checked)}
                      />
                      Sync to Todoist
                    </label>
                  )}
                  <button
                    className="pill-button pill-button-save"
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges}
                  >
                    <span aria-hidden="true">💾</span> Save
                  </button>
                </div>
              )}

              <div className="action-group">
                <button
                  className="pill-button pill-button-outline"
                  onClick={() => setShowWellnessModal(true)}
                  aria-label="Wellness Weights"
                  title="Wellness Weights"
                >
                  <span aria-hidden="true">⚙️</span> Weights
                </button>
                <button
                  className="pill-button pill-button-wellness"
                  onClick={handleSaveTodayWellness}
                  disabled={
                    !wellnessPlan ||
                    (wellnessPlan.assignments[toISODateString(new Date())] || []).length === 0
                  }
                  aria-label="Save Today's Wellness Tasks"
                  title="Save Today's Wellness Tasks"
                >
                  <span aria-hidden="true">✅</span> Save Today
                </button>
              </div>

              {(syncStatus || wellnessStatus) && (
                <div className="action-status">
                  {syncStatus && <p className="status-text">{syncStatus}</p>}
                  {wellnessStatus && <p className="status-text">{wellnessStatus}</p>}
                </div>
              )}
            </div>

            <WellnessModal
              isOpen={showWellnessModal}
              tasks={wellnessTasks}
              cap={wellnessCap}
              onCancel={() => setShowWellnessModal(false)}
              onSaveDefault={handleSaveDefaultWellness}
              onGenerateOneDay={handleGenerateOneDay}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
