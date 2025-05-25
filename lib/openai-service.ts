import * as FileSystem from "expo-file-system";
import { encode } from "base64-arraybuffer";

interface SceneGenerationOptions {
  scene: string;
  customPrompt?: string;
  originalImage: string;
}

class OpenAIService {
  // Get OpenAI API key from environment variables
  private apiKey: string = process.env.EXPO_PUBLIC_OPENAI_API_KEY!;

  /**
   * Sets the API key - call this method to configure the API key
   */
  setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Converts an image URI to base64 format
   */
  private async imageToBase64(uri: string): Promise<string> {
    try {
      let localUri = uri;
      
      // If it's a remote URL, download it first
      if (uri.startsWith('http')) {
        console.log("Downloading remote image for base64 conversion:", uri.substring(0, 50) + "...");
        const timestamp = new Date().getTime();
        const downloadPath = FileSystem.cacheDirectory + 'temp_scene_input_' + timestamp + '.jpg';
        
        const downloadResult = await FileSystem.downloadAsync(uri, downloadPath);
        
        if (downloadResult.status !== 200) {
          throw new Error(`Failed to download image: ${downloadResult.status}`);
        }
        
        localUri = downloadResult.uri;
        console.log("Successfully downloaded to:", localUri.substring(0, 50) + "...");
      }

      // Convert local file to base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return base64;
    } catch (error) {
      console.error("Error converting image to base64:", error);
      throw error;
    }
  }

  /**
   * Generate a scene with the person from the original image
   */
  async generateScene(options: SceneGenerationOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not set");
    }

    const { scene, customPrompt, originalImage } = options;

    try {
      // Convert image to base64
      const base64Image = await this.imageToBase64(originalImage);

      // Build the prompt with required prefix
      const requiredPrefix = `EDUCATIONAL/CREATIVE DISCLAIMER: This is a creative, educational image transformation project. The input image is an AI-generated colorized image created for artistic and educational purposes only. This process is used for historical recreation, costume design education, and creative storytelling.

CRITICAL REQUIREMENT: You MUST create an image with the EXACT SAME PERSON from the reference photo. This person's identity is PARAMOUNT and must be preserved perfectly.

IDENTITY PRESERVATION RULES:
- The person's face must be IDENTICAL: same facial structure, features, skin tone, age, and expression
- The person's body type, height, and proportions must remain EXACTLY the same
- The person's hair color, texture, and style should remain consistent unless the scene specifically requires period-appropriate styling
- The person's skin tone and complexion must be preserved exactly
- Only change their clothing/costume to fit the scene - NEVER change their physical appearance
- The person should be the clear main subject and focus of the image

WHAT CAN CHANGE: Only the clothing, accessories, and background environment to match the scene
WHAT CANNOT CHANGE: The person's face, body, skin tone, basic physical characteristics, or identity

The person in the generated image must look like the same individual could step from one image into the other with just a costume change.`;
      
      const scenePrompt = customPrompt || scene;
      const fullPrompt = `${requiredPrefix}\n\nScene: ${scenePrompt}`;

      // Use the Responses API with gpt-image-1
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: fullPrompt,
                },
                {
                  type: "input_image",
                  image_url: `data:image/jpeg;base64,${base64Image}`,
                }
              ],
            }
          ],
          tools: [
            {
              type: "image_generation",
              quality: "high",
              size: "1024x1024",
              moderation: "low",
            }
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to generate image");
      }

      const data = await response.json();
      
      // Extract the generated image from the response
      const imageGenerationCalls = data.output?.filter(
        (output: any) => output.type === "image_generation_call"
      );

      if (!imageGenerationCalls || imageGenerationCalls.length === 0) {
        throw new Error("No image was generated");
      }

      const imageBase64 = imageGenerationCalls[0].result;
      
      // Save the base64 image to a local file
      const fileName = `scene_${Date.now()}.jpg`;
      const fileUri = FileSystem.cacheDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, imageBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return fileUri;
    } catch (error) {
      console.error("Error generating scene:", error);
      throw error;
    }
  }

  /**
   * Pre-defined scene prompts
   */
  static readonly SCENE_PROMPTS = {
    "1920s-newyork": "1920s New York speakeasy scene with authentic period clothing, Art Deco interior, jazz atmosphere",
    "ancient-rome": "Ancient Roman scene as a noble citizen wearing toga, in the Roman Forum with classical architecture",
    "ww2": "World War II era scene in 1940s military or civilian attire, period-appropriate setting",
    "cyberpunk": "Futuristic cyberpunk city scene with neon lights, high-tech clothing, flying vehicles in background",
    "old-hollywood": "Classic Hollywood golden age scene on a movie set, vintage glamour styling, black and white film aesthetic",
  };
}

export default new OpenAIService(); 