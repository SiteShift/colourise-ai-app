import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
  PanResponder,
  Animated,
  Easing,
  FlatList,
  Modal,
  StatusBar,
  Share,
  ColorValue,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system"
import * as MediaLibrary from "expo-media-library"
import * as ImageManipulator from "expo-image-manipulator"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useApi } from "../context/api-context"
import { useAuth } from "../context/auth-context"
import { useSubscription } from "../context/subscription-context"
import { GalleryService } from "../lib/gallery-service"
import { LinearGradient } from "expo-linear-gradient"
import * as Haptics from "expo-haptics"
// @ts-ignore
import Compare, { Before, After, Dragger } from 'react-native-before-after-slider-v2'
import { BlurView } from 'expo-blur'
import { Image as ExpoImage } from 'expo-image'
import React from 'react'
import { enhanceImageForColorization, enhanceScannedPhotoForColorization } from "../lib/imageProcessing"
import { autoDetectAndCropPhoto } from "../lib/autoDetectPhoto"
import { CloudinaryService } from "../lib/cloudinary-service"
import { useNavigation } from "@react-navigation/native"
import { AISceneBuilderModal } from "../components/AISceneBuilderModal"
import OpenAIService from "../lib/openai-service"

const { width } = Dimensions.get("window")
const blurhash = 'L000000000000000000000000000'

// Sample featured examples
const FEATURED_EXAMPLES = [
  {
    id: '1',
    before: require('../assets/vintage-portrait-input.jpg'),
    after: require('../assets/vintage-portrait-output.jpg'),
    title: 'Vintage Portrait',
  },
  {
    id: '2',
    before: require('../assets/city-street-before.jpg'),
    after: require('../assets/city-street-after.jpg'),
    title: 'City Street',
  },
  {
    id: '3',
    before: require('../assets/family-portrait-before.jpg'),
    after: require('../assets/family-portrait-after.jpg'),
    title: 'Family Photo',
  },
];

// Sample premium features
const PREMIUM_FEATURES = [
  {
    id: '1',
    icon: 'sparkles' as any,
    title: 'AI Scene Builder',
    description: 'Transport yourself into amazing historical or fantasy scenes with AI-powered reimagination.',
    benefits: ['Realistic scene integration', 'Custom scene creation', 'Period-accurate styling'],
    image: require('../assets/enhanced-colours_compressed.webp'), // Temporarily using this image
    credits: 10,
    enabled: false,
    isNew: true, // Add flag for new feature
  },
  {
    id: '2',
    icon: 'face' as any,
    title: 'Face Enhancement',
    description: 'Restore and enhance facial details with incredible clarity using our specialized face recognition AI.',
    benefits: ['Enhanced facial features', 'Improved clarity', 'Natural skin texture'],
    image: require('../assets/face-enhancement_compressed.webp'),
    credits: 3,
    enabled: false,
  },
  {
    id: '3',
    icon: 'hd' as any,
    title: '4K Upscaler',
    description: 'Transform your photos into stunning 4K masterpieces with 4x more detail and resolution.',
    benefits: ['4x resolution increase', 'Ultra HD quality', 'Print-ready output'],
    image: require('../assets/4k-upscaler_compressed.webp'),
    credits: 4,
    enabled: false,
  },
];

// Sample colorization tips
const COLORIZATION_TIPS = [
  {
    id: '1',
    icon: 'image' as any,
    title: 'Use High Quality Images',
    description: 'Clearer photos produce better colorization results',
  },
  {
    id: '2',
    icon: 'sliders' as any,
    title: 'Good Contrast',
    description: 'Photos with good black & white contrast work best',
  },
  {
    id: '3',
    icon: 'crop' as any,
    title: 'Frame Your Subject',
    description: 'Center and frame the main subject for optimal results',
  },
];

// Memoized ProTipsSection
const ProTipsSection = React.memo(() => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Pro Tips</Text>
    </View>
    
    <View style={styles.tipsContainer}>
      {COLORIZATION_TIPS.map((tip) => (
        <View key={tip.id} style={styles.tipCard}>
          <View style={styles.tipIconContainer}>
            <Feather name={tip.icon} size={28} color="#6366f1" />
            <View style={styles.tipIconGlow} />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipDescription}>{tip.description}</Text>
          </View>
        </View>
      ))}
    </View>
  </View>
));

// Credit package options
const CREDIT_PACKAGES = [
  {
    id: '1',
    credits: 10,
    price: 4.99,
    popular: false,
    description: 'Perfect for small projects'
  },
  {
    id: '2',
    credits: 25,
    price: 9.99,
    popular: true,
    description: 'Most popular choice',
    savings: '20% savings'
  },
  {
    id: '3',
    credits: 50,
    price: 16.99,
    popular: false,
    description: 'Best value for bulk projects',
    savings: '32% savings'
  }
];

// Pre-require all static assets to ensure they're cached
const STATIC_ASSETS = {
  logo: require("../assets/Colourise AI logo.png"),
  uploadRectangle: require("../assets/upload-rectangle.png"),
  uploadIcon: require("../assets/upload-icon-gradient-colourise-ai.png"),
  scanButton: require("../assets/Scan-photo-button-outline.webp"),
  diamond: require("../assets/diamond (1).png"),
};

// Add caching configuration
const CACHE_CONFIG = {
  cachePolicy: 'memory-disk',
  priority: 'high',
  prefetch: true,
};

// Create a custom fade-in animation component
const FadeInView = React.memo(({ delay = 0, duration = 500, children, style }: { 
  delay?: number, 
  duration?: number, 
  children: React.ReactNode, 
  style?: any 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: duration * 1.2,
        delay,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, translateY, delay, duration]);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
});

// Update the premium feature cards to use animation
const PremiumFeatureCard = React.memo(({ 
  feature, 
  onPress, 
  isProcessing,
  index = 0
}: { 
  feature: typeof PREMIUM_FEATURES[0], 
  onPress: () => void,
  isProcessing: boolean,
  index?: number
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 7,
      tension: 40,
      useNativeDriver: true
    }).start();
    
    // Enhanced haptic feedback on touch
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 7,
      tension: 40,
      useNativeDriver: true
    }).start();
  };

  return (
    <FadeInView delay={index * 150} duration={400}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          disabled={isProcessing}
        >
          <View style={styles.premiumCard}>
            {/* Feature Header with Image */}
            <View style={styles.premiumImageContainer}>
              <ExpoImage
                source={feature.image}
                style={styles.premiumImage}
                contentFit="cover"
                transition={300}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
                style={styles.premiumImageOverlay}
              />
              <View style={styles.creditsBadgeAbsolute}>
                <ExpoImage 
                  source={STATIC_ASSETS.diamond}
                  style={styles.premiumDiamondIcon}
                  contentFit="contain"
                />
                <Text style={styles.premiumCreditsText}>{feature.credits}</Text>
              </View>
              
              {/* New Feature Ribbon */}
              {feature.isNew && (
                <View style={styles.newFeatureRibbon}>
                  <LinearGradient
                    colors={['#FF3B8B', '#A537FD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.newFeatureRibbonGradient}
                  >
                    <Feather name="star" size={12} color="white" style={styles.newFeatureIcon} />
                    <Text style={styles.newFeatureText}>NEW FEATURE</Text>
                  </LinearGradient>
                </View>
              )}
            </View>

            {/* Rest of the card content remains the same, but remove icon container */}
            <View style={styles.premiumCardContent}>
              <Text style={styles.premiumCardTitle}>{feature.title}</Text>
              <Text style={styles.premiumCardDescription}>{feature.description}</Text>
              
              <View style={styles.benefitsList}>
                {feature.benefits.map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <View style={styles.benefitCheck}>
                      <Feather name="check" size={12} color="#6366f1" />
                    </View>
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>

              <View
                style={[
                  styles.premiumActionButton,
                  isProcessing && styles.premiumActionButtonDisabled
                ]}
              >
                <LinearGradient
                  colors={['#6366f1', '#4f46e5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.premiumActionGradient}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Text style={styles.premiumActionText}>
                        {feature.id === '1' ? 'Try this Feature' : 'Apply Enhancement'}
                      </Text>
                      <Feather name="arrow-right" size={18} color="white" />
                    </>
                  )}
                </LinearGradient>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </FadeInView>
  );
});

// Add this new component after the SkeletonItem component but before TransformScreen
// AI Scanning Animation Component
const AIScanningAnimation = ({ imageHeight = 450 }: { imageHeight?: number }) => {
  // Animation values
  const scanLineAnim = useRef(new Animated.Value(-50)).current;
  const glowOpacity = useRef(new Animated.Value(0.7)).current;
  const boxesAnim = useRef(Array(8).fill(0).map(() => new Animated.Value(0))).current;
  
  // Start the animations when component mounts
  useEffect(() => {
    // Repeating scan line animation
    const animateScanLine = () => {
      Animated.sequence([
        // Move scan line across the image
        Animated.timing(scanLineAnim, {
          toValue: imageHeight + 50,
          duration: 3000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        // Reset to start position
        Animated.timing(scanLineAnim, {
          toValue: -50,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start(animateScanLine);
    };

    // Pulse glow animation
    const animateGlow = () => {
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.7,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(animateGlow);
    };

    // Start the animations
    animateScanLine();
    animateGlow();
    
    // Animation for detection boxes
    const animateBoxes = () => {
      // Animate each box with random timing
      boxesAnim.forEach((anim, index) => {
        setTimeout(() => {
          Animated.sequence([
            // Fade in
            Animated.timing(anim, {
              toValue: 1,
              duration: 300 + Math.random() * 300,
              useNativeDriver: true,
            }),
            // Hold
            Animated.delay(200 + Math.random() * 500),
            // Fade out
            Animated.timing(anim, {
              toValue: 0,
              duration: 300 + Math.random() * 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Reset with random delay before restarting
            setTimeout(() => {
              if (index % 2 === 0) animateBox(index);
            }, 1000 + Math.random() * 3000);
          });
        }, index * 300);
      });
    };
    
    // Function to animate a single box
    const animateBox = (index: number) => {
      Animated.sequence([
        // Fade in
        Animated.timing(boxesAnim[index], {
          toValue: 1,
          duration: 300 + Math.random() * 300,
          useNativeDriver: true,
        }),
        // Hold
        Animated.delay(200 + Math.random() * 500),
        // Fade out
        Animated.timing(boxesAnim[index], {
          toValue: 0,
          duration: 300 + Math.random() * 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset with random delay before restarting
        setTimeout(() => {
          animateBox(index);
        }, 1000 + Math.random() * 3000);
      });
    };
    
    // Start box animations
    boxesAnim.forEach((_, index) => {
      setTimeout(() => {
        animateBox(index);
      }, index * 200);
    });
    
    // Cleanup function
    return () => {
      scanLineAnim.stopAnimation();
      glowOpacity.stopAnimation();
      boxesAnim.forEach(anim => anim.stopAnimation());
    };
  }, [scanLineAnim, glowOpacity, boxesAnim, imageHeight]);
  
  // Calculate random positions for detection boxes
  const boxPositions = useMemo(() => {
    return Array(8).fill(0).map(() => ({
      left: Math.random() * 80 + 10,
      top: Math.random() * (imageHeight - 40) + 20,
      size: Math.random() * 30 + 20,
    }));
  }, [imageHeight]);
  
  return (
    <View style={[styles.scanAnimationContainer, { height: imageHeight }]}>
      {/* Detection boxes that appear and disappear */}
      {boxPositions.map((pos, index) => (
        <Animated.View 
          key={`box-${index}`}
          style={[
            styles.detectionBox,
            {
              left: `${pos.left}%`,
              top: pos.top,
              width: pos.size,
              height: pos.size,
              opacity: boxesAnim[index],
              borderColor: index % 3 === 0 ? '#6366f1' : (index % 3 === 1 ? '#FF3B8B' : '#38B8F2'),
            }
          ]}
        >
          <View style={styles.detectionBoxCorner} />
        </Animated.View>
      ))}
      
      {/* Scanning line with gradient glow - changed to white */}
      <Animated.View 
        style={[
          styles.scanLine, 
          { 
            transform: [{ translateY: scanLineAnim }],
            opacity: glowOpacity
          }
        ]}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.scanLineGradient}
        />
      </Animated.View>
      
      {/* AI Analysis Text Elements - keeping only top left text */}
      <View style={styles.aiTextContainer}>
        <Text style={styles.aiAnalyzingText}>AI ANALYZING</Text>
        <View style={styles.aiStatusContainer}>
          <Text style={styles.aiStatusLabel}>Detecting colors</Text>
          <View style={styles.aiStatusDotContainer}>
            <Animated.View style={[styles.aiStatusDot, { opacity: Animated.multiply(glowOpacity, 1) }]} />
            <Animated.View style={[styles.aiStatusDot, { opacity: Animated.multiply(glowOpacity, 0.8) }]} />
            <Animated.View style={[styles.aiStatusDot, { opacity: Animated.multiply(glowOpacity, 0.6) }]} />
          </View>
        </View>
      </View>
    </View>
  );
};

// Add new EnhancementLoadingIndicator component after AIScanningAnimation
const EnhancementLoadingIndicator = ({ 
  enhancementType = 'Face Enhancement',
  imageHeight = 450,
  colorizedImage = null
}: { 
  enhancementType?: string,
  imageHeight?: number,
  colorizedImage?: string | null
}) => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const faceBoxOpacity = useRef(new Animated.Value(0)).current;
  const faceBoxScale = useRef(new Animated.Value(0.8)).current;
  const detailOpacity1 = useRef(new Animated.Value(0)).current;
  const detailOpacity2 = useRef(new Animated.Value(0)).current;
  const detailOpacity3 = useRef(new Animated.Value(0)).current;
  const detailScale1 = useRef(new Animated.Value(0.8)).current;
  const detailScale2 = useRef(new Animated.Value(0.8)).current;
  const detailScale3 = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  
  // 4K Upscaler specific animations
  const gridOpacity = useRef(new Animated.Value(0)).current;
  const zoomAnim = useRef(new Animated.Value(1)).current;
  const pixelOpacity = useRef(new Animated.Value(0)).current;
  const resolutionTextOpacity = useRef(new Animated.Value(0)).current;
  const scanLinePos = useRef(new Animated.Value(-50)).current;
  const pixelGridScale = useRef(new Animated.Value(0.6)).current;
  
  // Is this a 4K upscaling animation?
  const is4KUpscaling = enhancementType === '4K Upscaling';
  const isAISceneGeneration = enhancementType === 'AI Scene Generation';
  
  // Progress steps state
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 5;
  
  // Different steps based on enhancement type
  const faceEnhancementSteps = [
    "Analyzing facial features",
    "Enhancing details",
    "Optimizing skin tones",
    "Refining structure",
    "Finalizing image"
  ];
  
  const upscalingSteps = [
    "Analyzing image resolution",
    "Enhancing pixel density",
    "Upscaling to 4K",
    "Sharpening details",
    "Finalizing ultra HD image"
  ];
  
  const sceneGenerationSteps = [
    "Analyzing your photo",
    "Understanding scene context",
    "Generating new environment",
    "Blending with AI magic",
    "Finalizing your scene"
  ];
  
  const steps = isAISceneGeneration ? sceneGenerationSteps : (is4KUpscaling ? upscalingSteps : faceEnhancementSteps);
  
  // Text for the current progress
  const progressText = useMemo(() => {
    return steps[currentStep] || "Processing...";
  }, [currentStep, steps]);
  
  // Rotating animation for the loading indicator
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Progress percentage calculation
  const progressPercentage = progressAnim.interpolate({
    inputRange: [0, totalSteps],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp'
  });
  
  // Start animations when component mounts
  useEffect(() => {
    // Pulse animation for the main container
    const animatePulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(animatePulse);
    };
    
    // Animation for the spinning loading indicator
    const animateSpin = () => {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();
    };
    
    // Facial recognition box animation
    const animateFaceBox = () => {
      if (is4KUpscaling) return; // Skip for 4K upscaling
      
      Animated.sequence([
        Animated.parallel([
          Animated.timing(faceBoxOpacity, {
            toValue: 0.8,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(faceBoxScale, {
            toValue: 1,
            duration: 1000,
            easing: Easing.out(Easing.elastic(1)),
            useNativeDriver: true
          })
        ]),
        Animated.delay(500),
        // Show detail marker 1
        Animated.parallel([
          Animated.timing(detailOpacity1, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(detailScale1, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true
          })
        ]),
        Animated.delay(400),
        // Show detail marker 2
        Animated.parallel([
          Animated.timing(detailOpacity2, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(detailScale2, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true
          })
        ]),
        Animated.delay(400),
        // Show detail marker 3
        Animated.parallel([
          Animated.timing(detailOpacity3, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(detailScale3, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true
          })
        ]),
      ]).start();
    };
    
    // 4K upscaling animation
    const animate4KUpscaling = () => {
      if (!is4KUpscaling) return; // Skip if not 4K upscaling
      
      // Pixel grid animation
      Animated.sequence([
        // Fade in grid
        Animated.timing(gridOpacity, {
          toValue: 0.9,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        // Start with smaller scale
        Animated.timing(pixelGridScale, {
          toValue: 0.8,
          duration: 0,
          useNativeDriver: true
        }),
        // Scale up to show "upscaling"
        Animated.timing(pixelGridScale, {
          toValue: 1.3,
          duration: 2000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        // Show high resolution text
        Animated.timing(resolutionTextOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        }),
        Animated.delay(500),
        // Fade in detailed pixels
        Animated.timing(pixelOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        }),
      ]).start();
      
      // Scanning line animation
      const animateScanLine = () => {
        Animated.sequence([
          // Move scan line across the image
          Animated.timing(scanLinePos, {
            toValue: imageHeight + 50,
            duration: 2000,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          // Reset to start position
          Animated.timing(scanLinePos, {
            toValue: -50,
            duration: 0,
            useNativeDriver: true,
          }),
        ]).start(animateScanLine);
      };
      
      // Start scan line
      animateScanLine();
      
      // Zoom animation (subtle)
      Animated.loop(
        Animated.sequence([
          Animated.timing(zoomAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(zoomAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true
          })
        ])
      ).start();
    };
    
    // Glow effect animation
    const animateGlow = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1500,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true
          })
        ])
      ).start();
    };
    
    // Progress bar animation sequence through the steps
    const animateProgress = () => {
      // Reset progress if needed
      progressAnim.setValue(0);
      
      // Determine timing based on enhancement type
      const stepDuration = isAISceneGeneration ? 12000 : 1500; // 12 seconds per step for AI Scene Generation (60s total)
      const stepIntervalTime = isAISceneGeneration ? 12000 : 1800; // Match step duration for AI Scene Generation
      
      // Create a sequence of animations for each step
      const animations = [];
      for (let i = 0; i < totalSteps; i++) {
        // Add a step animation
        animations.push(
          Animated.timing(progressAnim, {
            toValue: i + 1,
            duration: stepDuration + (isAISceneGeneration ? 0 : Math.random() * 1000), // No randomization for AI Scene Generation for consistent timing
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false // Can't use native driver with interpolated string values
          })
        );
        
        // Update the current step text
        animations.push(
          Animated.timing(new Animated.Value(0), {
            toValue: 1,
            duration: 50, // Almost instant
            useNativeDriver: false,
            isInteraction: false
          })
        );
      }
      
      // Start the sequence
      let currentStepIndex = 0;
      Animated.sequence(animations).start(({ finished }) => {
        if (finished) {
          // When all steps are done, restart if needed
          // animateProgress();
        }
      });
      
      // Update the current step text separately
      const stepInterval = setInterval(() => {
        if (currentStepIndex < totalSteps - 1) {
          currentStepIndex++;
          setCurrentStep(currentStepIndex);
        } else {
          clearInterval(stepInterval);
        }
      }, stepIntervalTime); // Use calculated step interval time
      
      // Clean up the interval
      return () => clearInterval(stepInterval);
    };
    
    // Start all animations
    animatePulse();
    animateSpin();
    animateFaceBox();
    animateGlow();
    animate4KUpscaling();
    animateProgress();
    
    // Cleanup
    return () => {
      pulseAnim.stopAnimation();
      spinAnim.stopAnimation();
      faceBoxOpacity.stopAnimation();
      faceBoxScale.stopAnimation();
      detailOpacity1.stopAnimation();
      detailOpacity2.stopAnimation();
      detailOpacity3.stopAnimation();
      progressAnim.stopAnimation();
      glowAnim.stopAnimation();
      gridOpacity.stopAnimation();
      zoomAnim.stopAnimation();
      pixelOpacity.stopAnimation();
      resolutionTextOpacity.stopAnimation();
      scanLinePos.stopAnimation();
      pixelGridScale.stopAnimation();
    };
  }, [
    pulseAnim, 
    progressAnim, 
    faceBoxOpacity, 
    faceBoxScale, 
    detailOpacity1, 
    detailOpacity2, 
    detailOpacity3,
    spinAnim,
    glowAnim,
    gridOpacity,
    zoomAnim,
    pixelOpacity,
    resolutionTextOpacity,
    scanLinePos,
    pixelGridScale,
    totalSteps,
    is4KUpscaling,
    imageHeight,
    isAISceneGeneration
  ]);
  
  // Generate the pixel grid for 4K upscaler animation
  const renderPixelGrid = () => {
    if (!is4KUpscaling) return null;
    
    const gridSize = 8; // Number of cells in each row/column
    const cells = [];
    
    // Create grid of cells
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        // Calculate position
        const size = 16;
        const gap = 4;
        const totalSize = size * gridSize + gap * (gridSize - 1);
        const startX = -totalSize / 2;
        const startY = -totalSize / 2;
        const x = startX + j * (size + gap);
        const y = startY + i * (size + gap);
        
        // Random brightness for visual effect
        const brightness = 0.5 + Math.random() * 0.5;
        
        // Create cell
        cells.push(
          <Animated.View 
            key={`cell-${i}-${j}`}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              left: x,
              top: y,
              backgroundColor: `rgba(255, 255, 255, ${brightness * 0.7})`,
              opacity: pixelOpacity,
              transform: [
                { scale: pixelGridScale },
                { translateX: gridSize * (size + gap) / 2 },
                { translateY: gridSize * (size + gap) / 2 }
              ],
            }}
          />
        );
      }
    }
    
    return cells;
  };
  
  return (
    <View style={[styles.enhancementLoadingContainer, { height: imageHeight }]}>
      {/* Blurred colorized image in background */}
      {colorizedImage && (
        <ExpoImage
          source={{ uri: colorizedImage }}
          style={[StyleSheet.absoluteFill, { opacity: 0.9 }]}
          contentFit="cover"
          placeholder={{ blurhash }}
          blurRadius={20}
        />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Central loading animation */}
      <View style={[styles.enhancementAnimationContainer, (is4KUpscaling || isAISceneGeneration) && { top: 80 }]}>
        {!is4KUpscaling && !isAISceneGeneration ? (
          /* Face Enhancement Animation */
          <Animated.View 
            style={[
              styles.faceRecognitionBox,
              {
                opacity: faceBoxOpacity,
                transform: [{ scale: faceBoxScale }]
              }
            ]}
          >
            {/* Detail markers */}
            <Animated.View 
              style={[
                styles.faceDetailMarker,
                styles.detailMarker1,
                {
                  opacity: detailOpacity1,
                  transform: [{ scale: detailScale1 }]
                }
              ]}
            >
              <Animated.View style={[styles.markerGlow, { opacity: glowAnim }]} />
              <View style={styles.markerDot} />
            </Animated.View>
            
            <Animated.View 
              style={[
                styles.faceDetailMarker,
                styles.detailMarker2,
                {
                  opacity: detailOpacity2,
                  transform: [{ scale: detailScale2 }]
                }
              ]}
            >
              <Animated.View style={[styles.markerGlow, { opacity: glowAnim }]} />
              <View style={styles.markerDot} />
            </Animated.View>
            
            <Animated.View 
              style={[
                styles.faceDetailMarker,
                styles.detailMarker3,
                {
                  opacity: detailOpacity3,
                  transform: [{ scale: detailScale3 }]
                }
              ]}
            >
              <Animated.View style={[styles.markerGlow, { opacity: glowAnim }]} />
              <View style={styles.markerDot} />
            </Animated.View>
            
            {/* Box corners for facial recognition effect */}
            <View style={[styles.boxCorner, styles.topLeftCorner]} />
            <View style={[styles.boxCorner, styles.topRightCorner]} />
            <View style={[styles.boxCorner, styles.bottomLeftCorner]} />
            <View style={[styles.boxCorner, styles.bottomRightCorner]} />
          </Animated.View>
        ) : is4KUpscaling ? (
          /* 4K Upscaler Animation */
          <Animated.View 
            style={[
              styles.upscalerAnimationContainer,
              {
                transform: [{ scale: zoomAnim }]
              }
            ]}
          >
            {/* Pixel grid animation */}
            <Animated.View 
              style={[
                styles.pixelGridContainer,
                { opacity: gridOpacity }
              ]}
            >
              {renderPixelGrid()}
              
              {/* Scanning line */}
              <Animated.View 
                style={[
                  styles.upscaleScanLine, 
                  { transform: [{ translateY: scanLinePos }] }
                ]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.upscaleScanLineGradient}
                />
              </Animated.View>
              
              {/* Resolution indicator */}
              <Animated.View 
                style={[
                  styles.resolutionTextContainer,
                  { opacity: resolutionTextOpacity }
                ]}
              >
                <Text style={styles.resolutionText}>4K</Text>
                <Text style={styles.resolutionSubtext}>ULTRA HD</Text>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        ) : (
          /* AI Scene Generation Animation */
          <View style={styles.sceneGenerationContainer}>
            <Text style={styles.sceneGenerationText}>✨</Text>
          </View>
        )}
      </View>
      
      {/* Text and progress indicators */}
      <View style={styles.enhancementTextContainer}>
        <Text style={styles.enhancementTitle}>
          {isAISceneGeneration ? 'AI Scene Builder' : (is4KUpscaling ? 'AI 4K Upscaler' : 'AI Face Enhancement')}
        </Text>
        
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressText}>{progressText}</Text>
        </View>
        
        <View style={styles.enhancementProgressContainer}>
          <View style={styles.enhancementProgressBar}>
            <Animated.View 
              style={[
                styles.enhancementProgressFill,
                { width: progressPercentage }
              ]} 
            >
              <LinearGradient
                colors={['#38B8F2', '#6366f1', '#FF3B8B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </View>
        
        <Text style={styles.enhancementDescription}>
          {isAISceneGeneration 
            ? 'Our AI is reimagining you in your chosen scene' 
            : (is4KUpscaling 
              ? 'Our AI is increasing your image resolution for stunning 4K detail' 
              : 'Our AI is intelligently enhancing facial details for a stunning, lifelike result')}
        </Text>
      </View>
    </View>
  );
};

export default function TransformScreen() {
  const [image, setImage] = useState<string | null>(null)
  const [colorizedImage, setColorizedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [containerWidth, setContainerWidth] = useState(width - 40)
  const [sliderAnimationComplete, setSliderAnimationComplete] = useState(false)
  const [credits, setCredits] = useState(99) // Initial credits
  const [selectedPremiumFeature, setSelectedPremiumFeature] = useState<string | null>(null)
  const [exampleModalVisible, setExampleModalVisible] = useState(false)
  const [selectedExample, setSelectedExample] = useState<typeof FEATURED_EXAMPLES[0] | null>(null)
  const [exampleContainerWidth, setExampleContainerWidth] = useState(width - 40)
  // Add new state to track colorized image loading
  const [isColorizedImageLoaded, setIsColorizedImageLoaded] = useState(false)
  // Animation value for slider fade-in
  const sliderFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Add state for AI Scene Builder modal
  const [showAISceneBuilderModal, setShowAISceneBuilderModal] = useState(false);
  
  const { apiKey } = useApi()
  const { user } = useAuth()
  const { isPremium } = useSubscription()
  const navigation = useNavigation()
  
  // Add these state variables for slider interaction in examples
  const [exampleScrollEnabled, setExampleScrollEnabled] = useState(true);
  
  // Create a separate screen for the example viewer to avoid modal issues
  const [showFullScreenExample, setShowFullScreenExample] = useState(false);
  
  // Add new state for post-processing
  const [isPostProcessing, setIsPostProcessing] = useState(false);
  
  // Simplify animation state - only need one flag
  const [sliderEntranceComplete, setSliderEntranceComplete] = useState(false);
  
  // Add a state to track if we're showing enhanced image comparison
  const [showingEnhancedComparison, setShowingEnhancedComparison] = useState(false);
  const [originalColorizedUri, setOriginalColorizedUri] = useState<string | null>(null);
  
  // Add state to track permissions
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(false);
  
  // Handler for container layout measurement
  const handleContainerLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    const { width: layoutWidth } = event.nativeEvent.layout;
    setContainerWidth(layoutWidth);
  }, []);

  // Add a function to prefetch and prepare the colorized image
  const prepareColorizedImage = useCallback(async (imageUrl: string, skipProcessingAnimation = false) => {
    try {
      // Reset state
      setIsColorizedImageLoaded(false);
      
      // Try to prefetch the image to cache it
      if (Platform.OS !== 'web') {
        await ExpoImage.prefetch(imageUrl);
      }
      
      // Reset fade animation
      sliderFadeAnim.setValue(0);
      setSliderEntranceComplete(false);
      
      // After prefetching and a small delay, we'll set isColorizedImageLoaded to true
      // The delay ensures the image is properly rendered before showing
      setTimeout(() => {
        setIsColorizedImageLoaded(true);
        // Only set isProcessing to false if we're not skipping the processing animation
        if (!skipProcessingAnimation) {
          setIsProcessing(false);
        }
      }, 600); // Reduced delay for faster feedback
    } catch (error) {
      console.error('Error prefetching image:', error);
      // Even if prefetch fails, still try to show the image
      sliderFadeAnim.setValue(0);
      setSliderEntranceComplete(false);
      setTimeout(() => {
        setIsColorizedImageLoaded(true);
        // Only set isProcessing to false if we're not skipping the processing animation
        if (!skipProcessingAnimation) {
          setIsProcessing(false);
        }
      }, 600);
    }
  }, []);

  // Automatically start colorization when image changes
  useEffect(() => {
    if (image && !colorizedImage && !isProcessing) {
      colorizeImage();
    }
  }, [image, colorizedImage, isProcessing]);
  
  // Reset the colorized image loaded state when colorizedImage changes
  useEffect(() => {
    if (colorizedImage) {
      setIsColorizedImageLoaded(false);
      // Reset animation state for new colorizations
      setSliderEntranceComplete(false);
    }
  }, [colorizedImage]);
  
  // Animation sequence for the slider to demonstrate functionality
  const animateSlider = () => {
    // We'll need to use the slider's built-in functionality
    // or access its internal state, which may not be directly accessible
    // As a workaround, we'll use a timeout to mark animation as complete
    // and then build our own custom animation in the future if needed
    setSliderAnimationComplete(true);
  };

  // Create a utility function for consistent haptic feedback use
  const hapticFeedback = {
    light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    selection: () => Haptics.selectionAsync()
  };

  // Enhance the pickImage function with haptic feedback
  const pickImage = async () => {
    hapticFeedback.light(); // Add haptic feedback when button is pressed
    
    // On iOS, this will automatically show the native picker with options:
    // "Take Photo" or "Choose from Library"
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 1,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.AUTOMATIC,
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      hapticFeedback.medium(); // Add stronger feedback when image is selected
      setImage(result.assets[0].uri)
      setColorizedImage(null)
      setSliderAnimationComplete(false)
      // Reset animation states
      setSliderEntranceComplete(false)
      // Ensure scrolling is enabled when going back to main screen
      setScrollEnabled(true);
    }
  }

  // Enhance the takePhoto function with haptic feedback
  const takePhoto = async () => {
    hapticFeedback.light(); // Add haptic feedback when button is pressed
    
    // Request camera permissions first
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      hapticFeedback.error(); // Error feedback for permission denial
      Alert.alert("Permission needed", "Camera permission is required to take photos")
      return
    }

    try {
      // Launch camera in proper configuration for scanning old photos
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false, // Disable manual editing
        quality: 1, // Highest quality
        exif: true, // Get EXIF data if available
        // Use highest resolution available for better detection
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN
      })
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Show loading indicator immediately
        setIsProcessing(true)
        
        try {
          // Provide haptic feedback when starting processing
          hapticFeedback.medium();
          
          // Automatically detect and crop the photo with our improved algorithm
          const autoCroppedUri = await autoDetectAndCropPhoto(result.assets[0].uri)
          
          // Set the cropped image
          setImage(autoCroppedUri)
          setColorizedImage(null)
          setSliderAnimationComplete(false)
          // Reset animation states
          setSliderEntranceComplete(false)
          
          // Immediately start the colorization process
          colorizeScannedDocument(autoCroppedUri)
        } catch (error) {
          console.error("Error in auto-crop process:", error)
          hapticFeedback.error(); // Error feedback
          
          // If auto-crop fails, use the original image as fallback
          // but still try to do basic processing on it
          const fallbackUri = await enhanceScannedPhotoForColorization(result.assets[0].uri)
          setImage(fallbackUri)
          setColorizedImage(null)
          setSliderAnimationComplete(false)
          // Reset animation states
          setSliderEntranceComplete(false)
          
          // Still try to colorize the processed original
          colorizeScannedDocument(fallbackUri)
        }
      }
    } catch (error) {
      console.error("Error taking photo:", error)
      hapticFeedback.error(); // Error feedback
      Alert.alert(
        "Camera Error",
        "There was a problem capturing your photo. Please try again.",
        [{ text: "OK" }]
      )
      
      // Make sure to reset processing state if there's an error
      setIsProcessing(false)
    }
  }
  
  // Special colorization process for scanned photos
  const colorizeScannedDocument = async (imageUri: string) => {
    if (!imageUri) return
    if (credits <= 0) {
      Alert.alert(
        "No Credits",
        "You don't have any credits left. Please purchase more to continue.",
        [{ text: "OK" }]
      )
      setIsProcessing(false)
      return
    }

    // Processing is already set in the takePhoto function, but just in case
    if (!isProcessing) {
      setIsProcessing(true)
    }
    setIsColorizedImageLoaded(false);
    // Reset animation states to ensure animation runs correctly
    setSliderEntranceComplete(false);

    try {
      // Use specialized enhancement for scanned photos
      const processedImageUri = await enhanceScannedPhotoForColorization(imageUri);
      
      // Create a form data object to send the processed image
      const formData = new FormData()

      // Get the file name from the URI
      const fileName = processedImageUri.split("/").pop() || "photo.jpg"

      // Determine the file type
      const match = /\.(\w+)$/.exec(fileName)
      const fileType = match ? `image/${match[1]}` : "image/jpeg"

      // Append the processed image to the form data
      formData.append("image", {
        uri: processedImageUri,
        name: fileName,
        type: fileType,
      } as any)

      // Perform API call with timeout handling
      const fetchPromise = fetch("https://api.deepai.org/api/colorizer", {
        method: "POST",
        headers: {
          "api-key": apiKey,
        },
        body: formData,
      });
      
      // Add a timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API request timed out')), 30000); // 30 second timeout
      });
      
      // Race the fetch against the timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      const data = await response.json();

      if (data.output_url) {
        setColorizedImage(data.output_url)
        // Deduct a credit after successful colorization
        setCredits(prevCredits => prevCredits - 1)
        
        // Prepare and prefetch the colorized image
        await prepareColorizedImage(data.output_url);
        
        // Provide haptic feedback on success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else if (data.status && data.status === "failed") {
        throw new Error(data.message || "API error: Colourisation failed")
      } else {
        throw new Error("No colourised image returned from API")
      }
    } catch (error) {
      console.error("Error colourising scanned document:", error)
      // Provide haptic feedback on error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      
      Alert.alert(
        "Colourisation Failed",
        "There was a problem colourising your photo. Please try again with better lighting and positioning.",
        [{ text: "OK" }],
      )
      setIsProcessing(false)
    }
  }

  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);

  // Add this function to handle premium feature toggle
  const togglePremiumFeature = (featureId: string) => {
    setActiveFeatures(prev => {
      if (prev.includes(featureId)) {
        return prev.filter(id => id !== featureId);
      }
      return [...prev, featureId];
    });
  };

  // Update the colorizeImage function
  const colorizeImage = async (imageUri?: string) => {
    const imageToColorize = imageUri || image;
    if (!imageToColorize) return;

    // Check if user has at least 1 credit for basic colorization
    if (credits < 1) {
      Alert.alert(
        "Insufficient Credits",
        "You need 1 credit to colorize an image. Please purchase more credits to continue.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsProcessing(true);
    setIsColorizedImageLoaded(false);
    // Reset animation states to ensure animation runs each time
    setSliderEntranceComplete(false);

    try {
      // Create form data for basic colorization
      const formData = new FormData();
      const fileName = imageToColorize.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(fileName);
      const fileType = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("image", {
        uri: imageToColorize,
        name: fileName,
        type: fileType,
      } as any);

      const response = await fetch("https://api.deepai.org/api/colorizer", {
        method: "POST",
        headers: {
          "api-key": apiKey,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.output_url) {
        setColorizedImage(data.output_url);
        // Deduct 1 credit for basic colorization
        setCredits(prevCredits => prevCredits - 1);
        
        // Prepare the colorized image - this keeps isProcessing true until done
        await prepareColorizedImage(data.output_url);
        
        // Provide success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.message || "API error: Colourisation failed");
      }
    } catch (error) {
      console.error("Error colourising image:", error);
      Alert.alert(
        "Colourisation Failed",
        "There was a problem colourising your image. Please try again.",
        [{ text: "OK" }]
      );
      setIsProcessing(false);
    }
  };

  // Simplify the save image function to avoid multiple alerts and double saving
  const saveImage = async () => {
    if (!colorizedImage) {
      console.error("No colorized image to save");
      return;
    }

    hapticFeedback.light(); // Feedback when button is pressed
    setIsSaving(true);
    
    try {
      if (!user) {
        hapticFeedback.warning(); // Warning feedback
        Alert.alert("Login Required", "Please log in to save images");
        return;
      }
      
      console.log("Attempting to save image:", colorizedImage.substring(0, 50) + "...");
      
      // First make sure we have a valid URI to work with - either direct or downloaded
      let validUri = colorizedImage;
      let downloaded = false;
      
      // If it's a remote URL, download it first
      if (colorizedImage.startsWith('http')) {
        try {
          console.log("Downloading remote image for saving...");
          // Use a unique filename with timestamp to avoid conflicts
          const timestamp = new Date().getTime();
          const downloadPath = FileSystem.cacheDirectory + 'saving_colorized_image_' + timestamp + '.jpg';
          
          const downloadResult = await FileSystem.downloadAsync(
            colorizedImage,
            downloadPath
          );
        
          if (downloadResult && downloadResult.status === 200) {
            validUri = downloadResult.uri;
            downloaded = true;
            console.log("Download successful, uri:", validUri.substring(0, 50) + "...");
            
            // Verify the downloaded file exists and has content
            const fileInfo = await FileSystem.getInfoAsync(validUri);
            if (!fileInfo.exists || fileInfo.size === 0) {
              console.error("Downloaded file is empty or doesn't exist");
              // Fall back to the original URL
              validUri = colorizedImage;
              downloaded = false;
            }
          } else {
            console.error("Download failed with status:", downloadResult ? downloadResult.status : "null result");
            
            // Try an alternative download approach
            try {
              console.log("Attempting alternative download method...");
              const response = await fetch(colorizedImage);
              if (response.ok) {
                const blob = await response.blob();
                // We can't directly save blobs in React Native, so we'll stick with the original URL
                console.log("Content fetched successfully, but using original URL");
              } else {
                console.error("Alternative fetch failed with status:", response.status);
              }
            } catch (fetchError) {
              console.error("Alternative fetch method failed:", fetchError);
            }
          }
        } catch (downloadErr) {
          console.error("Error downloading image for saving:", downloadErr);
          // Continue with original URI as fallback
        }
      }
      
      // Final check that we have something to save
      if (!validUri) {
        throw new Error("No valid image URI to save");
      }
      
      console.log("Proceeding to save with URI:", validUri.substring(0, 50) + "...");
      
      // Save using GalleryService but don't show its alert
      try {
        await GalleryService.saveImage(
          validUri, 
          user.id,
          isPremium,
          false, // Don't show the GalleryService alert
          showingEnhancedComparison ? "Face Enhancement" : "Colorized" // Set appropriate title
        );
        hapticFeedback.success();
        
        // Show our own success alert with option to view saved image in gallery
        Alert.alert(
          "Success", 
          "Image saved successfully", 
          [
            {
              text: "View in Gallery", 
              onPress: () => {
                // Clear gallery cache before navigating
                GalleryService.clearCache();
                // Navigate to Gallery tab
                navigation.navigate("Gallery" as never);
              }
            },
            {
              text: "OK",
              style: "cancel"
            }
          ]
        );
      } catch (saveError) {
        console.error("Error from GalleryService.saveImage:", saveError);
        
        // If the service failed but we have a downloaded copy, try a direct save as fallback
        if (downloaded) {
          try {
            console.log("Trying direct save to media library as fallback");
            
            // First save to device gallery directly
            await MediaLibrary.saveToLibraryAsync(validUri);
            
            // Also save to the app's local gallery so it appears in the gallery screen
            try {
              console.log("Saving to app's local gallery");
              await GalleryService.saveImageToLocalGallery(validUri);
              console.log("Successfully saved to local gallery");
              
              // Clear the gallery cache to ensure the new image shows up
              GalleryService.clearCache();
              
              hapticFeedback.success();
              // Show success alert with option to view saved image in gallery
              Alert.alert(
                "Success", 
                "Image saved successfully", 
                [
                  {
                    text: "View in Gallery", 
                    onPress: () => navigation.navigate("Gallery" as never)
                  },
                  {
                    text: "OK",
                    style: "cancel"
                  }
                ]
              );
            } catch (localGalleryError) {
              console.error("Error saving to app's local gallery:", localGalleryError);
              
              // Still show success for the device gallery save even if app gallery fails
              hapticFeedback.success();
              Alert.alert(
                "Success", 
                "Image saved to device gallery", 
                [
                  {
                    text: "View in Gallery", 
                    onPress: () => {
                      // Clear gallery cache before navigating
                      GalleryService.clearCache();
                      // Navigate to Gallery tab
                      navigation.navigate("Gallery" as never);
                    }
                  },
                  {
                    text: "OK",
                    style: "cancel"
                  }
                ]
              );
            }
            return;
          } catch (directSaveError) {
            console.error("Direct save fallback failed:", directSaveError);
          }
        }
        
        // If we get here, all save attempts failed
        throw saveError;
      }
    } catch (error) {
      console.error("Error saving image:", error);
      hapticFeedback.error();
      Alert.alert("Save Failed", "Failed to save image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }
  
  // Reset to start over
  const startOver = () => {
    setImage(null)
    setColorizedImage(null)
    setSliderAnimationComplete(false)
    // Reset animation state
    setSliderEntranceComplete(false)
    // Ensure scrolling is enabled when going back to main screen
    setScrollEnabled(true);
  }

  // Handlers for the slider
  const onMoveStart = () => {
    // Ensure scrolling is disabled when slider is being used
    requestAnimationFrame(() => {
      setScrollEnabled(false);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  
  const onMoveEnd = () => {
    // Ensure scrolling is re-enabled when slider interaction ends
    requestAnimationFrame(() => {
      setScrollEnabled(true);
    });
  }

  // Custom Dragger component for the slider - simplified white circle and line
  const CustomDragger = () => (
    <View style={styles.customDragger}>
      <View style={styles.verticalLine} />
      <View style={styles.draggerHandle} />
    </View>
  );

  // Handle example press - changed to a full-screen approach
  const handleExamplePress = useCallback((example: typeof FEATURED_EXAMPLES[0]) => {
    setSelectedExample(example);
    // Use a timeout to ensure smooth transition
    setTimeout(() => {
      setShowFullScreenExample(true);
    }, 100);
  }, [setSelectedExample, setShowFullScreenExample]);
  
  // Update the modal container layout handler and functions
  const handleExampleContainerLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    const { width: layoutWidth } = event.nativeEvent.layout;
    setExampleContainerWidth(layoutWidth);
  }, []);
  
  // Handlers for the example slider
  const onExampleMoveStart = () => {
    setExampleScrollEnabled(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onExampleMoveEnd = () => {
    setExampleScrollEnabled(true);
  };

  // Function to close example viewer
  const closeExample = () => {
    setShowFullScreenExample(false);
    setTimeout(() => {
      setSelectedExample(null);
    }, 300);
  };

  // Extracted and memoized FlatList item component
  const FeaturedExampleItem = React.memo(({ item, onPress }: { item: typeof FEATURED_EXAMPLES[0], onPress: (item: typeof FEATURED_EXAMPLES[0]) => void }) => (
    <TouchableOpacity 
      style={styles.exampleCard}
      onPress={() => onPress(item)}
    >
      <View style={styles.exampleImageContainer}>
        <ExpoImage 
          source={item.after}
          style={styles.exampleImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
        />
        <View style={styles.exampleOverlay}>
          <View style={styles.beforeAfterTag}>
            <Text style={styles.beforeAfterText}>Before / After</Text>
          </View>
        </View>
      </View>
      <Text style={styles.exampleTitle}>{item.title}</Text>
    </TouchableOpacity>
  ));

  // Enhance the share function with haptic feedback
  const handleShare = async () => {
    if (!colorizedImage) return;
    
    hapticFeedback.light(); // Feedback when button is pressed
    
    try {
      // First download the image to local file system
      const localUri = await FileSystem.downloadAsync(
        colorizedImage,
        FileSystem.cacheDirectory + 'shared_colorized_image.jpg'
      );
      
      if (localUri.status === 200) {
        const result = await Share.share({
          url: localUri.uri,
          message: 'Check out this photo I colorized with Colourise AI! 🎨',
        }, {
          dialogTitle: 'Share Your Colorized Photo',
          subject: 'My Colorized Photo from Colourise AI'
        });
        
        if (result.action === Share.sharedAction) {
          hapticFeedback.success(); // Success feedback when shared
        }
        
        // Clean up the temporary file
        try {
          await FileSystem.deleteAsync(localUri.uri, { idempotent: true });
        } catch (cleanupError) {
          console.warn("Failed to clean up temporary share file:", cleanupError);
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      hapticFeedback.error(); // Error feedback
      Alert.alert('Error', 'Failed to share the image');
    }
  };

  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  const handlePurchaseCredits = async (packageId: string) => {
    // TODO: Implement actual purchase logic
    Alert.alert('Purchase Credits', 'Payment integration coming soon!');
  };

  const closeCreditsModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setShowCreditsModal(false));
  };

  // Memoize the static content to prevent unnecessary re-renders
  const StaticContent = useMemo(() => {
    return (
      <>
        <TouchableOpacity style={styles.uploadPlaceholder} onPress={pickImage}>
          <ExpoImage 
            source={STATIC_ASSETS.uploadRectangle}
            style={styles.uploadBackground}
            contentFit="fill"
            cachePolicy="memory-disk"
          />
          <View style={styles.uploadContent}>
            <ExpoImage 
              source={STATIC_ASSETS.uploadIcon}
              style={styles.uploadIcon}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <Text style={styles.uploadText}>Upload an Image</Text>
            <Text style={styles.uploadSubtext}>Our AI will transform it into a colourised version</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.scanPhotoButton} onPress={takePhoto}>
          <ExpoImage 
            source={STATIC_ASSETS.scanButton}
            style={styles.scanButtonBackground}
            contentFit="fill"
            cachePolicy="memory-disk"
          />
          <View style={styles.scanButtonContent}>
            <Feather name="camera" size={20} color="black" />
            <Text style={styles.scanButtonText}>Scan Photo</Text>
          </View>
        </TouchableOpacity>
      </>
    );
  }, []);

  // Memoize the header content
  const HeaderContent = useMemo(() => {
    return (
      <View style={styles.header}>
        <BlurView
          tint="light"
          intensity={Platform.OS === 'ios' ? 50 : 100}
          style={styles.blurView}
        />
        {colorizedImage && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={startOver}
          >
            <Feather name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
        )}
        
        <View style={styles.logoContainer}>
          <ExpoImage 
            source={STATIC_ASSETS.logo}
            style={styles.logoImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
          />
        </View>
        
        <TouchableOpacity 
          style={styles.creditsContainer}
          onPress={() => setShowCreditsModal(true)}
          activeOpacity={0.7}
        >
          <ExpoImage 
            source={STATIC_ASSETS.diamond}
            style={styles.diamondIcon}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
          />
          <Text style={styles.creditsText}>{credits}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [colorizedImage, credits]);

  // Add this function to prefetch all static assets
  const prefetchStaticAssets = useCallback(async () => {
    try {
      // Instead of prefetching the require objects directly, convert them to URI strings first
      const logoUri = Image.resolveAssetSource(STATIC_ASSETS.logo).uri;
      const uploadRectangleUri = Image.resolveAssetSource(STATIC_ASSETS.uploadRectangle).uri;
      const uploadIconUri = Image.resolveAssetSource(STATIC_ASSETS.uploadIcon).uri;
      const scanButtonUri = Image.resolveAssetSource(STATIC_ASSETS.scanButton).uri;
      const diamondUri = Image.resolveAssetSource(STATIC_ASSETS.diamond).uri;
      
      // Prefetch using the resolved URIs
      await Promise.all([
        ExpoImage.prefetch(logoUri),
        ExpoImage.prefetch(uploadRectangleUri),
        ExpoImage.prefetch(uploadIconUri),
        ExpoImage.prefetch(scanButtonUri),
        ExpoImage.prefetch(diamondUri)
      ]);
      
      console.log('All static assets prefetched successfully');
    } catch (error) {
      console.error('Error prefetching assets:', error);
    }
  }, []);

  // Add this effect to prefetch assets when component mounts
  useEffect(() => {
    prefetchStaticAssets();
  }, []);

  // Update the premium features section to show toggle buttons
  const PremiumFeaturesSection = React.memo(() => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>AI Magic Features</Text>
      </View>
      
      <View style={styles.premiumFeaturesContainer}>
        {PREMIUM_FEATURES.map((feature, index) => (
          <TouchableOpacity
            key={feature.id}
            style={[
              styles.premiumFeatureCard,
              activeFeatures.includes(feature.id) && styles.premiumFeatureCardActive
            ]}
            onPress={() => togglePremiumFeature(feature.id)}
          >
            <View style={styles.premiumFeatureIconContainer}>
              <Ionicons 
                name={feature.icon} 
                size={32} 
                color={activeFeatures.includes(feature.id) ? "#ffffff" : "#6366f1"} 
              />
              <View style={styles.featureGlow} />
            </View>
            <Text style={[
              styles.premiumFeatureTitle,
              activeFeatures.includes(feature.id) && styles.premiumFeatureTitleActive
            ]}>
              {feature.title}
            </Text>
            <Text style={styles.premiumFeatureDescription}>{feature.description}</Text>
            <View style={[
              styles.premiumFeatureCredits,
              activeFeatures.includes(feature.id) && styles.premiumFeatureCreditsActive
            ]}>
              <ExpoImage 
                source={STATIC_ASSETS.diamond}
                style={styles.smallDiamond}
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
              />
              <Text style={[
                styles.premiumFeatureCreditValue,
                activeFeatures.includes(feature.id) && styles.premiumFeatureCreditValueActive
              ]}>
                {feature.credits}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ));

  // Add function to handle premium feature processing
  const applyPremiumFeature = async (featureId: string) => {
    if (!colorizedImage || !user) {
      Alert.alert("Error", "Please log in to use premium features");
      return;
    }

    const feature = PREMIUM_FEATURES.find(f => f.id === featureId);
    if (!feature) return;

    if (credits < feature.credits) {
      Alert.alert(
        "Insufficient Credits",
        `You need ${feature.credits} credits to use ${feature.title}. Please purchase more credits.`,
        [{ text: "OK" }]
      );
      return;
    }

    // Handle AI Scene Builder separately with modal
    if (featureId === '1') {
      setShowAISceneBuilderModal(true);
      return;
    }

    setIsPostProcessing(true);
    // Reset image loading state to trigger reload
    setIsColorizedImageLoaded(false);
    setSliderEntranceComplete(false);
    
    // Set this as the active feature
    setActiveFeatures([featureId]);
    
    // Store original colorized image for the slider
    const originalColorizedImage = colorizedImage;

    try {
      console.log(`Starting premium feature: ${feature.title}`);
      
      // Download the colorized image first
      const localUri = await FileSystem.downloadAsync(
        colorizedImage,
        FileSystem.cacheDirectory + 'temp_colorized.jpg'
      );

      if (localUri.status !== 200) {
        throw new Error("Failed to prepare image for enhancement");
      }
      
      console.log(`Downloaded colorized image to: ${localUri.uri}`);

      // For face enhancement or 4K upscaler, use Cloudinary upscale effect
      if (featureId === '2' || featureId === '3') {
        console.log(`Using Cloudinary for ${feature.title}`);
        
        // Use CloudinaryService to enhance the image
        const enhancedUri = await CloudinaryService.enhanceImage(
          localUri.uri, 
          featureId === '3' // true if it's the 4K upscaler
        );
        
        console.log(`Enhancement complete, URI: ${enhancedUri}`);
        
        // Update the colorized image with the enhanced version
        setColorizedImage(enhancedUri);
        
        // Force a refresh of the image display by explicitly preparing it
        // Pass true to skip showing the colorization animation after enhancement
        await prepareColorizedImage(enhancedUri, true);
        
        // Store the original and enhanced images for slider comparison
        AsyncStorage.setItem('original_colorized', originalColorizedImage);
        AsyncStorage.setItem('enhanced_image', enhancedUri);
      }
      
      // Deduct credits
      setCredits(prev => prev - feature.credits);
      
      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error applying premium feature:", error);
      
      // Show a more detailed error message
      let errorMessage = "There was a problem applying the enhancement.";
      if (error instanceof Error) {
        errorMessage += ` Details: ${error.message}`;
      }
      
      Alert.alert(
        "Enhancement Failed",
        errorMessage,
        [{ text: "OK" }]
      );
      
      // Reset loading state if there's an error
      setIsColorizedImageLoaded(true);
    } finally {
      setIsPostProcessing(false);
      // Make sure the processing state is reset
      setIsProcessing(false);
      // Clear active features after processing is complete
      setTimeout(() => {
        setActiveFeatures([]);
      }, 500);
    }
  };

  // Add handler for AI Scene Builder
  const handleAISceneBuilder = async (scene: string, customPrompt?: string) => {
    setShowAISceneBuilderModal(false);
    
    if (!colorizedImage || !user) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      return;
    }

    // Check OpenAI API key - this is no longer needed since we use a fixed key
    // if (!openAIKey) {
    //   Alert.alert(
    //     "OpenAI API Key Required",
    //     "Please add your OpenAI API key in the profile settings to use this feature.",
    //     [{ text: "OK" }]
    //   );
    //   return;
    // }

    setIsPostProcessing(true);
    setIsColorizedImageLoaded(false);
    setSliderEntranceComplete(false);
    setActiveFeatures(['1']);

    try {
      // No need to set API key anymore as we use a fixed key in the service
      // OpenAIService.setApiKey(openAIKey);

      // Generate the scene
      const sceneImageUri = await OpenAIService.generateScene({
        scene,
        customPrompt,
        originalImage: colorizedImage,
      });

      // Update the colorized image with the new scene
      setColorizedImage(sceneImageUri);
      
      // Prepare the new image
      await prepareColorizedImage(sceneImageUri, true);
      
      // Store the original and enhanced images for slider comparison
      AsyncStorage.setItem('original_colorized', colorizedImage);
      AsyncStorage.setItem('enhanced_image', sceneImageUri);
      
      // Update comparison state
      setShowingEnhancedComparison(true);
      setOriginalColorizedUri(colorizedImage);
      
      // Deduct credits
      setCredits(prev => prev - 10);
      
      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error generating AI scene:", error);
      
      Alert.alert(
        "Scene Generation Failed",
        "There was a problem generating your scene. Please try again.",
        [{ text: "OK" }]
      );
      
      setIsColorizedImageLoaded(true);
    } finally {
      setIsPostProcessing(false);
      setIsProcessing(false);
      setTimeout(() => {
        setActiveFeatures([]);
      }, 500);
    }
  };

  // Add an effect to ensure scrollEnabled is reset when component unmounts or colorized image changes
  useEffect(() => {
    // Enable scrolling when component mounts
    setScrollEnabled(true);
    
    // Reset to scrolling enabled when colorized image changes or unmounts
    return () => {
      setScrollEnabled(true);
    };
  }, [colorizedImage]);

  // Simple Premium Feature Card for the main page (non-interactive)
  const MainPagePremiumFeatureCard = React.memo(({ 
    feature,
    index = 0
  }: { 
    feature: typeof PREMIUM_FEATURES[0], 
    index?: number
  }) => {
    return (
      <FadeInView delay={index * 150} duration={400}>
        <View style={styles.mainPagePremiumCard}>
          {/* Feature Header with Image */}
          <View style={styles.premiumImageContainer}>
            <ExpoImage
              source={feature.image}
              style={styles.premiumImage}
              contentFit="cover"
              transition={300}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
              style={styles.premiumImageOverlay}
            />
            <View style={styles.creditsBadgeAbsolute}>
              <ExpoImage 
                source={STATIC_ASSETS.diamond}
                style={styles.premiumDiamondIcon}
                contentFit="contain"
              />
              <Text style={styles.premiumCreditsText}>{feature.credits}</Text>
            </View>
          </View>

          {/* Card content */}
          <View style={styles.premiumCardContent}>
            <Text style={styles.premiumCardTitle}>{feature.title}</Text>
            <Text style={styles.premiumCardDescription}>{feature.description}</Text>
            
            <View style={styles.benefitsList}>
              {feature.benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <View style={styles.benefitCheck}>
                    <Feather name="check" size={12} color="#6366f1" />
                  </View>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </FadeInView>
    );
  });

  // Premium Features Showcase for the main page
  const PremiumFeaturesShowcase = React.memo(() => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Premium AI Features</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Enhance your photos with our advanced AI models
      </Text>
      
      <View style={styles.mainPagePremiumCardsContainer}>
        {PREMIUM_FEATURES.map((feature, index) => (
          <MainPagePremiumFeatureCard
            key={feature.id}
            feature={feature}
            index={index}
          />
        ))}
      </View>
    </View>
  ));

  // Add a useEffect to request necessary permissions when component mounts
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // Check existing permissions first
        const existingMediaPermission = await MediaLibrary.getPermissionsAsync();
        console.log('Existing Media Library Permission:', existingMediaPermission.status);
        
        // Only request if not already granted, to avoid unnecessary prompts
        if (existingMediaPermission.status !== 'granted') {
          // Request media library permissions
          const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
          console.log('Media Library Permission:', mediaLibraryPermission.status);
          
          // Set permission state
          setHasMediaLibraryPermission(mediaLibraryPermission.status === 'granted');
        } else {
          setHasMediaLibraryPermission(true);
        }
        
        // Check existing camera permission
        const existingCameraPermission = await ImagePicker.getCameraPermissionsAsync();
        console.log('Existing Camera Permission:', existingCameraPermission.status);
        
        // Only request if not already granted
        if (existingCameraPermission.status !== 'granted') {
          // Request camera permissions
          const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
          console.log('Camera Permission:', cameraPermission.status);
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    };
    
    // Request permissions when component mounts
    requestPermissions();
  }, []);

  // After enhancement is done, check if we should show comparison
  useEffect(() => {
    const checkForEnhancedComparison = async () => {
      if (!isPostProcessing && colorizedImage) {
        try {
          // Check if we have stored original and enhanced images
          const originalUri = await AsyncStorage.getItem('original_colorized');
          const enhancedUri = await AsyncStorage.getItem('enhanced_image');
          
          if (originalUri && enhancedUri && enhancedUri === colorizedImage) {
            // We're showing an enhanced image, so update state for comparison
            setShowingEnhancedComparison(true);
            setOriginalColorizedUri(originalUri);
          } else {
            setShowingEnhancedComparison(false);
            setOriginalColorizedUri(null);
          }
        } catch (error) {
          console.error('Error checking for enhanced comparison:', error);
          setShowingEnhancedComparison(false);
        }
      }
    };
    
    checkForEnhancedComparison();
  }, [isPostProcessing, colorizedImage]);
  
  // Update the slider labels based on whether we're showing enhanced comparison
  const getBeforeLabel = useCallback(() => {
    if (showingEnhancedComparison) return "Colorized";
    return "Original";
  }, [showingEnhancedComparison]);
  
  const getAfterLabel = useCallback(() => {
    if (showingEnhancedComparison) return "Enhanced";
    return "Colorized";
  }, [showingEnhancedComparison]);
  
  // Get the correct image URI for the "before" side of the slider
  const getBeforeImageUri = useCallback(() => {
    if (showingEnhancedComparison && originalColorizedUri) {
      return originalColorizedUri;
    }
    return image!;
  }, [showingEnhancedComparison, originalColorizedUri, image]);

  return (
    <SafeAreaView style={styles.container}>
      {!showFullScreenExample ? (
        <>
          {HeaderContent}
          <ScrollView style={styles.content} scrollEnabled={scrollEnabled}>
            <View style={styles.uploadSection}>
              {!image ? (
                <>
                  {StaticContent}
                  {/* How It Works - 3 Step Process */}
                  <View style={styles.processContainer}>
                    <Text style={styles.processTitle}>How It Works</Text>
                    
                    <View style={styles.stepsContainer}>
                      {/* Step 1 */}
                      <View style={styles.step}>
                        <View style={styles.stepNumberContainer}>
                          <Text style={styles.stepNumber}>1</Text>
                        </View>
                        <View style={styles.stepContent}>
                          <Text style={styles.stepTitle}>Upload</Text>
                          <Text style={styles.stepDescription}>Select a black & white photo from your gallery</Text>
                        </View>
                      </View>
                      
                      {/* Connector */}
                      <View style={styles.connector} />
                      
                      {/* Step 2 */}
                      <View style={styles.step}>
                        <View style={styles.stepNumberContainer}>
                          <Text style={styles.stepNumber}>2</Text>
                        </View>
                        <View style={styles.stepContent}>
                          <Text style={styles.stepTitle}>AI Processing</Text>
                          <Text style={styles.stepDescription}>Our advanced AI analyzes and adds realistic colors</Text>
                        </View>
                      </View>
                      
                      {/* Connector */}
                      <View style={styles.connector} />
                      
                      {/* Step 3 */}
                      <View style={styles.step}>
                        <View style={styles.stepNumberContainer}>
                          <Text style={styles.stepNumber}>3</Text>
                        </View>
                        <View style={styles.stepContent}>
                          <Text style={styles.stepTitle}>Compare & Save</Text>
                          <Text style={styles.stepDescription}>View the result and save it to your gallery</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  {/* Featured Examples Section */}
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Featured Examples</Text>
                    </View>
                    
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={FEATURED_EXAMPLES}
                      keyExtractor={(item) => item.id}
                      style={styles.examplesList}
                      renderItem={({ item }) => (
                        <FeaturedExampleItem item={item} onPress={handleExamplePress} />
                      )}
                      contentContainerStyle={styles.examplesListContent}
                    />
                  </View>
                  
                  {/* Premium Features Showcase */}
                  <PremiumFeaturesShowcase />
                  
                  {/* Pro Tips Section */}
                  <ProTipsSection />
                </>
              ) : (
                <>
                  <View 
                    style={styles.compareContainer} 
                    onLayout={handleContainerLayout}
                  >
                    {colorizedImage ? (
                      <>
                        {/* Show loading state until the image is loaded */}
                        {(!isColorizedImageLoaded || isProcessing || isPostProcessing) ? (
                          <View style={styles.imagePreviewContainer}>
                            <ExpoImage 
                              source={{ uri: isPostProcessing && image ? image : colorizedImage }} 
                              style={styles.imagePreview} 
                              placeholder={{ blurhash }} 
                              contentFit="cover" 
                            />
                            <View style={styles.processingOverlay}>
                              {isPostProcessing ? (
                                // Only show enhancement loading during post-processing
                                <EnhancementLoadingIndicator 
                                  enhancementType={
                                    activeFeatures.includes('1') ? 'AI Scene Generation' :
                                    activeFeatures.includes('3') ? '4K Upscaling' : 
                                    activeFeatures.includes('2') ? 'Face Enhancement' : 
                                    'Image Enhancement'
                                  }
                                  imageHeight={450}
                                  colorizedImage={colorizedImage}
                                />
                              ) : isProcessing ? (
                                // Show AI scanning animation during initial colorization only
                                <AIScanningAnimation imageHeight={450} />
                              ) : null}
                            </View>
                          </View>
                        ) : (
                          /* Simple fade-in animation for the slider */
                          <>
                            <Animated.View 
                              style={[
                                styles.sliderContainer,
                                { 
                                  opacity: sliderFadeAnim
                                }
                              ]}
                            >
                              <Compare 
                                initial={containerWidth / 2} 
                                draggerWidth={60} 
                                width={containerWidth}
                                height={450}
                                onMoveStart={onMoveStart}
                                onMoveEnd={onMoveEnd}
                              >
                                <Before>
                                  <ExpoImage
                                    source={{ uri: getBeforeImageUri() }}
                                    style={{ width: containerWidth, height: 450 }}
                                    contentFit="cover"
                                    placeholder={{ blurhash }}
                                  />
                                  <View style={styles.rightLabelWrapper}>
                                    <Text style={styles.compareLabel}>{getBeforeLabel()}</Text>
                                  </View>
                                </Before>
                                <After>
                                  <ExpoImage
                                    source={{ uri: colorizedImage! }}
                                    style={{ width: containerWidth, height: 450 }}
                                    contentFit="cover"
                                    placeholder={{ blurhash }}
                                    cachePolicy="memory-disk"
                                    priority="high"
                                    onLoad={() => {
                                      // Start the fade-in animation when the image is loaded
                                      Animated.timing(sliderFadeAnim, {
                                        toValue: 1,
                                        duration: 400,
                                        easing: Easing.ease,
                                        useNativeDriver: true
                                      }).start(() => {
                                        // Enable buttons after fade-in is complete
                                        setSliderEntranceComplete(true);
                                      });
                                    }}
                                  />
                                  <View style={styles.leftLabelWrapper}>
                                    <Text style={styles.compareLabel}>{getAfterLabel()}</Text>
                                  </View>
                                </After>
                                <Dragger>
                                  <CustomDragger />
                                </Dragger>
                              </Compare>
                            </Animated.View>
                          </>
                        )}
                      </>
                    ) : (
                      <View style={styles.imagePreviewContainer}>
                        <ExpoImage source={{ uri: image! }} style={styles.imagePreview} placeholder={{ blurhash }} contentFit="cover" />
                        
                        {isProcessing ? (
                          <View style={styles.processingOverlay}>
                            <AIScanningAnimation imageHeight={450} />
                          </View>
                        ) : (
                          <View style={styles.imageActions}>
                            <TouchableOpacity style={styles.imageActionButton} onPress={() => setImage(null)}>
                              <Feather name="x" size={20} color="#94a3b8" />
                              <Text style={styles.imageActionText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  
                  {/* Action Buttons - Only show after animation is complete */}
                  {colorizedImage && isColorizedImageLoaded && !isProcessing && (
                    <Animated.View 
                      style={{ 
                        opacity: sliderEntranceComplete ? 1 : 0,
                        transform: [{ 
                          translateY: sliderEntranceComplete ? 0 : 20 
                        }],
                      }}
                    >
                      <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity 
                          style={styles.saveButtonContainer} 
                          onPress={saveImage}
                          disabled={isSaving || isPostProcessing || !sliderEntranceComplete}
                        >
                          <LinearGradient
                            colors={['#FF3B8B', '#A537FD', '#38B8F2']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.saveGradientButton, (isSaving || isPostProcessing) && styles.saveButtonDisabled]}
                          >
                            {isSaving || isPostProcessing ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Feather name="download" size={20} color="white" />
                            )}
                            <Text style={styles.saveButtonText}>
                              {isSaving ? 'Saving...' : isPostProcessing ? 'Processing...' : 'Save Image'}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.shareButtonContainer} 
                          onPress={handleShare}
                          disabled={isPostProcessing || !sliderEntranceComplete}
                        >
                          <View style={styles.shareButton}>
                            <Feather name="share-2" size={20} color="#1e293b" />
                            <Text style={styles.shareButtonText}>Share</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                      
                      {/* Premium Features Section */}
                      <View style={styles.premiumFeaturesSection}>
                        <View style={styles.premiumHeader}>
                          <Text style={styles.premiumTitle}>Use our most powerful AI models</Text>
                          <Text style={styles.premiumSubtitle}>
                            Take your colorized photo to the next level with our premium enhancements
                          </Text>
                        </View>

                        <View style={styles.premiumCardsContainer}>
                          {PREMIUM_FEATURES.map((feature, index) => (
                            <PremiumFeatureCard
                              key={feature.id}
                              feature={feature}
                              onPress={() => applyPremiumFeature(feature.id)}
                              isProcessing={isPostProcessing}
                              index={index}
                            />
                          ))}
                        </View>
                      </View>
                    </Animated.View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </>
      ) : (
        // Full-screen example view when an example is selected
        <View style={styles.fullScreenExampleContainer}>
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.exampleHeader}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={closeExample}
              hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
            >
              <Feather name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.exampleHeaderTitle}>{selectedExample?.title}</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          {selectedExample && (
            <View style={styles.exampleContent}>
              <View 
                style={styles.exampleCompareContainer} 
                onLayout={handleExampleContainerLayout}
              >
                <Compare 
                  initial={exampleContainerWidth / 2} 
                  draggerWidth={60} 
                  width={exampleContainerWidth}
                  height={450}
                  onMoveStart={() => {}}
                  onMoveEnd={() => {}}
                >
                  <After>
                    <ExpoImage
                      source={selectedExample.after}
                      style={{ width: exampleContainerWidth, height: 450 }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      priority="high"
                    />
                    <View style={styles.rightLabelWrapper}>
                      <Text style={styles.compareLabel}>After</Text>
                    </View>
                  </After>
                  <Before>
                    <ExpoImage
                      source={selectedExample.before}
                      style={{ width: exampleContainerWidth, height: 450 }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      priority="high"
                    />
                    <View style={styles.leftLabelWrapper}>
                      <Text style={styles.compareLabel}>Before</Text>
                    </View>
                  </Before>
                  <Dragger>
                    <CustomDragger />
                  </Dragger>
                </Compare>
              </View>
              
              <TouchableOpacity 
                style={styles.closeExampleButton}
                onPress={closeExample}
              >
                <Text style={styles.closeExampleButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Credits Purchase Modal */}
      <Modal
        visible={showCreditsModal}
        transparent
        animationType="none"
        statusBarTranslucent
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
                <Feather name="x" size={24} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.creditsModalTitle}>Get More Credits</Text>
              <View style={styles.closeButton} />
            </View>

            <ScrollView 
              style={styles.creditsPackagesList}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.creditsModalSubtitle}>
                Choose a credit package to enhance and colorize more photos
              </Text>

              {CREDIT_PACKAGES.map((pkg) => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.creditPackage,
                    selectedPackage === pkg.id && styles.selectedPackage,
                    pkg.popular && styles.popularPackage,
                  ]}
                  onPress={() => setSelectedPackage(pkg.id)}
                >
                  {pkg.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Most Popular</Text>
                    </View>
                  )}
                  <View style={styles.packageHeader}>
                    <View style={styles.packageCredits}>
                      <ExpoImage 
                        source={STATIC_ASSETS.diamond}
                        style={styles.packageDiamond}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        priority="high"
                      />
                      <Text style={styles.packageCreditsText}>{pkg.credits}</Text>
                    </View>
                    <Text style={styles.packagePrice}>${pkg.price}</Text>
                  </View>
                  <Text style={styles.packageDescription}>{pkg.description}</Text>
                  {pkg.savings && (
                    <Text style={styles.packageSavings}>{pkg.savings}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

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
                  Purchase Credits
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* AI Scene Builder Modal */}
      <AISceneBuilderModal
        visible={showAISceneBuilderModal}
        onClose={() => setShowAISceneBuilderModal(false)}
        onSelectScene={handleAISceneBuilder}
        isProcessing={isPostProcessing}
        credits={credits}
      />
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
    borderBottomColor: "rgba(241, 245, 249, 0.3)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 10,
  },
  backButton: {
    position: "absolute",
    left: 15,
    zIndex: 10,
  },
  logoImage: {
    height: 40,
    width: 200,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsContainer: {
    position: "absolute",
    right: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  diamondIcon: {
    width: 20,
    height: 20,
  },
  creditsText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  uploadSection: {
    marginBottom: 20,
    marginTop: 30,
  },
  uploadPlaceholder: {
    position: "relative",
    borderRadius: 15,
    overflow: "hidden",
    height: 450,
  },
  uploadBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  uploadContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    zIndex: 1,
  },
  uploadIcon: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  uploadText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 15,
  },
  uploadSubtext: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 20,
  },
  imagePreviewContainer: {
    borderRadius: 15,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 450,
    borderRadius: 15,
  },
  imageActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  imageActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 10,
  },
  imageActionText: {
    fontWeight: "500",
  },
  compareContainer: {
    position: 'relative',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  sliderContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    height: 450,
  },
  customDragger: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalLine: {
    position: 'absolute',
    width: 3,
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  draggerHandle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  leftLabelWrapper: {
    position: 'absolute',
    top: 15,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 50,
    overflow: 'hidden',
  },
  rightLabelWrapper: {
    position: 'absolute',
    top: 15,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 50,
    overflow: 'hidden',
  },
  compareLabel: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  actionButtonsContainer: {
    gap: 15,
    marginBottom: 20,
  },
  saveButtonContainer: {
    marginHorizontal: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderRadius: 10,
    overflow: 'hidden',
  },
  saveGradientButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  upscaleButtonContainer: {
    marginHorizontal: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: '#f8fafc',
  },
  upscaleButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  upscaleButtonText: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  smallDiamondIcon: {
    width: 18,
    height: 18,
    marginRight: 4,
  },
  creditsBadgeText: {
    color: '#4338ca',
    fontWeight: '700',
    fontSize: 14,
  },
  startOverButtonContainer: {
    marginHorizontal: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "#64748b",
  },
  startOverButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'white',
  },
  startOverButtonText: {
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  processingText: {
    marginTop: 10,
    fontSize: 16,
    color: "white",
    fontWeight: "500",
  },
  processingSubText: {
    marginTop: 5,
    fontSize: 14,
    color: "white",
    fontWeight: "300",
    opacity: 0.9,
  },
  processContainer: {
    marginTop: 30,
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  processTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 20,
    textAlign: "center",
  },
  stepsContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  stepNumber: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  connector: {
    width: 2,
    height: 20,
    backgroundColor: "#e2e8f0",
    marginLeft: 15,
    marginVertical: 8,
  },
  sectionContainer: {
    marginTop: 40,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  creditsValueText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  examplesList: {
    overflow: 'visible',
  },
  examplesListContent: {
    paddingHorizontal: 5,
    paddingBottom: 10,
  },
  exampleCard: {
    width: 200,
    marginRight: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exampleImageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  exampleImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  exampleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  beforeAfterTag: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  beforeAfterText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  exampleTitle: {
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  premiumFeaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 5,
  },
  premiumFeatureCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  premiumFeatureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  featureGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#6366f1',
    opacity: 0.15,
    transform: [{ scale: 1.2 }],
  },
  premiumFeatureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  premiumFeatureDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  premiumFeatureCredits: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tipsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  tipIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tipIconGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#6366f1',
    opacity: 0.15,
    transform: [{ scale: 1.2 }],
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  cameraButton: {
    marginTop: 25,
    marginBottom: 40,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  cameraButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    padding: 0,
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  modalCompareWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCompareContainer: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  modalCloseButton: {
    marginTop: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 30,
  },
  modalCloseButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // Add new full-screen example styles
  fullScreenExampleContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
  },
  exampleHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 24, // Same width as the back button for proper centering
  },
  exampleContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  exampleCompareContainer: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
  },
  closeExampleButton: {
    marginTop: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  closeExampleButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  customSliderLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: '#FFFFFF',
    zIndex: 2,
    alignSelf: 'center',
  },
  customDefaultDragger: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  scanPhotoButton: {
    position: 'relative',
    borderRadius: 15,
    overflow: 'hidden',
    height: 70,
    marginTop: 15,
  },
  scanButtonBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 10,
  },
  scanButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
  shareButtonContainer: {
    marginHorizontal: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: '#f8fafc',
  },
  shareButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  shareButtonText: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  creditsModalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  creditsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  creditsModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  creditsModalSubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  creditsPackagesList: {
    paddingHorizontal: 20,
  },
  creditPackage: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPackage: {
    borderColor: '#6366f1',
    backgroundColor: '#f5f3ff',
  },
  popularPackage: {
    backgroundColor: '#fff',
    borderColor: '#6366f1',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageCredits: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packageDiamond: {
    width: 24,
    height: 24,
  },
  packageCreditsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338ca',
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  packageDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  packageSavings: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 8,
  },
  purchaseButton: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },
  smallDiamond: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  premiumFeatureCreditValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  premiumFeatureCardActive: {
    backgroundColor: '#6366f1',
  },
  premiumFeatureTitleActive: {
    color: '#ffffff',
  },
  premiumFeatureCreditsActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  premiumFeatureCreditValueActive: {
    color: '#ffffff',
  },
  premiumFeatureButton: {
    marginHorizontal: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  premiumFeatureButtonContent: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumFeatureButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  premiumFeaturesSection: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  premiumHeader: {
    marginBottom: 35, // Increased from 24
  },
  premiumTitle: {
    fontSize: 28, // Increased from 24
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 14, // Increased from 8
  },
  premiumSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10, // Added to create more space before first card
  },
  premiumCardsContainer: {
    gap: 24,
  },
  premiumCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  premiumImageContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
  },
  premiumImage: {
    width: '100%',
    height: '100%',
  },
  premiumImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  creditsBadgeAbsolute: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumDiamondIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  premiumCreditsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338ca',
  },
  premiumCardContent: {
    padding: 24,
  },
  premiumIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  premiumCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  premiumCardDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitsList: {
    gap: 12,
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: 14,
    color: '#475569',
  },
  premiumActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  premiumActionButtonDisabled: {
    opacity: 0.7,
  },
  premiumActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  premiumActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  premiumGradientBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: -20,
    right: -20,
    height: 3,
    zIndex: 10,
  },
  scanLineGradient: {
    flex: 1,
    height: '100%',
  },
  detectionBox: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectionBoxCorner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  processingTextContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  aiTextContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  aiAnalyzingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    opacity: 0.8,
  },
  aiStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiStatusLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 10,
  },
  aiStatusDotContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  aiStatusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  revealAnimationContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 15,
  },
  outlineSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  animatedSliderLine: {
    position: 'absolute',
    width: 3,
    height: '100%',
    backgroundColor: 'white',
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sliderLineHandle: {
    position: 'absolute',
    top: '50%',
    left: -15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    transform: [{ translateY: -18 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 20,
  },
  beforeImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, // Lower zIndex so it's behind the slider
  },
  afterImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0, // Lowest zIndex to be behind everything
  },
  mainPagePremiumCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden', 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mainPagePremiumCardsContainer: {
    paddingHorizontal: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 5,
    marginBottom: 20,
  },
  enhancementLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
  },
  enhancementAnimationContainer: {
    position: 'absolute',
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    top: 50, // Move up from center
  },
  faceRecognitionBox: {
    width: 180,
    height: 220,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 100,
    position: 'relative',
  },
  boxCorner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
  },
  topLeftCorner: {
    top: 20,
    left: 30,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 8,
  },
  topRightCorner: {
    top: 20,
    right: 30,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 8,
  },
  bottomLeftCorner: {
    bottom: 20,
    left: 30,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 8,
  },
  bottomRightCorner: {
    bottom: 20,
    right: 30,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },
  faceDetailMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailMarker1: {
    top: 60,
    left: 50,
  },
  detailMarker2: {
    top: 70,
    right: 50,
  },
  detailMarker3: {
    bottom: 80,
    left: 70,
  },
  markerGlow: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    opacity: 0.4,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    opacity: 0.7,
  },
  enhancementTextContainer: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    alignItems: 'center',
  },
  enhancementTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  spinnerContainer: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  spinner: {
    width: '100%',
    height: '100%',
    borderRadius: 9,
    overflow: 'hidden',
  },
  spinnerGradient: {
    width: '100%',
    height: '100%',
  },
  progressText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  enhancementProgressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  enhancementProgressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressStep: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressStepActive: {
    backgroundColor: '#ffffff',
  },
  enhancementProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  enhancementProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentContainer: {
    width: '100%',
    alignItems: 'flex-end',
  },
  progressPercentText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  enhancementDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  // New 4K Upscaler styles
  upscalerAnimationContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pixelGridContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upscaleScanLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 4,
    zIndex: 10,
    width: 280,
  },
  upscaleScanLineGradient: {
    flex: 1,
    height: '100%',
  },
  resolutionTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  resolutionText: {
    fontSize: 48,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
  },
  resolutionSubtext: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 4,
    marginTop: -8,
  },
  newFeatureRibbon: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#FF3B8B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  newFeatureRibbonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  newFeatureIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
  },
  newFeatureText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  sceneGenerationContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sceneGenerationIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sceneGenerationGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#6366f1',
    opacity: 0.15,
    transform: [{ scale: 1.2 }],
  },
  sceneGenerationText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
})
