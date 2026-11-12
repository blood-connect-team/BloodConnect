import { databases, appwriteConfig } from './appwrite/config';
import { ID, Permission, Query, Role } from 'appwrite';
import { normalizeBloodGroup } from '../utils/bloodGroupNormalizer';

const validateConfig = () => {
  if (!appwriteConfig.databaseId || !appwriteConfig.donorsCollectionId) {
    throw new Error('Appwrite configuration incomplete. Please check your environment variables.');
  }
};

export const donorService = {
  // Create a new donor profile
  createDonor: async ({ name, bloodGroup, area, phone, email, available = true }) => {
    try {
      validateConfig();
      
      if (!name || !bloodGroup || !area || !phone || !email) {
        throw new Error('All donor fields are required');
      }

      return await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.donorsCollectionId,
        ID.unique(),
        { name, bloodGroup, area, phone, email, available },
        [Permission.read(Role.any())]
      );
    } catch (error) {
      // Provide clearer guidance for Appwrite region/project errors
      const raw = error && (error.message || JSON.stringify(error));
      if (raw && /project.*region|not accessible|accessible in this region/i.test(raw)) {
        const msg = 'Appwrite project not accessible in this region. Verify VITE_APPWRITE_ENDPOINT matches your Appwrite project region and that the Project ID is correct.';
        console.error('DonorService :: createDonor :: region error:', raw);
        throw new Error(msg, { cause: error });
      }
      console.error('DonorService :: createDonor :: error', error);
      throw error;
    }
  },

  // Get all donors, optionally filtered
  getDonors: async (queries = []) => {
    try {
      validateConfig();
      return await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.donorsCollectionId,
        queries
      );
    } catch (error) {
      console.error('DonorService :: getDonors :: error', error);
      if (error?.code === 401) {
        throw new Error('Donor lookup is blocked by Appwrite permissions. Allow read access on the donors collection or request documents.', { cause: error });
      }
      throw error;
    }
  },

  // Get matching donors by blood group and area directly from the database
  getMatchingDonors: async (bloodGroup, area) => {
    try {
      validateConfig();
      
      if (!bloodGroup || !area) {
        throw new Error('Blood group and area are required');
      }

      // Normalize the input blood group for comparison
      const normalizedSearchBlood = normalizeBloodGroup(bloodGroup);

      // Fetch all donors in the area
      const allDonorsInArea = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.donorsCollectionId,
        [
          Query.equal('area', area),
          Query.equal('available', true)
        ]
      );

      // Filter by normalized blood group in memory
      const matchingDonors = allDonorsInArea.documents.filter(donor => {
        const normalizedDonorBlood = normalizeBloodGroup(donor.bloodGroup);
        return normalizedDonorBlood === normalizedSearchBlood;
      });

      // Return in same format as listDocuments
      return {
        ...allDonorsInArea,
        documents: matchingDonors
      };
    } catch (error) {
      console.error('DonorService :: getMatchingDonors :: error', error);
      throw error;
    }
  }
};
