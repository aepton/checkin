import AWS from 'aws-sdk';
import { formatDate } from './dates';

// Configuration interface
interface DOSpacesConfig {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
  bucket: string;
}

// State interface
export interface AppState {
  gridState: {
    rowIndex: number;
    colIndex: number;
    stateIndex: number;
  }[];
}

const READER_FUNCTION_URL = 'https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-db6c84e6-3d28-416d-9c58-b01c0e7fa4c6/default/reader';
const SAVER_FUNCTION_URL = 'https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-db6c84e6-3d28-416d-9c58-b01c0e7fa4c6/default/saver';

// Create a singleton for the S3 client
let s3Client: AWS.S3 | null = null;

/**
 * Initialize the Digital Ocean Spaces client
 */
export const initializeStorage = (config: DOSpacesConfig): AWS.S3 => {
  if (!s3Client) {
    // Configure AWS to use custom endpoint and credentials
    AWS.config.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    });
    
    // Create S3 client with proper configuration for DO Spaces
    s3Client = new AWS.S3({
      endpoint: config.endpoint,
      s3ForcePathStyle: true, // Needed for DO Spaces
      signatureVersion: 'v4',
      // This allows requests from any origin to work with CORS
      // Using cors: true to enable CORS for Digital Ocean Spaces
      // cors: true,
      httpOptions: {
        xhrWithCredentials: false
      }
    });
  }
  return s3Client;
};

/**
 * Get the storage key for a specific route
 */
export const getKeyForRoute = (baseKey: string, routeName: string): string => {
  // Extract the prefix from the base key (everything up to the last '/')
  const lastSlashIndex = baseKey.lastIndexOf('/');
  const prefix = lastSlashIndex >= 0 ? baseKey.substring(0, lastSlashIndex + 1) : '';
  
  // Construct the key with the route name
  return `${prefix}${routeName}`;
};

/**
 * Save the app state to Digital Ocean Spaces
 */
export const saveState = async (
  state: AppState,
  weekDate: Date,
  routeName?: string,
): Promise<boolean> => {
  try {
    const response = await fetch(`${SAVER_FUNCTION_URL}?namespace=${encodeURIComponent(routeName || '').toLowerCase()}&date=${encodeURIComponent(formatDate(weekDate))}&data=${encodeURIComponent(JSON.stringify(state))}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });    

    if (!response.ok) {
      throw new Error(`Failed to load state: ${response.status}`);
    }

    const data = await response.json();
    return data.success == true;
  } catch (error) {
    console.error('Error saving state to DO Spaces:', error);
    return false;
  }
};

/**
 * Load the app state from Digital Ocean Spaces
 */
export const loadState = async (
  weekDate: Date,
  routeName?: string
): Promise<AppState | null> => {
  try {
    const response = await fetch(`${READER_FUNCTION_URL}?namespace=${encodeURIComponent(routeName || '').toLowerCase()}&date=${encodeURIComponent(formatDate(weekDate))}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });    

    if (!response.ok) {
      throw new Error(`Failed to load state: ${response.status}`);
    }

    const data = await response.json();

    if (data.Body) {
      // If Body is already a parsed object, return it directly
      if (typeof data.Body === 'object') {
        return data.Body;
      }
      // Otherwise parse it from string
      return JSON.parse(data.Body.toString());
    } else if (data && typeof data === 'object' && data.gridState) {
      // If we have data but no Body property, the API might be returning the state directly
      return data;
    }
    return null;
  } catch (error) {
    // If the object doesn't exist, that's not an error
    if ((error as AWS.AWSError).code === 'NoSuchKey') {
      return null;
    }
    console.error('Error loading state from DO Spaces:', error);
    return null;
  }
};

/**
 * Delete a saved state from Digital Ocean Spaces
 */
export const deleteState = async (
  config: DOSpacesConfig,
  key: string
): Promise<boolean> => {
  try {
    const s3 = initializeStorage(config);
    
    await s3.deleteObject({
      Bucket: config.bucket,
      Key: key,
    }).promise();
    
    return true;
  } catch (error) {
    console.error('Error deleting state from DO Spaces:', error);
    return false;
  }
};