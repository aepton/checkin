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
  config: DOSpacesConfig,
  key: string,
  state: AppState,
  weekDate: Date,
  routeName?: string,
): Promise<boolean> => {
  try {    
    const s3 = initializeStorage(config);
    const storageKey = routeName ? getKeyForRoute(key, routeName) : key;

    await s3.putObject({
      Bucket: config.bucket,
      Key: `${storageKey}/${formatDate(weekDate)}`,
      Body: JSON.stringify(state),
      ContentType: 'application/json',
      ACL: 'private',
    }).promise();
    
    return true;
  } catch (error) {
    console.error('Error saving state to DO Spaces:', error);
    return false;
  }
};

/**
 * Load the app state from Digital Ocean Spaces
 */
export const loadState = async (
  config: DOSpacesConfig,
  key: string,
  weekDate: Date,
  routeName?: string
): Promise<AppState | null> => {
  try {
    const s3 = initializeStorage(config);
    const storageKey = routeName ? getKeyForRoute(key, routeName) : key;
    
    const data = await s3.getObject({
      Bucket: config.bucket,
      Key: `${storageKey}/${formatDate(weekDate)}`,
    }).promise();
    
    if (data.Body) {
      return JSON.parse(data.Body.toString());
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

/**
 * List all saved states in Digital Ocean Spaces
 */
export const listSavedStates = async (
  config: DOSpacesConfig,
  prefix: string
): Promise<string[]> => {
  try {
    const s3 = initializeStorage(config);
    
    const data = await s3.listObjectsV2({
      Bucket: config.bucket,
      Prefix: prefix,
    }).promise();
    
    if (data.Contents) {
      return data.Contents.map(item => item.Key || '').filter(key => key !== '');
    }
    return [];
  } catch (error) {
    console.error('Error listing saved states from DO Spaces:', error);
    return [];
  }
};