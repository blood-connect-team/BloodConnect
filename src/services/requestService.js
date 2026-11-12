import { databases, appwriteConfig } from './appwrite/config';
import { ID, Permission, Query, Role } from 'appwrite';

const validateConfig = () => {
  if (!appwriteConfig.databaseId || !appwriteConfig.requestsCollectionId) {
    throw new Error('Appwrite configuration incomplete. Please check your environment variables.');
  }
};

export const requestService = {
  // Create an emergency request
  createRequest: async ({ hospitalName, bloodGroup, urgency, area, patientName, status = "active" }) => {
    try {
      validateConfig();

      if (!hospitalName || !bloodGroup || !urgency || !area || !patientName) {
        throw new Error('All request fields are required');
      }

      return await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.requestsCollectionId,
        ID.unique(),
        {
          hospitalName,
          bloodGroup,
          urgency,
          area,
          // keep hospitalArea for compatibility with older documents
          hospitalArea: area,
          patientName,
          status,
        },
        [Permission.read(Role.any())]
      );
    } catch (error) {
      const raw = error && (error.message || JSON.stringify(error));
      if (raw && /project.*region|not accessible|accessible in this region/i.test(raw)) {
        const msg = 'Appwrite project not accessible in this region. Verify VITE_APPWRITE_ENDPOINT matches your Appwrite project region and that the Project ID is correct.';
        console.error('RequestService :: createRequest :: region error:', raw);
        throw new Error(msg, { cause: error });
      }
      console.error('RequestService :: createRequest :: error', error);
      throw error;
    }
  },

  // Get active emergency requests
  getActiveRequests: async () => {
    try {
      validateConfig();
      return await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.requestsCollectionId,
        [Query.equal('status', 'active')]
      );
    } catch (error) {
      console.error('RequestService :: getActiveRequests :: error', error);
      if (error?.code === 401) {
        throw new Error('Request access is blocked by Appwrite permissions. Allow read access on the requests collection or request documents.', { cause: error });
      }
      throw error;
    }
  },

  // Update a request status
  updateRequestStatus: async (documentId, status) => {
    try {
      validateConfig();
      return await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.requestsCollectionId,
        documentId,
        { status }
      );
    } catch (error) {
      console.error('RequestService :: updateRequestStatus :: error', error);
      throw error;
    }
  }
};
