// Digital Ocean Spaces configuration
export const doSpacesConfig = {
  accessKeyId: process.env.REACT_APP_DO_SPACES_ACCESS_KEY || '',
  secretAccessKey: process.env.REACT_APP_DO_SPACES_SECRET_KEY || '',
  endpoint: process.env.REACT_APP_DO_SPACES_ENDPOINT || '',
  region: process.env.REACT_APP_DO_SPACES_REGION || 'nyc3',
  bucket: process.env.REACT_APP_DO_SPACES_BUCKET || '',
};

// Todoist API configuration
export const todoistConfig = {
  apiToken: process.env.REACT_APP_TODOIST_API_TOKEN || '',
  projectId: process.env.REACT_APP_TODOIST_PROJECT_ID || '',
};

// App configuration
export const appConfig = {
  stateKeyPrefix: 'checkin-app/',
  defaultStateKey: 'checkin-app/default-state',
};