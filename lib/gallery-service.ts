import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { Alert, Platform } from "react-native";
import { supabaseStorage } from "./supabase";

// Storage key for local images - ensure this matches what's used in the app
const LOCAL_IMAGES_STORAGE_KEY = "colourised_images";
const CACHE_TIMESTAMP_KEY = "colourised_images_cache_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Cache for storing fetched images
let imagesCache: {
  timestamp: number;
  images: GalleryImage[];
  userId: string;
  isPremium: boolean;
} | null = null;

export interface GalleryImage {
  id: string;
  uri: string;
  date: string;
  isRemote?: boolean;
  title?: string; // Type of image: "Colorized", "Face Enhancement", etc.
}

export const GalleryService = {
  /**
   * Save an image to the device gallery and app storage
   */
  saveImageToDeviceGallery: async (imageUri: string): Promise<string> => {
    try {
      // Request media library permissions first (for Android)
      if (Platform.OS === "android") {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          throw new Error("Media library permission is required to save images");
        }
      }

      // Create a unique local file path with timestamp
      const timestamp = new Date().getTime();
      const fileUri = FileSystem.documentDirectory + "colourised_" + timestamp + ".jpg";

      // First check if the source file exists
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      console.log("Source file info:", JSON.stringify(fileInfo));
      
      let finalUri = imageUri;
      
      // If the URI is remote or doesn't exist locally, we need to download it
      if (imageUri.startsWith('http') || !fileInfo.exists) {
        try {
          // Download the image - this also works for local files as a copy operation
          console.log("Downloading/copying image to:", fileUri);
          const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri, {
            cache: false,
          });
          
          console.log("Download result:", JSON.stringify(downloadResult));
          
          if (downloadResult && downloadResult.status === 200) {
            finalUri = downloadResult.uri;
            
            // Verify the file was downloaded correctly
            const newFileInfo = await FileSystem.getInfoAsync(finalUri);
            if (!newFileInfo.exists || newFileInfo.size === 0) {
              throw new Error("Downloaded file is empty or does not exist");
            }
          } else {
            throw new Error(`Failed to download image: ${downloadResult ? downloadResult.status : 'null result'}`);
          }
        } catch (downloadError) {
          console.error("Error during download:", downloadError);
          // For HTTP URIs, try a different approach if download fails
          if (imageUri.startsWith('http')) {
            try {
              const fetchResponse = await fetch(imageUri);
              const blob = await fetchResponse.blob();
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              await new Promise((resolve) => {
                reader.onloadend = () => {
                  resolve(null);
                };
              });
              // Still use the original imageUri if we can't download it properly
            } catch (fetchError) {
              console.error("Error fetching image:", fetchError);
              // Continue with the original URI as fallback
            }
          }
        }
      }
      
      // Save to media library
      console.log("Saving to media library:", finalUri);
      try {
        const asset = await MediaLibrary.createAssetAsync(finalUri);
        console.log("Asset created:", asset ? "success" : "failed");
        
        if (!asset) {
          throw new Error("Failed to create asset in media library");
        }
        
        return finalUri;
      } catch (saveError) {
        console.error("Error creating asset in media library:", saveError);
        
        // Fallback for iOS - try saveToLibraryAsync as a last resort
        if (Platform.OS === 'ios') {
          console.log("Trying alternative saving method...");
          await MediaLibrary.saveToLibraryAsync(finalUri);
          return finalUri;
        }
        
        throw saveError;
      }
    } catch (error) {
      console.error("Error saving image to device gallery:", error);
      throw error;
    }
  },

  /**
   * Save image to local app storage
   */
  saveImageToLocalGallery: async (imageUri: string, title: string = "Colorized"): Promise<void> => {
    try {
      console.log("Saving image to local gallery:", imageUri.substring(0, 50) + "...");
      
      // Get existing saved images
      const savedImagesJson = await AsyncStorage.getItem(LOCAL_IMAGES_STORAGE_KEY);
      console.log("Existing saved images JSON:", savedImagesJson ? "Found data" : "No existing data");
      
      let savedImages: GalleryImage[] = savedImagesJson ? JSON.parse(savedImagesJson) : [];
      console.log("Existing saved images count:", savedImages.length);

      // Always save a copy to the documents directory (not cache) for persistence
      const timestamp = new Date().getTime();
      const fileName = `gallery_image_${timestamp}.jpg`;
      const documentsPath = `${FileSystem.documentDirectory}${fileName}`;
      
      try {
        console.log("Copying image to documents directory:", documentsPath);
        const copyResult = await FileSystem.copyAsync({
          from: imageUri,
          to: documentsPath
        });
        
        console.log("Image copied to documents directory successfully");
        
        // Add new image to the list with the documents path
        const newImage: GalleryImage = {
          id: timestamp.toString(),
          uri: documentsPath,
          date: new Date().toLocaleDateString(),
          isRemote: false,
          title: title
        };
        
        console.log("Created new image entry with ID:", newImage.id);
        console.log("New image URI:", newImage.uri);
        console.log("Image title:", newImage.title);

        savedImages = [newImage, ...savedImages];
        console.log("New total images count:", savedImages.length);

        // Save updated list
        const jsonToSave = JSON.stringify(savedImages);
        console.log("Saving JSON to AsyncStorage, length:", jsonToSave.length);
        
        await AsyncStorage.setItem(LOCAL_IMAGES_STORAGE_KEY, jsonToSave);
        console.log("Successfully saved to AsyncStorage");
        
        // Verify storage immediately after saving
        const verifyJson = await AsyncStorage.getItem(LOCAL_IMAGES_STORAGE_KEY);
        if (verifyJson) {
          const verifyImages = JSON.parse(verifyJson);
          console.log("Verification: Found", verifyImages.length, "images in AsyncStorage");
          console.log("Verification: First image URI:", verifyImages[0]?.uri);
        } else {
          console.error("Verification failed: Could not retrieve saved images from AsyncStorage");
        }
      } catch (copyError) {
        console.error("Error copying image to documents directory:", copyError);
        throw copyError;
      }
    } catch (error) {
      console.error("Error saving to local gallery:", error);
      throw error;
    }
  },

  /**
   * Save image to remote storage (Supabase) for premium users
   */
  saveImageToRemoteGallery: async (userId: string, imageUri: string): Promise<void> => {
    try {
      // Upload to "Supabase"
      await supabaseStorage.uploadImage(userId, imageUri);
    } catch (error) {
      console.error("Error saving to remote gallery:", error);
      throw error;
    }
  },

  /**
   * Clear the images cache
   */
  clearCache: () => {
    imagesCache = null;
  },

  /**
   * Get all images for the current user with caching
   */
  getAllImages: async (userId: string, isPremium: boolean): Promise<GalleryImage[]> => {
    try {
      console.log("getAllImages called for userId:", userId);
      
      // Check if we have a valid cache
      if (imagesCache && 
          imagesCache.userId === userId && 
          imagesCache.isPremium === isPremium && 
          (Date.now() - imagesCache.timestamp) < CACHE_DURATION) {
        console.log("Using cached gallery images, count:", imagesCache.images.length);
        return imagesCache.images;
      }

      // Get local images
      const savedImagesJson = await AsyncStorage.getItem(LOCAL_IMAGES_STORAGE_KEY);
      console.log("Raw saved images JSON:", savedImagesJson ? `${savedImagesJson.substring(0, 100)}...` : "null");
      
      const localImages: GalleryImage[] = savedImagesJson ? JSON.parse(savedImagesJson) : [];
      console.log("Parsed local images count:", localImages.length);
      
      // For premium users, also get remote images
      let allImages = [...localImages];
      
      if (isPremium) {
        try {
          console.log("Fetching remote images for premium user");
          const remoteImages = await supabaseStorage.getUserImages(userId);
          console.log("Remote images count:", remoteImages.length);
          
          // Convert remote images to GalleryImage format
          const formattedRemoteImages: GalleryImage[] = remoteImages.map(img => ({
            id: img.id,
            uri: img.imageUrl,
            date: new Date(img.createdAt).toLocaleDateString(),
            isRemote: true
          }));
          
          // Combine local and remote images, removing duplicates
          formattedRemoteImages.forEach(remoteImg => {
            const isDuplicate = localImages.some(localImg => 
              localImg.uri === remoteImg.uri || 
              localImg.uri.includes(remoteImg.uri) ||
              remoteImg.uri.includes(localImg.uri)
            );
            
            if (!isDuplicate) {
              allImages.push(remoteImg);
            }
          });
        } catch (error) {
          console.error("Error fetching remote images:", error);
        }
      }
      
      // Sort by date (newest first)
      allImages = allImages.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      console.log("Total images after combining local and remote:", allImages.length);

      // Update cache
      imagesCache = {
        timestamp: Date.now(),
        images: allImages,
        userId,
        isPremium
      };
      
      return allImages;
    } catch (error) {
      console.error("Error getting all images:", error);
      return [];
    }
  },

  /**
   * Delete an image
   */
  deleteImage: async (image: GalleryImage, userId: string, isPremium: boolean): Promise<void> => {
    try {
      // If it's a remote image, delete from remote storage
      if (image.isRemote && isPremium) {
        await supabaseStorage.deleteImage(image.id);
      }
      
      // Always delete from local storage
      const savedImagesJson = await AsyncStorage.getItem(LOCAL_IMAGES_STORAGE_KEY);
      let savedImages: GalleryImage[] = savedImagesJson ? JSON.parse(savedImagesJson) : [];
      
      savedImages = savedImages.filter(img => img.id !== image.id);
      
      await AsyncStorage.setItem(LOCAL_IMAGES_STORAGE_KEY, JSON.stringify(savedImages));
      
      // Clear the cache after deletion
      GalleryService.clearCache();
      
      Alert.alert("Success", "Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      Alert.alert("Delete Failed", "Failed to delete image. Please try again.");
      throw error;
    }
  },

  /**
   * Save image based on user's subscription type
   */
  saveImage: async (
    imageUri: string, 
    userId: string, 
    isPremium: boolean,
    showAlert: boolean = true,
    title: string = "Colorized"
  ): Promise<void> => {
    try {
      console.log("Starting saveImage process with URI:", imageUri.substring(0, 50) + "...");
      
      // Track success status of each operation
      let savedToDeviceGallery = false;
      let savedToLocalGallery = false;
      let savedToRemoteGallery = false;
      let localUri = imageUri;
      
      // Step 1: Try to save to device gallery
      try {
        localUri = await GalleryService.saveImageToDeviceGallery(imageUri);
        savedToDeviceGallery = true;
        console.log("Successfully saved to device gallery");
      } catch (galleryError) {
        console.error("Error saving to device gallery:", galleryError);
        // Continue with other operations even if this fails
      }
      
      // Step 2: Always try to save to local gallery list
      try {
        await GalleryService.saveImageToLocalGallery(localUri, title);
        savedToLocalGallery = true;
        console.log("Successfully saved to local gallery");
      } catch (localError) {
        console.error("Error saving to local gallery:", localError);
        // If local gallery fails, this is more serious but we'll still try remote
      }
      
      // Step 3: For premium users, also try to save to remote storage
      if (isPremium) {
        try {
          await GalleryService.saveImageToRemoteGallery(userId, localUri);
          savedToRemoteGallery = true;
          console.log("Successfully saved to remote gallery");
        } catch (remoteError) {
          console.error("Error saving to remote gallery:", remoteError);
          // Non-critical if this fails
        }
      }
      
      // Clear the cache after saving image
      GalleryService.clearCache();
      
      // Show appropriate success message based on what worked if showAlert is true
      if (showAlert && (savedToDeviceGallery || savedToLocalGallery)) {
        let message = "Image saved";
        if (savedToDeviceGallery) {
          message += " to device gallery";
        }
        if (savedToLocalGallery && !savedToDeviceGallery) {
          message += " to app only";
        }
        if (isPremium && savedToRemoteGallery) {
          message += " and cloud backup";
        }
        
        Alert.alert("Success", message);
        return; // Success case
      }
      
      // If we get here and nothing was saved successfully, it's an error
      if (!savedToDeviceGallery && !savedToLocalGallery) {
        throw new Error("Failed to save image to any storage location");
      }
    } catch (error) {
      console.error("Error in saveImage:", error);
      if (showAlert) {
        Alert.alert(
          "Save Failed", 
          "Failed to save image. Please try again."
        );
      }
      throw error;
    }
  },
}; 