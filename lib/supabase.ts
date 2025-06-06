import { GoTrueClient } from '@supabase/gotrue-js'
import { PostgrestClient } from '@supabase/postgrest-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL environment variable is not set");
}
if (!supabaseAnonKey) {
  throw new Error("EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is not set");
}

// Use Expo's secure storage for auth tokens
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key)
    }
    return await SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value)
    } else {
      await SecureStore.setItemAsync(key, value)
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key)
    } else {
      await SecureStore.deleteItemAsync(key)
    }
  },
}

// Create separate auth client (no WebSocket dependencies)
export const auth = new GoTrueClient({
  url: `${supabaseUrl}/auth/v1`,
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  },
  autoRefreshToken: true,
  persistSession: true,
  storageKey: 'supabase.auth.token',
  storage: ExpoSecureStoreAdapter,
  fetch,
})

// Create database client (no WebSocket dependencies)
export const db = new PostgrestClient(`${supabaseUrl}/rest/v1`, {
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  },
  fetch,
})

// Function to get authenticated database client
export const getAuthenticatedDb = (accessToken?: string) => {
  if (accessToken) {
    return new PostgrestClient(`${supabaseUrl}/rest/v1`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      fetch,
    })
  }
  return db
}

// Function to update database client headers with user token
export const updateDbHeaders = (accessToken: string) => {
  // Update the global db client headers
  if (db && accessToken) {
    db.headers = {
      ...db.headers,
      Authorization: `Bearer ${accessToken}`,
    }
  }
}

// Compatibility wrapper for existing code
export const supabase = {
  auth,
  from: (table: string) => db.from(table),
  // Add other methods as needed
}

interface ImageMetadata {
  id: string;
  userId: string;
  imageUrl: string;
  createdAt: string;
}

// In-memory storage for demo purposes (keeping this until we set up proper database tables)
let imagesStorage: ImageMetadata[] = [];

export const supabaseStorage = {
  // Upload an image to "Supabase"
  uploadImage: async (userId: string, imageUri: string): Promise<ImageMetadata> => {
    try {
      // In a real implementation, you would:
      // 1. Upload the file to Supabase storage
      // 2. Get the URL of the uploaded file
      // 3. Store metadata in a Supabase table
      
      // For this mock, we'll just create a metadata entry with the original URI
      const metadata: ImageMetadata = {
        id: Date.now().toString(),
        userId,
        imageUrl: imageUri,
        createdAt: new Date().toISOString(),
      };
      
      imagesStorage.push(metadata);
      
      // Return the metadata
      return metadata;
    } catch (error) {
      console.error("Error uploading image to Supabase:", error);
      throw error;
    }
  },
  
  // Get all images for a user
  getUserImages: async (userId: string): Promise<ImageMetadata[]> => {
    try {
      // In a real implementation, you would query the Supabase table
      
      // For this mock, we'll filter the in-memory storage
      return imagesStorage.filter(img => img.userId === userId);
    } catch (error) {
      console.error("Error getting user images from Supabase:", error);
      throw error;
    }
  },
  
  // Delete an image
  deleteImage: async (imageId: string): Promise<void> => {
    try {
      // In a real implementation, you would:
      // 1. Delete the file from Supabase storage
      // 2. Delete the metadata from the Supabase table
      
      // For this mock, we'll just remove it from our in-memory storage
      imagesStorage = imagesStorage.filter(img => img.id !== imageId);
    } catch (error) {
      console.error("Error deleting image from Supabase:", error);
      throw error;
    }
  }
}; 