import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './App.css';
import Grid from './components/Grid';
import { getMondayWithOffset } from './utils/dates';
import { AppState, loadState, saveState, listSavedStates } from './utils/digitalOceanStorage';
import { createTasks, TodoistTask } from './utils/todoistApi';
import { 
  initGoogleCalendarClient, 
  authorizeCalendar, 
  isAuthorized, 
  createEvents, 
  GoogleCalendarEvent 
} from './utils/googleCalendarApi';
import { 
  doSpacesConfig, 
  appConfig, 
  todoistConfig, 
  googleCalendarConfig 
} from './config';

function App() {
  // Get the route parameter from the URL
  const { routeName } = useParams<{ routeName: string }>();
  const isSaveable = routeName?.toLowerCase() === 'berrypatch';
  
  // Define the states for the tiles (letters that will cycle through)
  const tileStates = [
    { label: ' ', color: '#f0f0f0' },
    { label: 'A', color: '#9AD7A4', todoistId: '35630104' },
    { label: 'L', color: '#FDAEA9', todoistId: '35677852' },
    { label: 'B', color: '#F0CA86' }
  ];
  
  // State for the app
  const [appState, setAppState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [configValid, setConfigValid] = useState<boolean>(false);
  const [todoistConfigValid, setTodoistConfigValid] = useState<boolean>(false);
  const [googleCalendarConfigValid, setGoogleCalendarConfigValid] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<string>('');
  
  // Used for status messages in console and UI updates, but not directly rendered
  const setSaveStatus = (status: string) => {
    console.log('Save status:', status);
  };
  const [, setGoogleCalendarAuthorized] = useState<boolean>(false);
  
  // Ref to store the latest state without triggering re-renders
  const appStateRef = useRef<AppState | null>(null);

  // Check if the configurations are valid
  useEffect(() => {
    // Digital Ocean Spaces config check
    const isValid = Boolean(
      doSpacesConfig.accessKeyId && 
      doSpacesConfig.secretAccessKey && 
      doSpacesConfig.endpoint && 
      doSpacesConfig.bucket
    );
    
    setConfigValid(isValid);
    
    if (!isValid) {
      console.warn('Digital Ocean Spaces configuration is incomplete. Local storage will be used instead.');
    }
    
    // Todoist config check
    const isTodoistValid = Boolean(todoistConfig.apiToken);
    setTodoistConfigValid(isTodoistValid);
    
    if (!isTodoistValid) {
      console.warn('Todoist API configuration is incomplete. Sync to Todoist will be disabled.');
    }

    // Google Calendar config check
    const isGoogleCalendarValid = Boolean(
      googleCalendarConfig.clientId && 
      googleCalendarConfig.apiKey
    );
    setGoogleCalendarConfigValid(isGoogleCalendarValid);
    
    if (!isGoogleCalendarValid) {
      console.warn('Google Calendar configuration is incomplete. Sync to Google Calendar will be disabled.');
    } else {
      // Initialize Google Calendar client
      initGoogleCalendarClient(googleCalendarConfig)
        .then(initialized => {
          if (!initialized) {
            console.warn('Failed to initialize Google Calendar client');
          }
        });
    }
  }, []);

  // Load initial state from Digital Ocean Spaces and list available routes
  useEffect(() => {
    const fetchState = async () => {
      setIsLoading(true);
      
      if (configValid) {
        try {
          // Load state for the current route
          const loadedState = await loadState(
            doSpacesConfig, 
            appConfig.defaultStateKey,
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
          
          // Load list of available routes
          try {
            await listSavedStates(
              doSpacesConfig,
              appConfig.stateKeyPrefix
            );
            
            // Route data used elsewhere, commented out for now
            // Extract route names from keys
            // const routes = savedStates.map(key => {
            //   const parts = key.split('/');
            //   return parts[parts.length - 1];
            // });
          } catch (error) {
            console.error('Error listing saved states:', error);
          }
        } catch (error) {
          console.error('Error loading state:', error);
          setSaveStatus('Error loading state');
        }
      }
      
      setIsLoading(false);
    };

    fetchState();
  }, [configValid, routeName, weekOffset]);

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
    if (!configValid || !appStateRef.current || !isSaveable) return;
    setSaveStatus('Saving...');
    try {
      const saved = await saveState(
        doSpacesConfig,
        appConfig.defaultStateKey,
        appStateRef.current, // Use ref instead of state
        getMondayWithOffset(weekOffset),
        routeName
      );
      
      if (saved) {
        setSaveStatus(`Saved "${routeName}" successfully`);
        setHasUnsavedChanges(false);
        
        // Automatically sync to Todoist without prompting
        if (todoistConfigValid) {
          syncToTodoist();
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
      'PM 🍓': { start: '16:25', end: '17:00' },
      'PM 🫐': { start: '16:25', end: '17:00' },
      'Dinner': { start: '17:00', end: '18:00' }        
    };

    const monday = getMondayWithOffset(weekOffset);
    
    // Row headings for task descriptions
    const rowHeadings = ['AM 🍓', 'AM 🫐', 'PM 🍓', 'PM 🫐', 'Dinner'];
    
    // Data structures to hold tasks and events
    const todoistTasks: TodoistTask[] = [];
    const calendarEvents: GoogleCalendarEvent[] = [];
    
    // Process each tile in the grid state (using ref)
    if (!appStateRef.current) return { todoistTasks, calendarEvents };
    
    appStateRef.current.gridState.forEach(tile => {
      // Skip empty tiles (state index 0)
      if (tile.stateIndex === 0) return;
      
      // Get the state label ('A', 'L', or 'B')
      const stateLabel = tileStates[tile.stateIndex].label;

      // Get the assignee
      const stateAssignee = tileStates[tile.stateIndex].todoistId;

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
      
      // Format for Google Calendar
      const startDateTime = new Date(taskDate);
      startDateTime.setHours(
        parseInt(stateStartTime.split(':')[0], 10), 
        parseInt(stateStartTime.split(':')[1], 10)
      );
      
      const endDateTime = new Date(taskDate);
      endDateTime.setHours(
        parseInt(stateEndTime.split(':')[0], 10), 
        parseInt(stateEndTime.split(':')[1], 10)
      );
      
      // Create a Todoist task
      todoistTasks.push({
        label: rowLabel,
        content,
        assignee: stateAssignee,
        dueDate: formattedTaskDate,
        projectId: todoistConfig.projectId || '2316749966'
      });
      
      // Create a Google Calendar event
      calendarEvents.push({
        summary: content,
        description: `Assigned to: ${stateLabel}`,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString()
      });
    });
    
    return { todoistTasks, calendarEvents };
  };

  // Sync tasks to Todoist
  const syncToTodoist = async () => {
    if (!todoistConfigValid || !appStateRef.current || !isSaveable) return;
    
    setSyncStatus('Syncing to Todoist...');
    try {
      const { todoistTasks } = createTasksData();
      
      if (todoistTasks.length === 0) {
        setSyncStatus('No tasks to sync (all tiles are empty)');
        setShowSyncModal(false);
        return;
      }

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
      
      // Send tasks to Todoist
      const result = await createTasks(todoistConfig, ungroupedTasks);
      
      if (result.success) {
        setSyncStatus(`Synced ${result.totalSuccess} tasks successfully`);
      } else {
        setSyncStatus(`Synced ${result.totalSuccess} tasks, ${result.totalFailed} failed`);
      }
      
      // Close the modal after sync is complete
      setShowSyncModal(false);
      
      // After Todoist sync, also sync to Google Calendar if configured and authorized
      if (googleCalendarConfigValid && isAuthorized()) {
        syncToGoogleCalendar();
      }
    } catch (error) {
      console.error('Error syncing to Todoist:', error);
      setSyncStatus('Error syncing to Todoist');
      setShowSyncModal(false);
    }
  };
  
  // Sync events to Google Calendar
  const syncToGoogleCalendar = async () => {
    if (!googleCalendarConfigValid || !appStateRef.current || !isSaveable) return;
    
    // Check if authorized, if not request authorization
    if (!isAuthorized()) {
      try {
        setCalendarSyncStatus('Requesting Google Calendar authorization...');
        const authorized = await authorizeCalendar();
        setGoogleCalendarAuthorized(authorized);
        
        if (!authorized) {
          setCalendarSyncStatus('Google Calendar authorization failed');
          return;
        }
      } catch (error) {
        console.error('Error authorizing Google Calendar:', error);
        setCalendarSyncStatus('Google Calendar authorization failed');
        return;
      }
    }
    
    setCalendarSyncStatus('Syncing to Google Calendar...');
    try {
      const { calendarEvents } = createTasksData();
      
      if (calendarEvents.length === 0) {
        setCalendarSyncStatus('No events to sync (all tiles are empty)');
        return;
      }
      
      // Send events to Google Calendar
      const result = await createEvents(googleCalendarConfig, calendarEvents);
      
      if (result.success) {
        setCalendarSyncStatus(`Synced ${result.totalSuccess} events successfully to Google Calendar`);
      } else {
        setCalendarSyncStatus(`Synced ${result.totalSuccess} events, ${result.totalFailed} failed to Google Calendar`);
      }
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error);
      setCalendarSyncStatus('Error syncing to Google Calendar');
    }
  };
  
  // Close the sync modal
  const closeModal = () => {
    setShowSyncModal(false);
  };

  return (
    <div className="App">      
      
      <main>
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <Grid 
              rows={5} 
              columns={5} 
              states={tileStates}
              initialState={appState}
              onStateChange={handleStateChange}
              weekOffset={weekOffset}
              onWeekChange={setWeekOffset}
            />
            <div className="button-container">
              {configValid && isSaveable && (
                <button 
                  className="save-button" 
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                >
                  Save
                </button>
              )}
              {todoistConfigValid && isSaveable && (
                <button 
                  className="todoist-button" 
                  onClick={syncToTodoist}
                >
                  Sync to Todoist
                </button>
              )}
              {googleCalendarConfigValid && isSaveable && (
                <button 
                  className="calendar-button" 
                  onClick={syncToGoogleCalendar}
                >
                  Sync to Google Calendar
                </button>
              )}
              {syncStatus && <p className="sync-status">{syncStatus}</p>}
              {calendarSyncStatus && <p className="calendar-sync-status">{calendarSyncStatus}</p>}
            </div>
            
            {/* Sync Modal */}
            {showSyncModal && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h3>Changes Saved Successfully</h3>
                  <p>Your changes have been saved. Would you like to sync to your task services now?</p>
                  <div className="modal-buttons">
                    {todoistConfigValid && (
                      <button 
                        className="todoist-button" 
                        onClick={syncToTodoist}
                      >
                        Sync to Todoist
                      </button>
                    )}
                    {googleCalendarConfigValid && (
                      <button 
                        className="calendar-button" 
                        onClick={syncToGoogleCalendar}
                      >
                        Sync to Google Calendar
                      </button>
                    )}
                    <button 
                      className="cancel-button" 
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
