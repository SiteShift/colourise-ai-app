// DeepAI API configuration
const DEEPAI_API_KEY = process.env.EXPO_PUBLIC_DEEPAI_API_KEY; // Get from environment variables

export const DeepAIService = {
  /**
   * Get the DeepAI API key
   */
  getApiKey: (): string => {
    if (!DEEPAI_API_KEY) {
      throw new Error("EXPO_PUBLIC_DEEPAI_API_KEY environment variable is not set");
    }
    return DEEPAI_API_KEY;
  },

  /**
   * Colorize an image using DeepAI API
   */
  colorizeImage: async (imageUri: string): Promise<string> => {
    try {
      // Check if API key is available
      if (!DEEPAI_API_KEY) {
        throw new Error("DeepAI API key is not configured. Please check your environment variables.");
      }

      // Create form data for basic colorization
      const formData = new FormData();
      const fileName = imageUri.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(fileName);
      const fileType = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("image", {
        uri: imageUri,
        name: fileName,
        type: fileType,
      } as any);

      console.log("Making API request to DeepAI with API key:", DEEPAI_API_KEY ? DEEPAI_API_KEY.substring(0, 10) + "..." : "undefined");

      const response = await fetch("https://api.deepai.org/api/colorizer", {
        method: "POST",
        headers: {
          "api-key": DEEPAI_API_KEY,
        },
        body: formData,
      });

      console.log("API response status:", response.status);
      const data = await response.json();
      console.log("API response data:", data);

      if (data.output_url) {
        return data.output_url;
      } else if (response.status === 401) {
        throw new Error("Invalid API key. Please check your DeepAI API key configuration.");
      } else if (response.status === 402) {
        throw new Error("DeepAI API quota exceeded. Please check your DeepAI account.");
      } else {
        throw new Error(data.message || `API error: ${response.status} - Colourisation failed`);
      }
    } catch (error) {
      console.error("Error colourising image:", error);
      throw error;
    }
  }
}; 