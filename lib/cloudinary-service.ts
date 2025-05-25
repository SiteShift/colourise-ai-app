import * as FileSystem from "expo-file-system";
import { CloudinaryImage } from "@cloudinary/url-gen";
import { upscale } from "@cloudinary/url-gen/actions/effect";

// Cloudinary configuration
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY;
const UPLOAD_PRESET = "ai_colorizer"; // Custom upload preset

// Validate environment variables
if (!CLOUD_NAME) {
  throw new Error("EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable is not set");
}
if (!API_KEY) {
  throw new Error("EXPO_PUBLIC_CLOUDINARY_API_KEY environment variable is not set");
}

// Method to set API key (kept for backward compatibility)
export const setCloudinaryApiKey = (key: string) => {
  // API_KEY = key; // No longer needed since we use environment variables
};

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
      
      // Check image dimensions before uploading for 4K upscaler
      if (isHdUpscaler) {
        try {
          // Get image info to check dimensions
          const fileInfo = await FileSystem.getInfoAsync(imageUri);
          if (fileInfo.exists && fileInfo.size) {
            // If file is larger than 8MB, it's likely already high resolution
            if (fileInfo.size > 8 * 1024 * 1024) {
              throw new Error("Image is already high resolution and cannot be upscaled further. Try using a smaller or lower resolution image.");
            }
          }
        } catch (sizeError) {
          console.warn("Could not check image size, proceeding with upload:", sizeError);
        }
      }
      
      // Upload the image to Cloudinary
      const uploadResult = await CloudinaryService.uploadImage(imageUri);
      
      if (!uploadResult || !uploadResult.public_id) {
        throw new Error("Failed to upload image to Cloudinary");
      }
      
      console.log('Upload successful, public_id:', uploadResult.public_id);
      
      // Additional check for 4K upscaler based on uploaded image dimensions
      if (isHdUpscaler && uploadResult.width && uploadResult.height) {
        const megapixels = (uploadResult.width * uploadResult.height) / 1000000;
        console.log(`Image dimensions: ${uploadResult.width}x${uploadResult.height} (${megapixels.toFixed(1)} MP)`);
        
        if (megapixels > 4.2) {
          throw new Error(`Image is too large for 4K upscaling (${megapixels.toFixed(1)} megapixels). The maximum supported size is 4.2 megapixels. Try using Face Enhancement instead, which works with larger images.`);
        }
      }
      
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
        // Provide more specific error message for 4K upscaler
        if (isHdUpscaler && enhancedLocalUri.status === 400) {
          throw new Error("Image is too large for 4K upscaling. Try using Face Enhancement instead, which works with larger images.");
        }
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