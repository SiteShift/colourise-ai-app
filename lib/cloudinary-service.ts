/**
 * @deprecated This service is deprecated. Use ProcessingService from './processing-service.ts' instead.
 *
 * Direct API calls to Cloudinary have been moved to server-side Edge Functions
 * to protect API keys and enforce credit system.
 *
 * Migration:
 * - Old: await CloudinaryService.enhanceImage(imageUri, isUpscale)
 * - New: await ProcessingService.enhanceFace(imageUri, userId)
 * - New: await ProcessingService.upscale(imageUri, userId, scale)
 */

export interface CloudinaryUploadResponse {
  public_id: string
  secure_url: string
  url: string
  version: number
  format: string
  resource_type: string
  created_at: string
  bytes: number
  width: number
  height: number
  [key: string]: unknown
}

/**
 * @deprecated Use ProcessingService instead
 */
export const setCloudinaryApiKey = (_key: string): void => {
  throw new Error(
    'setCloudinaryApiKey is deprecated. ' +
    'API keys are now stored as Supabase secrets and used in Edge Functions.'
  )
}

export const CloudinaryService = {
  /**
   * @deprecated Use ProcessingService.enhanceFace() or ProcessingService.upscale() instead
   */
  enhanceImage: async (_imageUri: string, _isHdUpscaler: boolean = false): Promise<string> => {
    throw new Error(
      'CloudinaryService.enhanceImage is deprecated. ' +
      'Use ProcessingService.enhanceFace(imageUri, userId) or ProcessingService.upscale(imageUri, userId, scale) instead. ' +
      'See lib/processing-service.ts'
    )
  },

  /**
   * @deprecated Use storageService.uploadImage() instead for uploads
   */
  uploadImage: async (_imageUri: string): Promise<CloudinaryUploadResponse | null> => {
    throw new Error(
      'CloudinaryService.uploadImage is deprecated. ' +
      'Use storageService.uploadImage() from lib/supabase.ts instead.'
    )
  },

  /**
   * @deprecated No longer needed - transformations happen server-side
   */
  applyUpscaleEffect: (_publicId: string): string => {
    throw new Error(
      'CloudinaryService.applyUpscaleEffect is deprecated. ' +
      'Image transformations now happen server-side in Edge Functions.'
    )
  },
}
