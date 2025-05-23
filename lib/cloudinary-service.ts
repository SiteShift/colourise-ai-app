import * as FileSystem from "expo-file-system";
import { CloudinaryImage } from "@cloudinary/url-gen";
import { upscale } from "@cloudinary/url-gen/actions/effect";

// Cloudinary configuration
const CLOUD_NAME = "dkamczgfw"; // Your Cloudinary cloud name
const API_KEY = "257874425119132"; // Add your API key
const UPLOAD_PRESET = "ai_colorizer"; // Custom upload preset

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  version: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  width: number;
  height: number;
  [key: string]: any;
}

export const CloudinaryService = {
  /**
   * Upload an image to Cloudinary
   */
  uploadImage: async (imageUri: string): Promise<CloudinaryUploadResponse | null> => {
    try {
      // Create form data for upload
      const formData = new FormData();
      const fileName = imageUri.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(fileName);
      const fileType = match ? `image/${match[1]}` : "image/jpeg";
      
      formData.append("file", {
        uri: imageUri,
        name: fileName,
        type: fileType,
      } as any);
      
      // Add API key for authentication
      formData.append("api_key", API_KEY);
      formData.append("upload_preset", UPLOAD_PRESET);
      
      console.log(`Uploading to Cloudinary with cloud_name: ${CLOUD_NAME}`);
      
      // Upload to Cloudinary
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        // Try to get more detailed error information
        const errorBody = await response.text();
        console.error(`Upload failed with status ${response.status}. Response: ${errorBody}`);
        throw new Error(`Upload failed with status ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      return null;
    }
  },
  
  /**
   * Apply the upscale effect to an image and get the enhanced URL
   */
  applyUpscaleEffect: (publicId: string): string => {
    const img = new CloudinaryImage(publicId, { cloudName: CLOUD_NAME });
    img.effect(upscale());
    const url = img.toURL();
    
    // For debugging, also construct a direct URL to compare
    const directUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/e_upscale/${publicId}`;
    
    console.log('Generated URL from SDK:', url);
    console.log('Direct upscale URL:', directUrl);
    
    // Return the direct URL as it's more reliable
    return directUrl;
  },
  
  /**
   * Process an image with face enhancement or upscaling
   * Returns the local URI of the enhanced image
   */
  enhanceImage: async (imageUri: string, isHdUpscaler: boolean = false): Promise<string> => {
    try {
      console.log(`Starting ${isHdUpscaler ? '4K upscaler' : 'face enhancement'} process`);
      
      // Upload the image to Cloudinary
      const uploadResult = await CloudinaryService.uploadImage(imageUri);
      
      if (!uploadResult || !uploadResult.public_id) {
        throw new Error("Failed to upload image to Cloudinary");
      }
      
      console.log('Upload successful, public_id:', uploadResult.public_id);
      
      // Apply upscale effect
      const enhancedUrl = CloudinaryService.applyUpscaleEffect(uploadResult.public_id);
      
      console.log('Downloading enhanced image from:', enhancedUrl);
      
      // Create a unique filename for the download
      const timestamp = new Date().getTime();
      const filePrefix = isHdUpscaler ? 'upscaled_image' : 'enhanced_face';
      const filePath = `${FileSystem.cacheDirectory}${filePrefix}_${timestamp}.jpg`;
      
      // Download the enhanced image
      const enhancedLocalUri = await FileSystem.downloadAsync(
        enhancedUrl,
        filePath
      );
      
      console.log('Download result:', JSON.stringify(enhancedLocalUri));
      
      if (enhancedLocalUri.status !== 200 || !enhancedLocalUri.uri) {
        throw new Error(`Failed to download enhanced image: ${enhancedLocalUri.status}`);
      }
      
      // Verify the file exists after download
      const fileInfo = await FileSystem.getInfoAsync(enhancedLocalUri.uri);
      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('Downloaded file does not exist or is empty');
      }
      
      console.log('Enhancement complete, local URI:', enhancedLocalUri.uri);
      return enhancedLocalUri.uri;
    } catch (error) {
      console.error("Error enhancing image:", error);
      throw error;
    }
  }
}; 