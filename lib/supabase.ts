import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const supabaseUrl = 'https://wnkxqkesotshizqedmxw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indua3hxa2Vzb3RzaGl6cWVkbXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NzgzNzEsImV4cCI6MjA2MzU1NDM3MX0.QqhqSlN1RSMY_YyqMHDtFxRD3EBKM4WJt8RI0TH8Wig'

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Completely disable realtime to prevent ws dependency
  realtime: {
    // These settings completely disable realtime connections
    heartbeatIntervalMs: 0,
    reconnectAfterMs: () => null,
    encode: () => '',
    decode: () => ({}),
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-mobile-auth-only'
    }
  },
  // Disable all database operations that might trigger realtime
  db: {
    schema: 'public'
  }
})

// Disable realtime entirely after client creation
if (supabase.realtime) {
  supabase.realtime.disconnect()
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