import React, { useState, useEffect, useCallback } from "react"
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Modal, 
  Alert,
  Animated,
  Dimensions,
  Easing
} from "react-native"
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from "react-native-safe-area-context"
import { Feather } from "@expo/vector-icons"
import { useAuth } from "../context/auth-context"
import { useSubscription } from "../context/subscription-context"
import { GalleryImage, GalleryService } from "../lib/gallery-service"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import * as Haptics from "expo-haptics"
import { useFocusEffect } from "@react-navigation/native"

const blurhash = 'L000000000000000000000000000';
const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = (width - 40) / 2; // Calculate thumbnail size based on screen width

// Skeleton loader component for gallery items
const SkeletonItem = ({ index }: { index: number }) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    const animateSkeleton = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        })
      ]).start(animateSkeleton);
    };
    
    animateSkeleton();
    
    return () => {
      opacity.stopAnimation();
    };
  }, [opacity]);
  
  const delay = index * 150;
  
  return (
    <Animated.View 
      style={[
        styles.imageItem, 
        { opacity }
      ]}
    >
      <View style={styles.skeletonThumbnail} />
      <View style={styles.imageInfo}>
        <View style={styles.skeletonText} />
      </View>
    </Animated.View>
  );
};

export default function GalleryScreen() {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { user } = useAuth()
  const { isPremium } = useSubscription()
  
  // Animation for empty state
  const emptyAnim = React.useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (!isLoading && galleryImages.length === 0) {
      Animated.spring(emptyAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      }).start();
    }
  }, [isLoading, galleryImages.length]);

  const loadGalleryImages = useCallback(async (forceRefresh = false) => {
    try {
      if (!user) {
        setGalleryImages([])
        return
      }

      if (forceRefresh) {
        // Clear the cache when forcing a refresh
        GalleryService.clearCache()
      }

      console.log("Loading gallery images for user:", user.id);
      console.log("isPremium:", isPremium);
      
      const images = await GalleryService.getAllImages(user.id, isPremium)
      
      console.log(`Found ${images.length} images in gallery`);
      if (images.length > 0) {
        console.log("First 3 image URIs:");
        images.slice(0, 3).forEach((img, index) => {
          console.log(`Image ${index + 1}: ${img.uri.substring(0, 50)}...`);
        });
      }
      
      setGalleryImages(images)
    } catch (error) {
      console.error("Error loading gallery images:", error)
      Alert.alert("Error", "Failed to load gallery images")
    }
  }, [user, isPremium])

  // Initial load
  useEffect(() => {
    const loadInitial = async () => {
      setIsLoading(true)
      // Clear cache on initial load to ensure we always have fresh data
      GalleryService.clearCache()
      await loadGalleryImages(true) // Force refresh on initial load
      setIsLoading(false)
    }
    loadInitial()
  }, [loadGalleryImages])

  // Add focus effect to reload gallery when screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log("Gallery screen focused, reloading images");
      // Always refresh when coming from another screen
      GalleryService.clearCache(); // Forcibly clear cache
      loadGalleryImages(true); // Always force refresh on focus
    }, [loadGalleryImages])
  );

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadGalleryImages(true) // Force refresh
    setIsRefreshing(false)
  }

  const openImage = (image: GalleryImage) => {
    setSelectedImage(image)
    setModalVisible(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const deleteImage = async () => {
    if (!selectedImage || !user) return

    // Show confirmation dialog
    Alert.alert(
      "Delete Image",
      "Are you sure you want to delete this image?",
      [
        {
          text: "Keep",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await GalleryService.deleteImage(selectedImage, user.id, isPremium)
              
              // Update local state
              setGalleryImages(current => 
                current.filter(img => img.id !== selectedImage.id)
              )
              
              // Close modal
              setModalVisible(false)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error("Error deleting image:", error)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          }
        }
      ]
    );
  }

  const shareImage = async () => {
    if (!selectedImage) return

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // First make sure we have a local file to share
      let fileUri = selectedImage.uri;
      
      // If it's a remote image, download it first
      if (selectedImage.isRemote || selectedImage.uri.startsWith('http')) {
        const tempFile = `${FileSystem.cacheDirectory}share_image_${Date.now()}.jpg`;
        
        // Show loading indicator
        Alert.alert("Preparing to share", "Downloading image...");
        
        try {
          const { status } = await FileSystem.downloadAsync(selectedImage.uri, tempFile);
          
          if (status === 200) {
            fileUri = tempFile;
          } else {
            throw new Error(`Failed to download with status ${status}`);
          }
        } catch (downloadError) {
          console.error("Error downloading for sharing:", downloadError);
          Alert.alert("Error", "Failed to prepare image for sharing");
          return;
        }
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Sharing not available", "Sharing is not available on this device");
        return;
      }

      // Share the image with a nice message
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/jpeg',
        dialogTitle: `Share your ${selectedImage.title || 'Colorized'} image`,
        UTI: 'public.jpeg'
      });
      
      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error sharing image:", error);
      Alert.alert("Share Failed", "Failed to share image");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  const saveToDevice = async () => {
    if (!selectedImage) return

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const localUri = await GalleryService.saveImageToDeviceGallery(selectedImage.uri)
      Alert.alert("Success", "Image saved to device gallery")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error saving to device:", error)
      Alert.alert("Save Failed", "Failed to save image to device gallery")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  // Enhanced gallery item with animation
  const GalleryListItem = React.memo(({ 
    item, 
    onPress,
    index
  }: { 
    item: GalleryImage, 
    onPress: (item: GalleryImage) => void,
    index: number
  }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const [imageError, setImageError] = useState(false);
    
    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      }).start();
    };
    
    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      }).start();
    };

    useEffect(() => {
      // Log the image URI for debugging
      console.log(`Gallery image ${index} URI: ${item.uri}`);
    }, [item.uri, index]);
    
    // Calculate item width based on screen width
    const itemWidth = (width - 40) / 2; // 2 columns with padding
    
    return (
      <Animated.View 
        style={{ 
          transform: [{ scale: scaleAnim }],
          width: itemWidth,
          margin: 5,
        }}
      >
        <TouchableOpacity 
          style={styles.imageItem} 
          onPress={() => onPress(item)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          {imageError ? (
            <View style={[styles.thumbnail, styles.errorThumbnail]}>
              <Feather name="alert-triangle" size={24} color="#EF4444" />
              <Text style={styles.errorText}>Image Error</Text>
            </View>
          ) : (
            <View style={{ position: 'relative', width: '100%', height: 150 }}>
              <ExpoImage 
                source={{ uri: item.uri }} 
                style={styles.thumbnail} 
                placeholder={{ blurhash }} 
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={item.id}
                transition={200}
                onError={(error) => {
                  console.error(`Failed to load image ${item.id}: ${error}`);
                  setImageError(true);
                }}
              />
              
              {/* Image title badge */}
              <View style={styles.titleBadge}>
                <Text style={styles.titleText}>{item.title || "Colorized"}</Text>
              </View>
            </View>
          )}
          <View style={styles.imageInfo}>
            <Text style={styles.imageDate}>{item.date}</Text>
            {item.isRemote && <View style={styles.cloudBadge}><Feather name="cloud" size={12} color="#fff" /></View>}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, (prevProps, nextProps) => prevProps.item.id === nextProps.item.id);

  const renderItem = ({ item, index }: { item: GalleryImage, index: number }) => (
    <GalleryListItem item={item} onPress={openImage} index={index} />
  );
  
  // Render skeleton items
  const renderSkeletons = () => {
    const skeletons = [];
    const itemWidth = (width - 40) / 2; // Match the width calculation in GalleryListItem
    
    for (let i = 0; i < 6; i++) {
      skeletons.push(
        <View key={`skeleton-${i}`} style={{ width: itemWidth, margin: 5 }}>
          <SkeletonItem index={i} />
        </View>
      );
    }
    
    return (
      <View style={[styles.galleryContainer, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }]}>
        {skeletons}
      </View>
    );
  };
  
  // Enhanced empty state
  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyContainer, 
        { 
          opacity: emptyAnim,
          transform: [{ translateY: emptyAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0]
          }) }]
        }
      ]}
    >
      <View style={styles.emptyStateIcon}>
        <Feather name="image" size={50} color="#ffffff" />
      </View>
      <Text style={styles.emptyText}>No colorized images yet</Text>
      <Text style={styles.emptySubtext}>Transform black & white photos and they'll appear here</Text>
      
      <View style={styles.emptyTips}>
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Feather name="upload" size={20} color="#6366f1" />
          </View>
          <Text style={styles.tipText}>Upload a photo in the Colorize tab</Text>
        </View>
        
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Feather name="camera" size={20} color="#6366f1" />
          </View>
          <Text style={styles.tipText}>Scan old photos directly with your camera</Text>
        </View>
      </View>
    </Animated.View>
  );

  useEffect(() => {
    // Add diagnostics for loaded gallery images
    if (galleryImages.length > 0) {
      console.log("Gallery component has", galleryImages.length, "images to display");
      console.log("First image:", JSON.stringify({
        id: galleryImages[0].id,
        uri: galleryImages[0].uri.substring(0, 100) + "...",
        date: galleryImages[0].date,
        isRemote: galleryImages[0].isRemote
      }));
    } else if (!isLoading) {
      console.log("Gallery has no images to display (not loading)");
    }
  }, [galleryImages, isLoading]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gallery</Text>
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        renderSkeletons()
      ) : galleryImages.length > 0 ? (
        <FlatList
          data={galleryImages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.galleryContainer}
          columnWrapperStyle={styles.columnWrapper}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          ListHeaderComponent={() => (
            <ExpoImage
              cachePolicy="memory-disk"
              style={{ width: 0, height: 0 }}
              source={{ uri: "" }}
            />
          )}
        />
      ) : (
        renderEmptyState()
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => {
                setModalVisible(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <View style={styles.closeButtonCircle}>
                <Feather name="x" size={24} color="white" />
              </View>
            </TouchableOpacity>

            {selectedImage && (
              <>
                {/* Title at the top */}
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>{selectedImage.title || "Colorized"}</Text>
                </View>
                
                <ExpoImage 
                  source={{ uri: selectedImage.uri }} 
                  style={styles.modalImage} 
                  placeholder={{ blurhash }} 
                  contentFit="contain" 
                />
                
                {selectedImage.isRemote && (
                  <View style={styles.cloudIndicator}>
                    <Feather name="cloud" size={16} color="#fff" />
                    <Text style={styles.cloudText}>Stored in cloud</Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalActionButton} onPress={shareImage}>
                <Feather name="share" size={20} color="white" />
                <Text style={styles.modalActionText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalActionButton, styles.deleteButton]} onPress={deleteImage}>
                <Feather name="trash-2" size={20} color="white" />
                <Text style={styles.modalActionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  premiumBadge: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  galleryContainer: {
    padding: 10,
  },
  imageItem: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  thumbnail: {
    width: "100%",
    height: 150,
  },
  skeletonThumbnail: {
    width: "100%",
    height: 150,
    backgroundColor: '#e2e8f0',
  },
  skeletonText: {
    width: 80,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  imageInfo: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  imageDate: {
    fontSize: 12,
    color: "#64748b",
  },
  cloudBadge: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 30,
  },
  emptyTips: {
    width: '100%',
    maxWidth: 350,
    marginTop: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff1fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  modalBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1000,
    padding: 0,
  },
  modalImage: {
    width: "100%",
    height: "80%",
  },
  modalActions: {
    flexDirection: "row",
    position: "absolute",
    bottom: 40,
    width: "100%",
    justifyContent: "center",
    gap: 15,
  },
  modalActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99, 102, 241, 0.9)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
  },
  modalActionText: {
    color: "white",
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.9)",
  },
  cloudIndicator: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "rgba(99, 102, 241, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    gap: 8,
  },
  cloudText: {
    color: "white",
    fontWeight: "500",
    fontSize: 12,
  },
  errorThumbnail: {
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 5,
    fontWeight: "500",
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  titleBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(99, 102, 241, 0.9)",
    padding: 4,
    borderRadius: 4,
  },
  titleText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  modalTitleContainer: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    paddingRight: 70,
    zIndex: 100,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
});
