import { Client, Account, Databases } from 'appwrite';
import log from '../../utils/logger';

const requiredEnvVars = {
    VITE_APPWRITE_ENDPOINT: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    VITE_APPWRITE_PROJECT_ID: import.meta.env.VITE_APPWRITE_PROJECT_ID,
    VITE_APPWRITE_DATABASE_ID: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    VITE_APPWRITE_DONORS_COLLECTION_ID: import.meta.env.VITE_APPWRITE_DONORS_COLLECTION_ID,
    VITE_APPWRITE_REQUESTS_COLLECTION_ID: import.meta.env.VITE_APPWRITE_REQUESTS_COLLECTION_ID,
};

// Check if all required env vars are set
const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value || value.startsWith('VITE_'))
    .map(([key]) => key);

if (missingVars.length > 0) {
    console.warn('⚠️ Missing Appwrite environment variables:', missingVars);
    console.warn('Please set these in your .env file for the app to work properly.');
}

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://tor.cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const databases = new Databases(client);

export const appwriteConfig = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    donorsCollectionId: import.meta.env.VITE_APPWRITE_DONORS_COLLECTION_ID,
    requestsCollectionId: import.meta.env.VITE_APPWRITE_REQUESTS_COLLECTION_ID,
};

export default client;

// Helpful debug log for developers (will appear in browser console)
try {
    log('Appwrite config:', {
        endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
        projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
        databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    });
} catch {
    // ignore
}
