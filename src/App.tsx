import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './App.css';
import Grid from './components/Grid';
import { AppState, loadState, saveState, listSavedStates } from './utils/digitalOceanStorage';
import { createTasks, TodoistTask } from './utils/todoistApi';
import { doSpacesConfig, appConfig, todoistConfig } from './config';

function App() {
  // Get the route parameter from the URL
  const { routeName } = useParams<{ routeName: string }>();
  
  // Define the states for the tiles (letters that will cycle through)
  const tileStates = [
    { label: ' ', color: '#f0f0f0' },
    { label: 'A', color: '#9AD7A4' },
    { label: 'L', color: '#FDAEA9' },
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
    setAppState(newState);
    setHasUnsavedChanges(true);
  };

  // Save state to Digital Ocean Spaces
  const handleSave = async () => {
    if (!configValid || !appState) return;
    
    setSaveStatus('Saving...');
    try {
      const saved = await saveState(
        doSpacesConfig,
        appConfig.defaultStateKey,
        appState,
        routeName
      );
      
      if (saved) {
        setSaveStatus(`Saved "${routeName}" successfully`);
        setHasUnsavedChanges(false);
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
    if (!todoistConfigValid || !appState) return;
    
    setSyncStatus('Syncing to Todoist...');
    try {
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
      
      // Process each tile in the grid state
      appState.gridState.forEach(tile => {
        // Skip empty tiles (state index 0)
        if (tile.stateIndex === 0) return;
        
        // Get the state label ('A', 'L', or 'B')
        const stateLabel = tileStates[tile.stateIndex].label;
        
        // Get the row description
        const rowDesc = rowHeadings[tile.rowIndex];
        
        // Calculate the due date for this task (monday + colIndex days)
        const dueDate = new Date(monday);
        dueDate.setDate(monday.getDate() + tile.colIndex);
        const formattedDate = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Create a task with the appropriate content
        tasks.push({
          content: `${stateLabel} - ${rowDesc}`,
          description: `Task for ${rowDesc} on ${formattedDate}`,
          dueDate: formattedDate,
          priority: stateLabel === 'A' ? 4 : (stateLabel === 'B' ? 2 : 3), // A=4 (highest), L=3, B=2
        });
      });
      
      if (tasks.length === 0) {
        setSyncStatus('No tasks to sync (all tiles are empty)');
        return;
      }
      
      // Send tasks to Todoist
      const result = await createTasks(todoistConfig, tasks);
      
      if (result.success) {
        setSyncStatus(`Synced ${result.totalSuccess} tasks successfully`);
      } else {
        setSyncStatus(`Synced ${result.totalSuccess} tasks, ${result.totalFailed} failed`);
      }
    } catch (error) {
      console.error('Error syncing to Todoist:', error);
      setSyncStatus('Error syncing to Todoist');
    }
  };

  return (
    <div className="App">      
      {false && !configValid && (
        <div className="config-warning">
          <p>⚠️ Digital Ocean Spaces not configured. State will not be saved.</p>
        </div>
      )}
      
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
                  Save Changes
                </button>
              )}
              
              {todoistConfigValid && (
                <>
                  <button 
                    className="todoist-button" 
                    onClick={syncToTodoist}
                    disabled={!appState}
                  >
                    Sync to Todoist
                  </button>
                  {syncStatus && <p className="sync-status">{syncStatus}</p>}
                </>
              )}

              <div className="route-info">
                <div className="current-route">
                  <h2>Current Grid: {routeName}</h2>
                  {saveStatus && <p className="save-status-text">{saveStatus}</p>}
                  {hasUnsavedChanges && <p className="unsaved-indicator">Unsaved changes</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
