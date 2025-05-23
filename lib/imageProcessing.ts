import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

interface ImageEnhancementOptions {
  enhancedColors?: boolean;
  hdResolution?: boolean;
}

/**
 * Enhances image quality for better colorization results
 * with premium features support
 */
export const enhanceImageForColorization = async (
  imageUri: string,
  options: ImageEnhancementOptions = {}
): Promise<string> => {
  try {
    let operations: ImageManipulator.Action[] = [];
    let quality = 0.98;
    let targetWidth = 1200;

    // HD Resolution Processing
    if (options.hdResolution) {
      targetWidth = 2048; // Increase resolution for HD
      quality = 0.99; // Higher quality compression
    }

    // Add resize operation
    operations.push({ 
      resize: { 
        width: targetWidth 
      } 
    });

    // Enhanced Colors Processing
    if (options.enhancedColors) {
      operations.push(
        { contrast: 1.1 }, // Slightly increase contrast
        { saturate: 1.2 }, // Boost saturation for more vivid colors
        { brightness: 1.05 } // Subtle brightness boost
      );
    }
    
    // Process the image with the selected operations
    const processedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      operations,
      { 
        compress: quality, 
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );
    
    return processedImage.uri;
  } catch (error) {
    console.error("Error enhancing image:", error);
    return imageUri; // Return original if enhancement fails
  }
};

/**
 * Specialized enhancement for scanned photos with premium features
 */
export const enhanceScannedPhotoForColorization = async (
  imageUri: string,
  options: ImageEnhancementOptions = {}
): Promise<string> => {
  try {
    let operations: ImageManipulator.Action[] = [];
    let quality = 0.98;
    let targetWidth = 1200;

    // HD Resolution Processing
    if (options.hdResolution) {
      targetWidth = 2048;
      quality = 0.99;
    }

    // Basic resize operation
    operations.push({ 
      resize: { 
        width: targetWidth 
      } 
    });

    // Enhanced Colors Processing for scanned photos
    if (options.enhancedColors) {
      operations.push(
        { contrast: 1.15 }, // Stronger contrast for scanned photos
        { saturate: 1.25 }, // Higher saturation for faded scans
        { brightness: 1.08 } // Compensate for scan darkness
      );
    }
    
    // Process the image
    const processedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      operations,
      { 
        compress: quality, 
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );
    
    return processedImage.uri;
  } catch (error) {
    console.error("Error enhancing scanned photo:", error);
    return imageUri;
  }
};

/**
 * Determines if an image is already grayscale
 * This is a basic check that might not catch all cases
 * 
 * @param imageUri URI of the image to check
 * @returns Promise<boolean> True if the image appears to be grayscale
 */
export const isGrayscaleImage = async (imageUri: string): Promise<boolean> => {
  // This would require more advanced image analysis
  // For now, we'll assume all images need processing
  return false;
}; 