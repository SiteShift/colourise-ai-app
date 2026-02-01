import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL environment variable is not set")
}
if (!supabaseAnonKey) {
  throw new Error("EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is not set")
}

// Use Expo's secure storage for auth tokens (with web fallback)
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key)
    }
    return await SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value)
    } else {
      await SecureStore.setItemAsync(key, value)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key)
    } else {
      await SecureStore.deleteItemAsync(key)
    }
  },
}

// Create full Supabase client with auth, storage, and functions support
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
})

// Export auth separately for backward compatibility
export const auth = supabase.auth

// Export db for backward compatibility (points to Supabase's from method)
export const db = {
  from: (table: string) => supabase.from(table),
}

// Function to get authenticated database client
// Note: With full SDK, auth is automatically included in requests
// This function is kept for backward compatibility but may be simplified
export const getAuthenticatedDb = (accessToken?: string) => {
  if (accessToken) {
    // Create a client with the specific access token
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    })
  }
  return supabase
}

// Helper to convert local file URI to blob for upload
export const uriToBlob = async (uri: string): Promise<Blob> => {
  const response = await fetch(uri)
  return await response.blob()
}

// Storage service for image uploads (replaces the mock supabaseStorage)
export const storageService = {
  // Upload an image to Supabase Storage
  uploadImage: async (
    userId: string,
    imageUri: string,
    bucket: 'original-images' | 'colorized-images' = 'original-images'
  ): Promise<{ path: string; signedUrl: string }> => {
    const fileName = `${userId}/${Date.now()}.jpg`

    // Convert URI to blob
    const blob = await uriToBlob(imageUri)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, 3600)

    if (signedUrlError || !signedUrlData) {
      throw new Error(`Failed to create signed URL: ${signedUrlError?.message}`)
    }

    return {
      path: fileName,
      signedUrl: signedUrlData.signedUrl,
    }
  },

  // Get signed URL for an existing image
  getSignedUrl: async (
    bucket: 'original-images' | 'colorized-images',
    path: string,
    expiresIn: number = 3600
  ): Promise<string> => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error || !data) {
      throw new Error(`Failed to get signed URL: ${error?.message}`)
    }

    return data.signedUrl
  },

  // Delete an image from storage
  deleteImage: async (
    bucket: 'original-images' | 'colorized-images',
    path: string
  ): Promise<void> => {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }
  },

  // List all images for a user
  listUserImages: async (
    userId: string,
    bucket: 'original-images' | 'colorized-images' = 'colorized-images'
  ): Promise<{ name: string; created_at: string }[]> => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(userId, {
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error) {
      throw new Error(`List failed: ${error.message}`)
    }

    return data || []
  },
}

// Edge Functions service
export const functionsService = {
  // Invoke an edge function
  invoke: async <T = unknown>(
    functionName: string,
    body: Record<string, unknown>
  ): Promise<T> => {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    })

    if (error) {
      throw new Error(`Function ${functionName} failed: ${error.message}`)
    }

    return data as T
  },

  // Colorize an image
  colorize: async (storagePath: string): Promise<{
    success: boolean
    url: string
    creditsRemaining: number
  }> => {
    return functionsService.invoke('colorize', { storagePath })
  },

  // Enhance face in an image
  enhanceFace: async (storagePath: string): Promise<{
    success: boolean
    url: string
    creditsRemaining: number
  }> => {
    return functionsService.invoke('enhance-face', { storagePath })
  },

  // Upscale an image to 4K
  upscale: async (storagePath: string): Promise<{
    success: boolean
    url: string
    creditsRemaining: number
  }> => {
    return functionsService.invoke('upscale', { storagePath })
  },

  // Generate AI scene
  generateScene: async (
    storagePath: string,
    scene: string,
    customPrompt?: string
  ): Promise<{
    success: boolean
    url: string
    creditsRemaining: number
  }> => {
    return functionsService.invoke('generate-scene', {
      storagePath,
      scene,
      customPrompt,
    })
  },
}

// Type exports for use in other files
export type StorageService = typeof storageService
export type FunctionsService = typeof functionsService
