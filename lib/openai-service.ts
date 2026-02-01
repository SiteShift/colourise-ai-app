/**
 * @deprecated This service is deprecated. Use ProcessingService from './processing-service.ts' instead.
 *
 * Direct API calls to OpenAI have been moved to server-side Edge Functions
 * to protect API keys and enforce credit system.
 *
 * Migration:
 * - Old: await OpenAIService.generateScene({ scene, customPrompt, originalImage })
 * - New: await ProcessingService.generateScene(imageUri, userId, scene, customPrompt)
 */

interface SceneGenerationOptions {
  scene: string
  customPrompt?: string
  originalImage: string
}

class OpenAIServiceClass {
  /**
   * @deprecated Use ProcessingService.generateScene() instead
   */
  async generateScene(_options: SceneGenerationOptions): Promise<string> {
    throw new Error(
      'OpenAIService.generateScene is deprecated. ' +
      'Use ProcessingService.generateScene(imageUri, userId, scene, customPrompt) instead. ' +
      'See lib/processing-service.ts'
    )
  }

  /**
   * @deprecated API keys are now managed server-side
   */
  setApiKey(_key: string): void {
    throw new Error(
      'OpenAIService.setApiKey is deprecated. ' +
      'API keys are now stored as Supabase secrets and used in Edge Functions.'
    )
  }

  /**
   * Pre-defined scene prompts (kept for reference)
   */
  static readonly SCENE_PROMPTS = {
    '1920s-newyork': '1920s New York speakeasy scene with authentic period clothing, Art Deco interior, jazz atmosphere',
    'ancient-rome': 'Ancient Roman scene as a noble citizen wearing toga, in the Roman Forum with classical architecture',
    'ww2': 'World War II era scene in 1940s military or civilian attire, period-appropriate setting',
    'cyberpunk': 'Futuristic cyberpunk city scene with neon lights, high-tech clothing, flying vehicles in background',
    'old-hollywood': 'Classic Hollywood golden age scene on a movie set, vintage glamour styling, black and white film aesthetic',
  }
}

const OpenAIService = new OpenAIServiceClass()
export default OpenAIService
