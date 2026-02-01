/**
 * @deprecated This service is deprecated. Use ProcessingService from './processing-service.ts' instead.
 *
 * Direct API calls to DeepAI have been moved to server-side Edge Functions
 * to protect API keys and enforce credit system.
 *
 * Migration:
 * - Old: await DeepAIService.colorizeImage(imageUri)
 * - New: await ProcessingService.colorize(imageUri, userId)
 */

export const DeepAIService = {
  /**
   * @deprecated Use ProcessingService.colorize() instead
   */
  colorizeImage: async (_imageUri: string): Promise<string> => {
    throw new Error(
      'DeepAIService.colorizeImage is deprecated. ' +
      'Use ProcessingService.colorize(imageUri, userId) instead. ' +
      'See lib/processing-service.ts'
    )
  },

  /**
   * @deprecated API keys are now managed server-side
   */
  getApiKey: (): string => {
    throw new Error(
      'DeepAIService.getApiKey is deprecated. ' +
      'API keys are now stored as Supabase secrets and used in Edge Functions.'
    )
  },
}
