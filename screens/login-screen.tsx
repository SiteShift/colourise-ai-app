import React from "react"
import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { useAuth } from "../context/auth-context"
import { AuthService } from "../lib/auth-service"

export default function LoginScreen() {
  const navigation = useNavigation()
  const { login, signInWithGoogle, signInWithApple } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isAppleLoading, setIsAppleLoading] = useState(false)
  const [isAppleAvailable, setIsAppleAvailable] = useState(false)

  useEffect(() => {
    // Check if Apple Sign-In is available
    AuthService.isAppleSignInAvailable().then(setIsAppleAvailable)
  }, [])

  const handleLogin = async () => {
    if (email && password) {
      try {
        setIsEmailLoading(true)
        await login(email, password)
      } catch (error: any) {
        console.error("Login error:", error)
        Alert.alert("Login Failed", error.message || "Failed to sign in. Please try again.")
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
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={24} color="#6366f1" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/Colourise AI logo.png')} style={styles.logo} />
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.loginButton, isEmailLoading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isEmailLoading}
          >
            {isEmailLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or continue with</Text>
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
                {isGoogleLoading ? "Signing in..." : "Google"}
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
                  {isAppleLoading ? "Signing in..." : "Apple"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Signup" as never)}>
            <Text style={styles.signupText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  backButton: {
    padding: 15,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logo: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 40,
  },
  form: {
    width: "100%",
    gap: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    color: "#6366f1",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    marginHorizontal: 15,
    color: "#64748b",
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: "row",
    gap: 15,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 15,
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  socialButtonText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    marginTop: "auto",
    paddingVertical: 20,
  },
  footerText: {
    color: "#64748b",
    fontSize: 16,
  },
  signupText: {
    color: "#6366f1",
    fontSize: 16,
    fontWeight: "bold",
  },
})
