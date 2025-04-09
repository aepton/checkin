declare interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

declare interface TokenClient {
  requestAccessToken(overrideConfig?: {
    prompt?: string;
    hint?: string;
    state?: string;
    enable_serial_consent?: boolean;
    callback?: (response: TokenResponse) => void;
    error_callback?: (error: Error) => void;
  }): void;
  callback?: (response: TokenResponse) => void;
  error_callback?: (error: Error) => void;
}

declare interface GsiConfig {
  client_id: string;
  scope: string;
  callback?: (response: TokenResponse) => void;
  error_callback?: (error: Error) => void;
}

declare interface GoogleCalendarEventResource {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: { email: string; displayName?: string }[];
}

declare interface GoogleCalendarInsertResponse {
  status: number;
  result: any;
}

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: GsiConfig) => TokenClient;
        };
      };
    };
  }
}

// Add this to make window.google accessible
interface Window {
  google: {
    accounts: {
      oauth2: {
        initTokenClient: (config: GsiConfig) => TokenClient;
      };
    };
  };
}