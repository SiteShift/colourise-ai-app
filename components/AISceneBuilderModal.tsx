import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

// Import diamond icon - using require to match the header implementation
const DIAMOND_ICON = require("../assets/diamond (1).png");

interface SceneCard {
  id: string;
  title: string;
  description: string;
  prompt: string;
  gradient: [string, string, string];
  icon: string;
  image: any;
}

const SCENE_CARDS: SceneCard[] = [
  {
    id: "1920s-newyork",
    title: "1920s New York",
    description: "Transform into a jazz age socialite at a speakeasy",
    prompt: "1920s New York speakeasy scene with authentic period clothing, Art Deco interior, jazz atmosphere",
    gradient: ["#1a1a2e", "#16213e", "#0f3460"] as [string, string, string],
    icon: "🏙️",
    image: require("../assets/AIscenebuilder-image-cards/1920s-new-york_compressed.webp"),
  },
  {
    id: "ancient-rome",
    title: "Ancient Rome",
    description: "Become a Roman citizen in the mighty empire",
    prompt: "Ancient Roman scene as a noble citizen wearing toga, in the Roman Forum with classical architecture",
    gradient: ["#8B4513", "#A0522D", "#CD853F"] as [string, string, string],
    icon: "🏛️",
    image: require("../assets/AIscenebuilder-image-cards/ancient-rome_compressed.webp"),
  },
  {
    id: "ww2",
    title: "WW2",
    description: "Step into the 1940s as a wartime hero",
    prompt: "World War II era scene in 1940s military or civilian attire, period-appropriate setting",
    gradient: ["#2C3E50", "#34495E", "#1B2631"] as [string, string, string],
    icon: "⚔️",
    image: require("../assets/AIscenebuilder-image-cards/ww2_compressed.webp"),
  },
  {
    id: "cyberpunk",
    title: "Cyberpunk City",
    description: "Enter the neon future as a cyberpunk rebel",
    prompt: "Futuristic cyberpunk city scene with neon lights, high-tech clothing, flying vehicles in background",
    gradient: ["#FF006E", "#8338EC", "#3A86FF"] as [string, string, string],
    icon: "🌃",
    image: require("../assets/AIscenebuilder-image-cards/cyberpunk_compressed.webp"),
  },
  {
    id: "old-hollywood",
    title: "Old Hollywood Set",
    description: "Become a golden age movie star on set",
    prompt: "Classic Hollywood golden age scene on a movie set, vintage glamour styling, black and white film aesthetic",
    gradient: ["#1a1a1a", "#4a4a4a", "#2a2a2a"] as [string, string, string],
    icon: "🎬",
    image: require("../assets/AIscenebuilder-image-cards/old-hollywood-set_compressed.webp"),
  },
  {
    id: "wild-west",
    title: "Wild West",
    description: "Ride into the frontier as a rugged cowboy",
    prompt: "Wild West frontier scene with cowboy attire, saloon setting, dusty streets and period-accurate clothing",
    gradient: ["#8B4513", "#D2691E", "#CD853F"] as [string, string, string],
    icon: "🤠",
    image: require("../assets/AIscenebuilder-image-cards/wild-west_compressed.webp"),
  },
];

interface AISceneBuilderModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectScene: (scene: string, customPrompt?: string) => void;
  isProcessing: boolean;
  credits: number;
}

export function AISceneBuilderModal({
  visible,
  onClose,
  onSelectScene,
  isProcessing,
  credits,
}: AISceneBuilderModalProps) {
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Animation when modal opens
  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelectScene = (sceneId: string) => {
    if (selectedScene === sceneId) {
      // Unselect if clicking the same card
      setSelectedScene(null);
    } else {
      // Select the new card
      setSelectedScene(sceneId);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleGenerate = () => {
    if (credits < 10) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (selectedScene) {
      const scene = SCENE_CARDS.find((s) => s.id === selectedScene);
      if (scene) {
        onSelectScene(scene.prompt);
      }
    } else if (customPrompt.trim()) {
      onSelectScene("", customPrompt.trim());
    }
  };

  const canGenerate = (selectedScene || customPrompt.trim()) && credits >= 10;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <BlurView intensity={30} style={StyleSheet.absoluteFill} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
          
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>AI Scene Builder</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.subtitle}>
                Transport them into Another World!
              </Text>

              {/* Custom Scene Section */}
              <View style={styles.customSceneSection}>
                <Text style={styles.customSceneTitle}>Create your Own Scene</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="Describe the scene you want to create..."
                  placeholderTextColor="#94a3b8"
                  value={customPrompt}
                  onChangeText={setCustomPrompt}
                  multiline
                  maxLength={200}
                />
                <Text style={styles.characterCount}>
                  {customPrompt.length}/200
                </Text>
              </View>

              {/* Scene Cards */}
              <View style={styles.sceneGrid}>
                {SCENE_CARDS.map((scene) => (
                  <TouchableOpacity
                    key={scene.id}
                    style={[
                      styles.sceneCard,
                      selectedScene === scene.id && styles.sceneCardSelected,
                    ]}
                    onPress={() => handleSelectScene(scene.id)}
                    activeOpacity={0.8}
                  >
                    <ExpoImage
                      source={scene.image}
                      style={styles.sceneCardImage}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
                      style={styles.sceneCardOverlay}
                    >
                      <View style={styles.sceneCardContent}>
                        <Text style={styles.sceneTitle}>{scene.title}</Text>
                        <Text style={styles.sceneDescription}>
                          {scene.description}
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Generate Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  !canGenerate && styles.generateButtonDisabled,
                ]}
                onPress={handleGenerate}
                disabled={!canGenerate || isProcessing}
              >
                <LinearGradient
                  colors={
                    canGenerate
                      ? ["#6366f1", "#4f46e5"]
                      : ["#e2e8f0", "#cbd5e1"]
                  }
                  style={styles.generateGradient}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Text style={styles.generateText}>
                        Generate
                      </Text>
                      <Image source={DIAMOND_ICON} style={styles.generateIcon} />
                      <Text style={styles.generateCredits}>10</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  sceneGrid: {
    flexDirection: "column",
    gap: 16,
    marginBottom: 24,
  },
  sceneCard: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2d3748",
    marginBottom: 0,
    position: "relative",
  },
  sceneCardSelected: {
    borderWidth: 3,
    borderColor: "#6366f1",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sceneCardImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sceneCardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  sceneCardContent: {
    alignSelf: "stretch",
  },
  sceneTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 4,
  },
  sceneDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.95)",
    lineHeight: 16,
  },
  customSceneSection: {
    marginBottom: 20,
  },
  customSceneTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  customInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#1e293b",
    minHeight: 80,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "white",
  },
  generateButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  generateButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  generateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 6,
  },
  generateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  generateIcon: {
    width: 18,
    height: 18,
    marginHorizontal: 4,
  },
  generateCredits: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
}); 