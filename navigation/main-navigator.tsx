import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createStackNavigator } from "@react-navigation/stack"
import { Image, Platform, View } from "react-native"
import { BlurView } from "expo-blur"

import TransformScreen from "../screens/transform-screen"
import GalleryScreen from "../screens/gallery-screen"
import ProfileScreen from "../screens/profile-screen"
import HelpSupportScreen from "../screens/help-support-screen"
import PrivacyPolicyScreen from "../screens/privacy-policy-screen"
import TermsOfServiceScreen from "../screens/terms-of-service-screen"

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
    </Stack.Navigator>
  )
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.9)',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        tabBarBackground: () => (
          <BlurView
            tint="light"
            intensity={Platform.OS === 'ios' ? 35 : 80}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden'
            }}
          />
        ),
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: -2,
        },
      }}
    >
      <Tab.Screen
        name="Colourise"
        component={TransformScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Image 
              source={require("../assets/magic-wand.png")} 
              style={{ 
                width: 24,
                height: 24,
                tintColor: focused ? "#6366f1" : "#94a3b8",
                marginTop: -8,
                opacity: focused ? 1 : 0.8,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Image 
              source={require("../assets/image (8).png")} 
              style={{ 
                width: 24,
                height: 24,
                tintColor: focused ? "#6366f1" : "#94a3b8",
                marginTop: -8,
                opacity: focused ? 1 : 0.8,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Image 
              source={require("../assets/user.png")} 
              style={{ 
                width: 24,
                height: 24,
                tintColor: focused ? "#6366f1" : "#94a3b8",
                marginTop: -8,
                opacity: focused ? 1 : 0.8,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
