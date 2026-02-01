import React, { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Easing
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Feather, Ionicons } from "@expo/vector-icons"
import { useAuth } from "../context/auth-context"
import { useSubscription } from "../context/subscription-context"
import { usePurchases } from "../context/purchases-context"
import * as ImagePicker from "expo-image-picker"
import { BlurView } from "expo-blur"
import { StatusBar } from "expo-status-bar"
import { LinearGradient } from "expo-linear-gradient"
import { useNavigation } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"
import { GalleryService } from "../lib/gallery-service"
import { Image as ExpoImage } from 'expo-image'

const { width } = Dimensions.get("window")
const HEADER_MAX_HEIGHT = 200
const HEADER_MIN_HEIGHT = Platform.OS === "ios" ? 90 : 70
const PROFILE_IMAGE_MAX_SIZE = 100
const PROFILE_IMAGE_MIN_SIZE = 40

// Negative margin to pull profile info up closer to the profile picture
const PROFILE_INFO_NEGATIVE_MARGIN = -50

// Credit package options - Same as transform screen
const CREDIT_PACKAGES = [
  {
    id: '1',
    credits: 20,
    price: 2.49,
    originalPrice: 4.99,
    popular: false,
    description: 'Perfect for trying our AI magic',
    features: ['20 colorizations', 'Basic enhancements', 'Save to gallery'],
    savings: null,
    badge: 'STARTER',
    valueText: 'Great for beginners'
  },
  {
    id: '2',
    credits: 70,
    price: 6.49,
    originalPrice: 17.49,
    popular: true,
    description: 'Most popular - Best value!',
    features: ['70 colorizations', 'All premium features', 'Priority processing', '20 bonus credits'],
    savings: '63% OFF',
    badge: 'BEST VALUE',
    valueText: 'Save £11 vs individual'
  },
  {
    id: '3',
    credits: 250,
    price: 15.99,
    originalPrice: 62.49,
    popular: false,
    description: 'For power users & professionals',
    features: ['250 colorizations', 'All premium features', 'Priority support', '100 bonus credits'],
    savings: '74% OFF',
    badge: 'PROFESSIONAL',
    valueText: 'Save £46.50 vs individual'
  }
];

// Define the navigation types
type ProfileStackParamList = {
  ProfileMain: undefined;
  HelpSupport: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList>;

export default function ProfileScreen() {
  const { user, logout, updateProfile, setUser } = useAuth()
  const { isPremium } = useSubscription()
  const { packages: revenueCatPackages, purchaseCredits, isLoading: isPurchasing, refreshCredits } = usePurchases()
  const navigation = useNavigation<ProfileScreenNavigationProp>()
  
  // State
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false)
  const [newName, setNewName] = useState(user?.name || "User")
  const [newAvatar, setNewAvatar] = useState<string | undefined>(user?.avatar)
  const [isLoading, setIsLoading] = useState(false)
  const [showCreditsModal, setShowCreditsModal] = useState(false)
  const [galleryImageCount, setGalleryImageCount] = useState(0)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current
  
  // Animation interpolations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: "clamp"
  })
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT) / 2, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp"
  })
  
  const profileImageSize = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [PROFILE_IMAGE_MAX_SIZE, PROFILE_IMAGE_MIN_SIZE],
    extrapolate: "clamp"
  })
  
  const profileImageMarginTop = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [HEADER_MAX_HEIGHT - PROFILE_IMAGE_MAX_SIZE / 2, HEADER_MIN_HEIGHT - PROFILE_IMAGE_MIN_SIZE / 2],
    extrapolate: "clamp"
  })

  // Load real gallery images count
  useEffect(() => {
    const loadGalleryCount = async () => {
      if (user) {
        try {
          // Clear cache to ensure we get fresh data
          GalleryService.clearCache()
          const images = await GalleryService.getAllImages(user.id, isPremium)
          setGalleryImageCount(images.length)
        } catch (error) {
          console.error("Error loading gallery count:", error)
        }
      }
    }
    
    loadGalleryCount()
  }, [user, isPremium])
  
  // Calculate user stats
  const userJoinDate = user?.createdAt ? new Date(user.createdAt) : new Date()
  
  // Use real gallery image count
  const colorisationCount = galleryImageCount
  
  // Credits count from user object
  const creditsCount = user?.credits || 5 // Default to 5
  
  // Calculate user streak from lastActive dates
  const calculateUserStreak = () => {
    if (!user?.lastActive || user.lastActive.length === 0) return 0
    
    // Sort the dates in descending order (newest first)
    const sortedDates = [...user.lastActive].sort((a, b) => b.getTime() - a.getTime())
    
    // Initialize streak counter
    let streak = 1
    
    // Get today's date without time component
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // First, check if user was active today
    const mostRecentDate = new Date(sortedDates[0])
    mostRecentDate.setHours(0, 0, 0, 0)
    
    // If not active today, check if active yesterday to continue streak
    if (mostRecentDate.getTime() !== today.getTime()) {
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      
      if (mostRecentDate.getTime() !== yesterday.getTime()) {
        // Not active yesterday or today, streak is broken
        return 0
      }
    }
    
    // Count consecutive days
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i])
      currentDate.setHours(0, 0, 0, 0)
      
      const previousDate = new Date(sortedDates[i - 1])
      previousDate.setHours(0, 0, 0, 0)
      
      // Calculate difference in days
      const timeDiff = previousDate.getTime() - currentDate.getTime()
      const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24))
      
      if (dayDiff === 1) {
        // Consecutive day, increment streak
        streak++
      } else {
        // Non-consecutive day, break the counting
        break
      }
    }
    
    return streak
  }
  
  const userStreak = calculateUserStreak()

  // Animation for modal opening
  useEffect(() => {
    if (showCreditsModal) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showCreditsModal]);

  // Extended updateProfile function to handle credits
  const updateProfileWithCredits = (data: { 
    name?: string; 
    avatar?: string; 
    credits?: number 
  }) => {
    // First update the standard fields
    updateProfile({
      name: data.name,
      avatar: data.avatar
    })
    
    // Then manually update the user state with credits
    if (user && data.credits !== undefined) {
      // In a real app, this would be handled by the server
      const updatedUser = {
        ...user,
        credits: data.credits
      }
      // Update the user state with the new credits
      setUser(updatedUser)
    }
  }

  // Functions for profile editing
  const handleEditProfile = () => {
    setNewName(user?.name || "User")
    setNewAvatar(user?.avatar)
    setIsEditProfileVisible(true)
  }

  const handleSaveProfile = () => {
    setIsLoading(true)
    // Update user profile with the new data
    setTimeout(() => {
      if (user) {
        updateProfile({
          name: newName,
          avatar: newAvatar
        })
        setIsLoading(false)
        setIsEditProfileVisible(false)
        Alert.alert("Success", "Profile updated successfully")
      }
    }, 1000)
  }

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Please allow access to your photo library to change your profile picture")
      return
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    
    if (!result.canceled) {
      setNewAvatar(result.assets[0].uri)
    }
  }

  // Handle credits purchase - uses RevenueCat
  const handlePurchaseCredits = async (packageId: string) => {
    // Map local package IDs to RevenueCat product IDs
    const productIdMap: Record<string, string> = {
      '1': 'credits_20',
      '2': 'credits_70',
      '3': 'credits_250',
    }

    const productId = productIdMap[packageId] || packageId

    const success = await purchaseCredits(productId)

    if (success) {
      // Close the modal on successful purchase
      closeCreditsModal()
      // Refresh credits from server
      await refreshCredits()
    }
  };

  const closeCreditsModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setShowCreditsModal(false));
  };

  // Render credits modal
  const renderCreditsModal = () => (
    <Modal
      visible={showCreditsModal}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeCreditsModal}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <BlurView
          tint="dark"
          intensity={30}
          style={StyleSheet.absoluteFill}
        />
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          onPress={closeCreditsModal}
        />
        <Animated.View 
          style={[
            styles.creditsModalContent,
            {
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                })
              }]
            }
          ]}
        >
          <View style={styles.creditsModalHeader}>
            <TouchableOpacity 
              onPress={closeCreditsModal}
              style={styles.closeButton}
            >
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.creditsModalTitle}>Get More Credits</Text>
            <View style={styles.closeButton} />
          </View>

          <ScrollView 
            style={styles.creditsPackagesList}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.creditsModalSubtitle}>
              Unlock the full power of our AI models
            </Text>

            {CREDIT_PACKAGES.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={[
                  styles.creditPackage,
                  selectedPackage === pkg.id && styles.selectedPackage,
                ]}
                onPress={() => setSelectedPackage(pkg.id)}
              >
                {/* Popular badge - only show when not selected */}
                {pkg.popular && selectedPackage !== pkg.id && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>POPULAR</Text>
                  </View>
                )}

                {/* Main content - clean layout */}
                <View style={styles.packageContent}>
                  <View style={styles.packageLeft}>
                    <View style={styles.creditsRow}>
                      <ExpoImage 
                        source={require('../assets/diamond (1).png')}
                        style={styles.packageDiamond}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        priority="high"
                      />
                      <Text style={styles.packageCreditsText}>{pkg.credits}</Text>
                    </View>
                    <Text style={styles.packageDescription}>{pkg.description}</Text>
                  </View>
                  
                  <View style={styles.packageRight}>
                    {pkg.originalPrice && (
                      <Text style={styles.packageOriginalPrice}>£{pkg.originalPrice}</Text>
                    )}
                    <Text style={styles.packagePrice}>£{pkg.price}</Text>
                    {pkg.savings && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.packageSavings}>{pkg.savings}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.purchaseButtonContainer}>
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                !selectedPackage && styles.purchaseButtonDisabled
              ]}
              onPress={() => selectedPackage && handlePurchaseCredits(selectedPackage)}
              disabled={!selectedPackage}
            >
              <LinearGradient
                colors={['#FF3B8B', '#A537FD', '#38B8F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.purchaseGradient}
              >
                <Text style={styles.purchaseButtonText}>
                  {selectedPackage ? `Get ${CREDIT_PACKAGES.find(p => p.id === selectedPackage)?.credits} Credits` : 'Select Package'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )

  // Render modal for editing profile
  const renderEditProfileModal = () => (
    <Modal
      visible={isEditProfileVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setIsEditProfileVisible(false)}
    >
      <BlurView intensity={20} style={styles.modalBlur}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <TouchableOpacity onPress={() => setIsEditProfileVisible(false)}>
                    <Ionicons name="close" size={24} color="#1e293b" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.profileImageContainer}>
                  {newAvatar ? (
                    <Image
                      source={{ uri: newAvatar }}
                      style={styles.profileImageEdit}
                    />
                  ) : (
                    <Image
                      source={require('../assets/blank-profile-pic.webp')}
                      style={styles.profileImageEdit}
                    />
                  )}
                  <TouchableOpacity style={styles.editImageButton} onPress={handlePickImage}>
                    <Feather name="camera" size={16} color="white" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Your name"
                    autoCapitalize="words"
                  />
                </View>
                
                <TouchableOpacity 
                  onPress={handleSaveProfile}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#ff6b9c', '#7d6fff', '#26c6da']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButton}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  )

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style={darkMode ? "light" : "dark"} />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <Animated.View style={[styles.headerBackground, { opacity: headerOpacity }]}>
          <ImageBackground 
            source={require('../assets/profile-gradient (1).webp')}
            style={styles.headerGradient}
            imageStyle={styles.headerImage}
          />
        </Animated.View>
      </Animated.View>
      
      {/* Profile Image */}
      <Animated.View 
        style={[
          styles.profileImageAnimatedContainer, 
          { 
            transform: [{ translateY: profileImageMarginTop }],
            zIndex: 1 
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.profileImageWrapper,
            { width: profileImageSize, height: profileImageSize }
          ]}
        >
          {user?.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={styles.profileImage}
            />
          ) : (
            <Image
              source={require('../assets/blank-profile-pic.webp')}
              style={styles.profileImage}
            />
          )}
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollViewContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || "User"}</Text>
          <Text style={styles.profileEmail}>{user?.email || "user@example.com"}</Text>
          
          <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Premium Credits Card */}
        <TouchableOpacity 
          style={styles.premiumCard}
          onPress={() => setShowCreditsModal(true)}
        >
          <LinearGradient
            colors={['#f8fafc', '#f1f5f9']}
            style={styles.premiumCardGradient}
          >
            <View style={styles.premiumCardContent}>
              <View style={styles.premiumCardLeft}>
                <Image 
                  source={require('../assets/diamond (1).png')}
                  style={styles.diamondIcon}
                />
                <View style={styles.premiumTextContainer}>
                  <Text style={styles.premiumCardTitle}>Unlock the Full Power of AI</Text>
                  <Text style={styles.premiumCardDescription}>
                    Get credits to transform more photos with our advanced AI tools
                  </Text>
                  <TouchableOpacity onPress={() => setShowCreditsModal(true)}>
                    <Text style={styles.getCreditsLink}>Get Credits</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{colorisationCount}</Text>
            <Text style={styles.statLabel}>Created</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.statItem}>
            <View style={styles.creditContainer}>
              <Image 
                source={require('../assets/diamond (1).png')}
                style={styles.statDiamondIcon}
              />
              <Text style={styles.statNumber}>{creditsCount}</Text>
            </View>
            <Text style={styles.statLabel}>Credits</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Feather name="moon" size={22} color="#1e293b" />
              <Text style={styles.settingText}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#e2e8f0", true: "#a5b4fc" }}
              thumbColor={darkMode ? "#6366f1" : "#f1f5f9"}
              ios_backgroundColor="#e2e8f0"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Feather name="bell" size={22} color="#1e293b" />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#e2e8f0", true: "#a5b4fc" }}
              thumbColor={notifications ? "#6366f1" : "#f1f5f9"}
              ios_backgroundColor="#e2e8f0"
            />
          </View>
        </View>

        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity 
            style={styles.aboutItem}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <View style={styles.aboutInfo}>
              <Feather name="help-circle" size={22} color="#1e293b" />
              <Text style={styles.aboutText}>Help & Support</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.aboutItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={styles.aboutInfo}>
              <Feather name="shield" size={22} color="#1e293b" />
              <Text style={styles.aboutText}>Privacy Policy</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.aboutItem}
            onPress={() => navigation.navigate('TermsOfService')}
          >
            <View style={styles.aboutInfo}>
              <Feather name="file-text" size={22} color="#1e293b" />
              <Text style={styles.aboutText}>Terms of Service</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </Animated.ScrollView>
      
      {renderEditProfileModal()}
      {renderCreditsModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: "white",
    zIndex: 1,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerImage: {
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  profileImageAnimatedContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: width,
    zIndex: 10,
  },
  profileImageWrapper: {
    borderRadius: PROFILE_IMAGE_MAX_SIZE / 2,
    backgroundColor: "white",
    borderWidth: 4,
    borderColor: "white",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  scrollViewContent: {
    paddingTop: HEADER_MAX_HEIGHT + PROFILE_IMAGE_MAX_SIZE / 2 + PROFILE_INFO_NEGATIVE_MARGIN,
    paddingBottom: 30,
  },
  profileInfo: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 0,
    marginBottom: 40,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
  },
  profileEmail: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 4,
  },
  editProfileButton: {
    backgroundColor: "#f8fafc",
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  editProfileText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 14,
  },
  premiumCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  premiumCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  premiumCardContent: {
    padding: 16,
    paddingRight: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  premiumCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  premiumTextContainer: {
    flex: 1,
  },
  diamondIcon: {
    width: 40,
    height: 40,
  },
  premiumCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  premiumCardDescription: {
    fontSize: 13,
    color: "#64748b",
    flexShrink: 1,
    lineHeight: 18,
  },
  getCreditsLink: {
    fontSize: 13,
    color: "#6366f1",
    marginTop: 6,
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 24,
    marginTop: 0,
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  statSeparator: {
    width: 1,
    height: "80%",
    backgroundColor: "#e2e8f0",
    marginHorizontal: 16,
  },
  statDiamondIcon: {
    width: 20,
    height: 20,
    marginRight: 4,
  },
  creditContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingText: {
    fontSize: 16,
    color: "#1e293b",
    marginLeft: 12,
  },
  aboutSection: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  aboutItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  aboutInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  aboutText: {
    fontSize: 16,
    color: "#1e293b",
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 60,
  },
  modalBlur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidingView: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
  },
  profileImageEdit: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editImageButton: {
    position: "absolute",
    bottom: 0,
    right: width / 2 - 50,
    backgroundColor: "#6366f1",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f8fafc",
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  creditsModalContent: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 24,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
  },
  creditsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  closeButton: {
    padding: 4,
  },
  creditsModalTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
  },
  creditsModalSubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginVertical: 24,
    paddingHorizontal: 24,
  },
  creditsPackagesList: {
    paddingHorizontal: 20,
  },
  creditPackage: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  selectedPackage: {
    backgroundColor: "#fefbff",
    borderColor: "#6366f1",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  packageContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packageLeft: {
    flex: 1,
  },
  creditsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  packageDiamond: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  packageCreditsText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  packageDescription: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  packageRight: {
    alignItems: "flex-end",
  },
  packageOriginalPrice: {
    fontSize: 12,
    color: "#94a3b8",
    textDecorationLine: "line-through",
    marginBottom: 2,
  },
  packagePrice: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },
  savingsBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  packageSavings: {
    fontSize: 10,
    color: "#16a34a",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  popularBadge: {
    position: "absolute",
    top: -1,
    left: -1,
    backgroundColor: "#6366f1",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  popularBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  purchaseButtonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
  },
  purchaseButton: {
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseGradient: {
    paddingVertical: 16,
    width: '100%',
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  purchaseButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
})
