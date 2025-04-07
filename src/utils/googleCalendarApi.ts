// Google Calendar API service
import gapi from 'gapi-client';

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
let gapiInitialized = false;
let isSignedIn = false;

/**
 * Initialize Google API client
 */
export const initGoogleCalendarClient = (config: GoogleCalendarConfig): Promise<boolean> => {
  return new Promise((resolve) => {
    gapi.load('client:auth2', async () => {
      try {
        await gapi.client.init({
          apiKey: config.apiKey,
          clientId: config.clientId,
          discoveryDocs: config.discoveryDocs,
          scope: config.scopes.join(' ')
        });

        // Listen for sign-in state changes
        gapi.auth2.getAuthInstance().isSignedIn.listen((signedIn) => {
          isSignedIn = signedIn;
        });

        // Set the initial sign-in state
        isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
        gapiInitialized = true;
        resolve(true);
      } catch (error) {
        console.error('Error initializing Google API client:', error);
        resolve(false);
      }
    });
  });
};

/**
 * Request authorization from the user
 */
export const authorizeCalendar = async (): Promise<boolean> => {
  if (!gapiInitialized) {
    console.error('Google API client not initialized');
    return false;
  }

  try {
    if (!isSignedIn) {
      await gapi.auth2.getAuthInstance().signIn();
    }
    return gapi.auth2.getAuthInstance().isSignedIn.get();
  } catch (error) {
    console.error('Error authorizing Google Calendar:', error);
    return false;
  }
};

/**
 * Check if user is signed in
 */
export const isAuthorized = (): boolean => {
  return gapiInitialized && isSignedIn;
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
    const calendarEvent = {
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

    // Insert the event
    const response = await gapi.client.calendar.events.insert({
      calendarId: config.calendarId,
      resource: calendarEvent
    });

    return response.status === 200;
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
  if (gapiInitialized) {
    gapi.auth2.getAuthInstance().signOut();
  }
};