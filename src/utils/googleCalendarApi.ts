// Google Calendar API service using Google Identity Services (GIS)
import '../types/gapi-client.d';

interface GoogleCalendarConfig {
  clientId: string;
  apiKey: string;
  calendarId: string;
  scopes: string[];
  discoveryDocs: string[];
}

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string; // ISO string
  endDateTime: string;   // ISO string
  attendees?: { email: string; displayName?: string }[];
}

// Global variables to store authentication state
let accessToken: string | null = null;
let tokenClient: TokenClient | null = null;
let isInitialized = false;

/**
 * Initialize Google Identity Services client
 */
export const initGoogleCalendarClient = (config: GoogleCalendarConfig): Promise<boolean> => {
  return new Promise((resolve) => {    
    try {
      // Check if Google Identity Services is available
      if (!window.google || !window.google.accounts) {
        console.error('Google Identity Services not available');
        resolve(false);
        return;
      }
      
      // Initialize token client
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: config.scopes.join(' '),
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Error getting access token:', tokenResponse.error);
            resolve(false);
            return;
          }
          
          accessToken = tokenResponse.access_token;
          isInitialized = true;
          resolve(true);
        },
        error_callback: (error) => {
          console.error('Error initializing token client:', error);
          resolve(false);
        }
      });
      
      isInitialized = true;
      resolve(true);
    } catch (error) {
      console.error('Error initializing Google Calendar client:', error);
      resolve(false);
    }
  });
};

/**
 * Request authorization from the user
 */
export const authorizeCalendar = async (): Promise<boolean> => {
  if (!isInitialized || !tokenClient) {
    console.error('Google API client not initialized');
    return false;
  }

  try {
    return new Promise((resolve) => {
      tokenClient!.callback = (tokenResponse) => {
        if (tokenResponse.error) {
          console.error('Error getting access token:', tokenResponse.error);
          resolve(false);
          return;
        }
        
        accessToken = tokenResponse.access_token;
        resolve(true);
      };
      
      tokenClient!.error_callback = (error) => {
        console.error('Authorization error:', error);
        resolve(false);
      };
      
      tokenClient!.requestAccessToken();
    });
  } catch (error) {
    console.error('Error authorizing Google Calendar:', error);
    return false;
  }
};

/**
 * Check if user is signed in
 */
export const isAuthorized = (): boolean => {
  return isInitialized && accessToken !== null;
};

/**
 * Create a new event in Google Calendar
 */
export const createEvent = async (
  config: GoogleCalendarConfig,
  event: GoogleCalendarEvent
): Promise<boolean> => {
  if (!isAuthorized()) {
    console.error('Not authorized to access Google Calendar');
    return false;
  }

  try {
    // Format the event for Google Calendar
    const calendarEvent: GoogleCalendarEventResource = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: event.attendees
    };

    // Insert the event using fetch API
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response from Google Calendar API:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return false;
  }
};

/**
 * Create multiple events in Google Calendar
 */
export const createEvents = async (
  config: GoogleCalendarConfig,
  events: GoogleCalendarEvent[]
): Promise<{ success: boolean; totalSuccess: number; totalFailed: number }> => {
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const event of events) {
    try {
      const success = await createEvent(config, event);
      if (success) {
        totalSuccess++;
      } else {
        totalFailed++;
      }
    } catch (error) {
      console.error('Error creating event:', error);
      totalFailed++;
    }
  }

  return {
    success: totalFailed === 0,
    totalSuccess,
    totalFailed,
  };
};

/**
 * Sign out of Google Calendar
 */
export const signOut = (): void => {
  accessToken = null;
};
