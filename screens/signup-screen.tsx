import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ImageBackground,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/auth-context"
import { AuthService } from "../lib/auth-service"
import { Feather } from "@expo/vector-icons"

const { width, height } = Dimensions.get("window")

export default function SignupScreen() {
  const navigation = useNavigation()
  const { signup, signInWithGoogle, signInWithApple } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isAppleLoading, setIsAppleLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [isAppleAvailable, setIsAppleAvailable] = useState(false)

  useEffect(() => {
    // Check if Apple Sign-In is available
    AuthService.isAppleSignInAvailable().then(setIsAppleAvailable)
  }, [])

  const handleSignup = async () => {
    if (email.trim() && password.trim()) {
      try {
        setIsEmailLoading(true)
        await signup(email, password, email.split("@")[0])
      } catch (error: any) {
        console.error("Signup error:", error)
        Alert.alert("Signup Failed", error.message || "Failed to sign up. Please try again.")
      } finally {
        setIsEmailLoading(false)
      }
    } else {
      Alert.alert("Missing Information", "Please enter email and password")
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      await signInWithGoogle()
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      Alert.alert("Google Sign-In Failed", error.message || "Failed to sign in with Google. Please try again.")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    try {
      setIsAppleLoading(true)
      await signInWithApple()
    } catch (error: any) {
      console.error("Apple sign-in error:", error)
      Alert.alert("Apple Sign-In Failed", error.message || "Failed to sign in with Apple. Please try again.")
    } finally {
      setIsAppleLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ImageBackground
        source={require("../assets/colourise-ai-login-colourimage (1).png")}
        style={styles.backgroundImage}
        blurRadius={15}
      >
        <View style={styles.overlay} />
        
        <View style={styles.contentContainer}>
          <View style={styles.cardContainer}>
            <View style={styles.backgroundRectangle} />
            <View style={styles.formCard}>
              <Text style={styles.title}>Create an Account</Text>
              <Text style={styles.subtitle}>Enter your details below</Text>
              
              <View style={styles.inputContainer}>
                <View style={styles.iconContainer}>
                  <Feather name="mail" size={24} color="#999" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <View style={styles.iconContainer}>
                  <Feather name="lock" size={24} color="#999" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.createButton, isEmailLoading && styles.buttonDisabled]} 
                onPress={handleSignup}
                disabled={isEmailLoading}
              >
                {isEmailLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Create account</Text>
                )}
              </TouchableOpacity>
              
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>Or sign in with</Text>
                <View style={styles.divider} />
              </View>
              
              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.socialButton, isGoogleLoading && styles.buttonDisabled]} 
                  onPress={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <ActivityIndicator color="#333" size="small" style={{ marginRight: 8 }} />
                  ) : (
                    <Image 
                      source={require('../assets/google-icon.png')} 
                      style={styles.socialIcon} 
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.socialButtonText}>
                    {isGoogleLoading ? "Signing in..." : "Google account"}
                  </Text>
                </TouchableOpacity>
                
                {isAppleAvailable && (
                  <TouchableOpacity 
                    style={[styles.socialButton, isAppleLoading && styles.buttonDisabled]} 
                    onPress={handleAppleSignIn}
                    disabled={isAppleLoading}
                  >
                    {isAppleLoading ? (
                      <ActivityIndicator color="#333" size="small" style={{ marginRight: 8 }} />
                    ) : (
                      <Image 
                        source={require('../assets/apple-icon.png')} 
                        style={styles.socialIcon} 
                        resizeMode="contain"
                      />
                    )}
                    <Text style={styles.socialButtonText}>
                      {isAppleLoading ? "Signing in..." : "Apple Account"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.bottomSpacer} />
            </View>
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 0,
  },
  cardContainer: {
    position: 'relative',
    width: '100%',
    marginTop: 'auto',
  },
  backgroundRectangle: {
    position: 'absolute',
    top: -15,
    left: 15,
    right: 15,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  formCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    paddingBottom: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  iconContainer: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: "#333",
  },
  createButton: {
    backgroundColor: "#000000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e5e5",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#666",
    fontSize: 14,
  },
  socialButtonsContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 12,
    justifyContent: "center",
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  socialButtonText: {
    fontSize: 16,
    color: "#333",
  },
  bottomSpacer: {
    height: 75,
  },
})
