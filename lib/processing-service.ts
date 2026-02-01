/**
 * Processing Service
 *
 * Handles all image processing operations through Supabase Edge Functions.
 * This replaces direct API calls to DeepAI, Cloudinary, and OpenAI.
 *
 * Flow:
 * 1. Upload image to Supabase Storage
 * 2. Invoke Edge Function with storage path
 * 3. Edge Function processes image server-side (with server-side API keys)
 * 4. Edge Function returns result URL and updated credit count
 */

import { supabase, storageService } from './supabase'
import * as FileSystem from 'expo-file-system'

// Response type from Edge Functions
interface ProcessingResult {
  success: boolean
  url: string
  storagePath: string
  creditsUsed: number
  creditsRemaining: number
}

interface ProcessingError {
  error: string
  message?: string
  creditsRequired?: number
  creditsAvailable?: number
  creditsRefunded?: boolean
}

type ProcessingResponse = ProcessingResult | ProcessingError

function isError(response: ProcessingResponse): response is ProcessingError {
  return 'error' in response
}

/**
 * Upload a local image to Supabase Storage
 */
async function uploadForProcessing(
  imageUri: string,
  userId: string
): Promise<string> {
  // If it's already a remote URL, we need to download it first
  let localUri = imageUri

  if (imageUri.startsWith('http')) {
    const timestamp = Date.now()
    const downloadPath = `${FileSystem.cacheDirectory}temp_upload_${timestamp}.jpg`

    const downloadResult = await FileSystem.downloadAsync(imageUri, downloadPath)
    if (downloadResult.status !== 200) {
      throw new Error('Failed to download image for processing')
    }
    localUri = downloadResult.uri
  }

  // Upload to Storage
  const { path } = await storageService.uploadImage(userId, localUri, 'original-images')
  return path
}

/**
 * Invoke an Edge Function and handle response
 */
async function invokeFunction(
  functionName: string,
  body: Record<string, unknown>
): Promise<ProcessingResult> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  })

  if (error) {
    throw new Error(`Function error: ${error.message}`)
  }

  const response = data as ProcessingResponse

  if (isError(response)) {
    // Handle specific error cases
    if (response.error === 'Insufficient credits') {
      throw new Error(
        `Insufficient credits. Required: ${response.creditsRequired}, Available: ${response.creditsAvailable}`
      )
    }
    if (response.error === 'Rate limit exceeded') {
      throw new Error('Rate limit exceeded. Please wait before trying again.')
    }
    throw new Error(response.message || response.error)
  }

  return response
}

/**
 * Colorize a black & white image
 * Cost: 1 credit
 */
export async function colorizeImage(
  imageUri: string,
  userId: string
): Promise<ProcessingResult> {
  // 1. Upload image to Storage
  const storagePath = await uploadForProcessing(imageUri, userId)

  // 2. Invoke colorize Edge Function
  const result = await invokeFunction('colorize', { storagePath })

  return result
}

/**
 * Enhance facial details in an image
 * Cost: 3 credits
 */
export async function enhanceFace(
  imageUri: string,
  userId: string
): Promise<ProcessingResult> {
  // For face enhancement, the image might already be in colorized-images bucket
  // Check if it's a storage path or a local URI
  let storagePath: string

  if (imageUri.startsWith('http') || imageUri.startsWith('file://')) {
    // It's a URL or local file, upload it
    storagePath = await uploadForProcessing(imageUri, userId)
  } else {
    // Assume it's already a storage path
    storagePath = imageUri
  }

  const result = await invokeFunction('enhance-face', { storagePath })

  return result
}

/**
 * Upscale an image to higher resolution
 * Cost: 5 credits
 */
export async function upscaleImage(
  imageUri: string,
  userId: string,
  scale: 1 | 2 | 4 = 2
): Promise<ProcessingResult> {
  let storagePath: string

  if (imageUri.startsWith('http') || imageUri.startsWith('file://')) {
    storagePath = await uploadForProcessing(imageUri, userId)
  } else {
    storagePath = imageUri
  }

  const result = await invokeFunction('upscale', { storagePath, scale })

  return result
}

/**
 * Generate an AI scene transformation
 * Cost: 10 credits
 */
export async function generateScene(
  imageUri: string,
  userId: string,
  scene: string,
  customPrompt?: string
): Promise<ProcessingResult> {
  let storagePath: string

  if (imageUri.startsWith('http') || imageUri.startsWith('file://')) {
    storagePath = await uploadForProcessing(imageUri, userId)
  } else {
    storagePath = imageUri
  }

  const result = await invokeFunction('generate-scene', {
    storagePath,
    scene,
    customPrompt,
  })

  return result
}

/**
 * Processing service object for easier importing
 */
export const ProcessingService = {
  colorize: colorizeImage,
  enhanceFace,
  upscale: upscaleImage,
  generateScene,
}

export default ProcessingService
