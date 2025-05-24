import { GoogleSignin } from '@react-native-google-signin/google-signin'
import * as AppleAuthentication from 'expo-apple-authentication'
import { auth } from './supabase'
import { Platform } from 'react-native'

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '706503746923-k4at78tha8prgsfml22d8deabca0eqmi.apps.googleusercontent.com', // Web client ID
  iosClientId: '706503746923-n9tgl6s2kr4p71ao0qhme85tu3pvktb2.apps.googleusercontent.com', // iOS client ID
})

export class AuthService {
  // Google Sign-In
  static async signInWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices()
      const userInfo = await GoogleSignin.signIn()
      
      if (userInfo.data?.idToken) {
        const { data, error } = await auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        })
        
        if (error) throw error
        return data
      } else {
        throw new Error('No ID token received from Google')
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error)
      throw error
    }
  }

  // Apple Sign-In
  static async signInWithApple() {
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS')
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      if (credential.identityToken) {
        const { data, error } = await auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        })

        if (error) throw error
        return data
      } else {
        throw new Error('No identity token received from Apple')
      }
    } catch (error) {
      console.error('Apple Sign-In Error:', error)
      throw error
    }
  }

  // Email/Password Sign-In
  static async signInWithEmail(email: string, password: string) {
    try {
      const { data, error } = await auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Email Sign-In Error:', error)
      throw error
    }
  }

  // Email/Password Sign-Up
  static async signUpWithEmail(email: string, password: string, fullName?: string) {
    try {
      const { data, error } = await auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Email Sign-Up Error:', error)
      throw error
    }
  }

  // Sign Out
  static async signOut() {
    try {
      // Sign out from Google if signed in
      try {
        await GoogleSignin.getCurrentUser()
        await GoogleSignin.signOut()
      } catch (error) {
        // User not signed in with Google, continue
      }

      // Sign out from Supabase
      const { error } = await auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Sign Out Error:', error)
      throw error
    }
  }

  // Get current session
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await auth.getSession()
      if (error) throw error
      return session
    } catch (error) {
      console.error('Get Session Error:', error)
      return null
    }
  }

  // Check if Apple Sign-In is available
  static async isAppleSignInAvailable() {
    if (Platform.OS !== 'ios') return false
    
    try {
      return await AppleAuthentication.isAvailableAsync()
    } catch (error) {
      console.error('Apple Sign-In availability check failed:', error)
      return false
    }
  }
} 