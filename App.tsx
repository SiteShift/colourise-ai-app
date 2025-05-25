import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import React from 'react';
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack'
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"

import WelcomeScreen from "./screens/welcome-screen"
import LoginScreen from "./screens/login-screen"
import SignupScreen from "./screens/signup-screen"
import MainNavigator from "./navigation/main-navigator"
import { AuthProvider, useAuth } from "./context/auth-context"
import { SubscriptionProvider } from "./context/subscription-context"
import { ThemeProvider } from "./components/theme-provider"
import { ErrorBoundary } from "./components/error-boundary"

const Stack = createStackNavigator()

function Navigation() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen 
              name="Signup" 
              component={SignupScreen} 
              options={{
                cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
                gestureDirection: 'vertical',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider defaultTheme="system">
          <AuthProvider>
            <SubscriptionProvider>
              <Navigation />
              <StatusBar style="light" />
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
