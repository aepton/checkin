// Todoist API configuration
export const todoistConfig = {
  apiToken: process.env.REACT_APP_TODOIST_API_TOKEN || '',
  projectId: process.env.REACT_APP_TODOIST_PROJECT_ID || '',
};

// Google Calendar OAuth2 configuration
export const googleCalendarConfig = {
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY || '',
  calendarId: process.env.REACT_APP_GOOGLE_CALENDAR_ID || 'primary',
  scopes: ['https://www.googleapis.com/auth/calendar.events'],
  discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
};