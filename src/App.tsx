import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import './App.css';
import Grid from './components/Grid';
import { AppState, loadState, saveState, listSavedStates } from './utils/digitalOceanStorage';
import { createTasks, TodoistTask } from './utils/todoistApi';
import { doSpacesConfig, appConfig, todoistConfig } from './config';
import { config } from 'process';
import { group } from 'console';

function App() {
  // Get the route parameter from the URL
  const { routeName } = useParams<{ routeName: string }>();
  
  // Define the states for the tiles (letters that will cycle through)
  const tileStates = [
    { label: ' ', color: '#f0f0f0' },
    { label: 'A', color: '#9AD7A4', todoistId: '35630104' },
    { label: 'L', color: '#FDAEA9', todoIstId: '35677852' },
    { label: 'B', color: '#F0CA86' }
  ];
  
  // State for the app
  const [appState, setAppState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [configValid, setConfigValid] = useState<boolean>(false);
  const [todoistConfigValid, setTodoistConfigValid] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  
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
            const savedStates = await listSavedStates(
              doSpacesConfig,
              appConfig.stateKeyPrefix
            );
            
            // Extract route names from keys
            const routes = savedStates.map(key => {
              const parts = key.split('/');
              return parts[parts.length - 1];
            });
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
  }, [configValid, routeName]);

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
    console.log('handling save', configValid, appStateRef.current);
    // Use ref instead of state to avoid timing issues
    if (!configValid || !appStateRef.current) return;
    
    setSaveStatus('Saving...');
    try {
      const saved = await saveState(
        doSpacesConfig,
        appConfig.defaultStateKey,
        appStateRef.current, // Use ref instead of state
        routeName
      );

      console.log('saved', saved);
      
      if (saved) {
        setSaveStatus(`Saved "${routeName}" successfully`);
        setHasUnsavedChanges(false);
        
        // Show the sync modal when save is successful
        if (todoistConfigValid) {
          setShowSyncModal(true);
        }
      } else {
        setSaveStatus('Error saving state');
      }
    } catch (error) {
      console.error('Error saving state:', error);
      setSaveStatus('Error saving state');
    }
  };
  
  // Sync tasks to Todoist
  const syncToTodoist = async () => {
    if (!todoistConfigValid || !appStateRef.current) return;
    
    setSyncStatus('Syncing to Todoist...');
    try {
      const contents: { [key: string]: string } = {
        'AM 🍓': 'Drop off Imogen',
        'AM 🫐': 'Drop off Ida',
        'PM 🍓': 'Pick up Imogen',
        'PM 🫐': 'Pick up Ida',
        'Dinner': 'Cook dinner',

      };
      const times: { [key: string]: string } = {
        'AM 🍓': '08:00',
        'AM 🫐': '08:00',
        'PM 🍓': '16:25',
        'PM 🫐': '16:25',
        'Dinner': '17:00'        
      }

      // Get the current week's date range for task due dates
      const today = new Date();
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday);
      
      // Create tasks from tiles with states other than empty (index 0)
      const tasks: TodoistTask[] = [];
      
      // Row headings for task descriptions
      const rowHeadings = ['AM 🍓', 'AM 🫐', 'PM 🍓', 'PM 🫐', 'Dinner'];
      
      // Process each tile in the grid state (using ref)
      appStateRef.current.gridState.forEach(tile => {
        console.log(tile);
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
        const stateTime = times[rowLabel];
        
        // Calculate the due date for this task (monday + colIndex days)
        const dueDate = new Date(monday);
        dueDate.setDate(monday.getDate() + tile.colIndex);
        const formattedDate = `${dueDate.toISOString().split('T')[0]} ${stateTime}`; // YYYY-MM-DD  HH:MM
        
        // Create a task with the appropriate content
        tasks.push({
          label: rowLabel,
          content,
          assignee: stateAssignee,
          dueDate: formattedDate,
          projectId: '2316749966'
        });
      });

      console.log(tasks);
      
      if (tasks.length === 0) {
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
      tasks.forEach((outerTask, outerId) => {
        console.log(skippableIds, outerId);
        if (skippableIds.indexOf(outerId) !== -1) {
          console.log('skipping outer', outerId);
          return;
        }

        let foundCombination = false;        
        tasks.forEach((innerTask, innerId) => {
          if (skippableIds.indexOf(innerId) !== -1) {
            console.log('skipping inner', innerId);
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
                console.log('combination', outerTask, innerTask, JSON.stringify(groupedTasks));
                skippableIds.push(innerId);
                foundCombination = true;
              }
            });
          }
        });
        console.log('found combination', outerTask, foundCombination);
        if (!foundCombination) {
          groupedTasks.push(outerTask);
        }
      });
      console.log(groupedTasks);

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
    } catch (error) {
      console.error('Error syncing to Todoist:', error);
      setSyncStatus('Error syncing to Todoist');
      setShowSyncModal(false);
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
            />
            <div className="button-container">
              {configValid && (
                <button 
                  className="save-button" 
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                >
                  Save
                </button>
              )}
              {syncStatus && <p className="sync-status">{syncStatus}</p>}
            </div>
            
            {/* Sync Modal */}
            {showSyncModal && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h3>Changes Saved Successfully</h3>
                  <p>Your changes have been saved. Would you like to sync to Todoist now?</p>
                  <div className="modal-buttons">
                    <button 
                      className="todoist-button" 
                      onClick={syncToTodoist}
                    >
                      Sync to Todoist
                    </button>
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
