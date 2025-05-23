import React, { useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"

const { width, height } = Dimensions.get("window")

export default function WelcomeScreen() {
  const navigation = useNavigation()
  const linePosition = useRef(new Animated.Value(0)).current
  const buttonsOpacity = useRef(new Animated.Value(0)).current
  
  useEffect(() => {
    // Run animation once - left to right, then to middle
    Animated.sequence([
      // Initial delay
      Animated.delay(500),
      // Move to end (reveal full color)
      Animated.timing(linePosition, {
        toValue: width,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      // Small pause at full color
      Animated.delay(300),
      // Move back to middle (reveal half color, half B&W)
      Animated.timing(linePosition, {
        toValue: width / 2,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start(() => {
      // After main animation completes, fade in the buttons
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start();
    });
    
    // Cleanup
    return () => {
      linePosition.stopAnimation();
      buttonsOpacity.stopAnimation();
    };
  }, [linePosition, buttonsOpacity]);

  return (
    <View style={styles.container}>
      {/* Base layer: B&W image (always fully visible) */}
      <Image
        source={require("../assets/colourise-ai-login-blackandwhiteimage (1).png")}
        style={styles.fullImage}
        resizeMode="cover"
      />
      
      {/* Middle layer: Color image revealed by mask */}
      <Animated.View 
        style={[
          styles.revealMask, 
          { width: linePosition }
        ]}
      >
        <Image
          source={require("../assets/colourise-ai-login-colourimage (1).png")}
          style={styles.maskedImage}
          resizeMode="cover"
        />
      </Animated.View>
      
      {/* Top layer: White divider line */}
      <Animated.View 
        style={[
          styles.dividerLine,
          { transform: [{ translateX: linePosition }] }
        ]}
      />
      
      {/* UI Elements */}
      <SafeAreaView style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require("../assets/colourise-ai-whitetext-logo.png")} 
            style={styles.logo} 
            resizeMode="contain" 
          />
        </View>
        
        <View style={styles.spacer} />
        
        {/* Black gradient fade behind buttons */}
        <Animated.View 
          style={[
            styles.buttonBackgroundFade,
            { opacity: buttonsOpacity }
          ]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']}
            style={styles.gradient}
          />
        </Animated.View>
        
        {/* Buttons container with fade-in animation */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            { opacity: buttonsOpacity }
          ]}
        >
          <TouchableOpacity 
            style={styles.createAccountButton}
            onPress={() => navigation.navigate("Signup" as never)}
          >
            <Text style={styles.createAccountText}>Create Account</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate("Login" as never)}
          >
            <Text style={styles.loginText}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullImage: {
    position: 'absolute',
    width: width,
    height: height,
    top: 0,
    left: 0,
  },
  revealMask: {
    position: 'absolute',
    height: height,
    left: 0,
    top: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  maskedImage: {
    width: width,
    height: height,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  dividerLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  logo: {
    width: 220,
    height: 70,
  },
  spacer: {
    flex: 1,
  },
  buttonBackgroundFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  gradient: {
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 40,
    gap: 15,
    position: 'relative',
    zIndex: 10,
  },
  createAccountButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  createAccountText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginButton: {
    backgroundColor: "transparent",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  loginText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
}) 