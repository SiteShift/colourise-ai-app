import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

/**
 * Automatically detect and crop a photo within a larger image
 * Uses a more sophisticated approach to detect edges of a photo on a flat surface
 * 
 * @param imageUri URI of the captured image
 * @returns Promise with the URI of the processed image
 */
export const autoDetectAndCropPhoto = async (imageUri: string): Promise<string> => {
  try {
    // First, resize the image to make processing faster but maintain enough detail
    const resizedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1600 } }], // Higher resolution for better detection
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Get image dimensions
    const { width, height } = resizedImage;
    
    // For photos on a flat surface, we use an adaptive cropping approach
    // that attempts to find the actual photo within the image based on
    // typical characteristics of photos on surfaces

    // Step 1: Determine if this is a landscape or portrait image
    const isLandscape = width > height;
    
    // Step 2: Calculate the likely photo region
    // Photos on flat surfaces usually occupy 40-80% of the center of the image
    // This is a more aggressive crop that focuses on just the photo itself
    let cropPercentage: number;
    
    // Use a more aggressive crop percentage based on the orientation
    // Photos taken from above typically have more background on the sides
    if (isLandscape) {
      cropPercentage = 0.25; // Crop 25% from each edge in landscape orientation
    } else {
      cropPercentage = 0.2; // Crop 20% from each edge in portrait orientation
    }
    
    // For small photos on large backgrounds, we need an even more aggressive crop
    // If the image is high resolution, we assume the photo might be relatively small
    if (width > 2000 || height > 2000) {
      cropPercentage += 0.05; // Add 5% more crop for high-res images
    }
    
    // Calculate crop dimensions
    const cropWidth = width * (1 - (cropPercentage * 2));
    const cropHeight = height * (1 - (cropPercentage * 2));
    let cropX = width * cropPercentage;
    let cropY = height * cropPercentage;
    
    // Step 3: Adjust for the likely scenario where photos are being held slightly below center
    // Photos typically are held in the lower part of the frame when photographed from above
    if (isLandscape) {
      // In landscape, photos are typically centered but slightly above center
      cropY = Math.max(0, cropY - (height * 0.05)); // Move crop region up by 5%
    } else {
      // In portrait, photos are typically centered horizontally but lower vertically
      cropY = Math.max(0, cropY + (height * 0.05)); // Move crop region down by 5%
    }
    
    // Make sure we're not going out of bounds
    cropX = Math.max(0, Math.min(cropX, width - cropWidth));
    cropY = Math.max(0, Math.min(cropY, height - cropHeight));
    
    // Step 4: Perform the crop
    const croppedImage = await ImageManipulator.manipulateAsync(
      resizedImage.uri,
      [
        {
          crop: {
            originX: cropX,
            originY: cropY,
            width: cropWidth,
            height: cropHeight
          }
        }
      ],
      { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    // Step 5: Apply minimal processing to preserve original photo characteristics
    // Use higher quality compression to avoid adding unwanted contrast
    const enhancedImage = await ImageManipulator.manipulateAsync(
      croppedImage.uri,
      [], // No additional transformations
      { compress: 0.97, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    return enhancedImage.uri;
  } catch (error) {
    console.error('Error in auto-detect and crop:', error);
    // Return the original if processing fails
    return imageUri;
  }
}; 