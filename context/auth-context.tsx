import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { AuthService } from "../lib/auth-service"
import { DatabaseService } from "../lib/database-service"
import type { Session, User as SupabaseUser } from "@supabase/supabase-js"

// Define a type for user images
type UserImage = {
  id: string
  originalUrl: string
  colorizedUrl: string
  createdAt: Date
}

type User = {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt?: Date
  images?: UserImage[]
  credits?: number
  lastActive?: Date[] // Array of dates when user was active (for streak calculation)
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  session: Session | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name?: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: { name?: string; avatar?: string }) => void
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper function to convert Supabase user to our User type using database
const convertSupabaseUser = async (supabaseUser: SupabaseUser, session: Session): Promise<User> => {
  try {
    console.log('🔍 Debug: convertSupabaseUser called')
    console.log('User ID:', supabaseUser.id)
    console.log('Email:', supabaseUser.email)
    
    // Try to get profile from database first
    let userProfile = await DatabaseService.getUserProfile(supabaseUser.id)
    console.log('Profile found:', !!userProfile)
    
    if (!userProfile) {
      // Profile doesn't exist, try to create it manually
      console.log('❌ Profile creation needed - no profile found')
      
      // First, let's try a direct query to see if the profile actually exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle()
      
      if (existingProfile) {
        console.log('✅ Profile actually exists, using it')
        userProfile = existingProfile
      } else {
        console.log('🔧 Creating new profile')
        
        // Create the user profile using the unified client
        const profileData = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          full_name: supabaseUser.user_metadata?.full_name || 
                    supabaseUser.user_metadata?.name || 
                    supabaseUser.email?.split("@")[0] || 
                    "User",
          avatar_url: supabaseUser.user_metadata?.avatar_url || 
                     supabaseUser.user_metadata?.picture || 
                     null,
          credits: 5,
          last_active_date: new Date().toISOString().split('T')[0],
          streak_count: 1
        }
        
        // Insert the profile using the unified client
        const { data: createdProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert(profileData)
          .select()
          .single()
        
        if (insertError) {
          console.error('Profile creation error:', insertError)
          // If creation fails, fall back to the basic user info
          console.log('⚠️ Using fallback user data due to profile creation failure')
          return {
            id: supabaseUser.id,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "User",
            email: supabaseUser.email || "",
            avatar: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
            createdAt: new Date(supabaseUser.created_at),
            credits: 5,
            lastActive: [new Date()],
            images: []
          }
        }
        
        userProfile = createdProfile
        console.log('✅ Profile creation successful!')
      }
    }
    
    // Record user login activity (non-blocking)
    DatabaseService.recordUserActivity(supabaseUser.id, 'login').catch(error => {
      console.warn('Failed to record user activity:', error)
    })
    
    // Ensure userProfile exists before using it
    if (!userProfile) {
      throw new Error('Failed to create or retrieve user profile')
    }
    
    return {
      id: supabaseUser.id,
      name: userProfile.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "User",
      email: supabaseUser.email || "",
      avatar: userProfile.avatar_url || supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
      createdAt: new Date(supabaseUser.created_at),
      credits: userProfile.credits || 5,
      lastActive: [new Date()], // Will be loaded from user_activity table if needed
      images: [] // Will be loaded separately via DatabaseService.getUserImages()
    }
  } catch (error) {
    console.error('Error loading user profile from database:', error)
    // Fallback to basic user info if database fails
    return {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "User",
      email: supabaseUser.email || "",
      avatar: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
      createdAt: new Date(supabaseUser.created_at),
      credits: 5,
      lastActive: [new Date()],
      images: []
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    AuthService.getCurrentSession().then(async (session) => {
      if (session?.user) {
        try {
          const convertedUser = await convertSupabaseUser(session.user, session)
          setUser(convertedUser)
        } catch (error) {
          console.error('Error converting user:', error)
        }
      }
      setSession(session)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      if (session?.user) {
        try {
          const convertedUser = await convertSupabaseUser(session.user, session)
          setUser(convertedUser)
        } catch (error) {
          console.error('Error converting user on auth change:', error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      
      setSession(session)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      await AuthService.signInWithEmail(email, password)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const signup = async (email: string, password: string, name?: string) => {
    try {
      await AuthService.signUpWithEmail(email, password, name)
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      await AuthService.signInWithGoogle()
    } catch (error) {
      console.error('Google sign-in error:', error)
      throw error
    }
  }

  const signInWithApple = async () => {
    try {
      await AuthService.signInWithApple()
    } catch (error) {
      console.error('Apple sign-in error:', error)
      throw error
    }
  }

  const updateProfile = async (data: { name?: string; avatar?: string }) => {
    if (!user) return

      try {
      // Update user metadata in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: data.name,
          avatar_url: data.avatar,
        },
        })

      if (authError) throw authError

      // Update user profile in database
      const { error: dbError } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.name,
          avatar_url: data.avatar,
        })
        .eq('id', user.id)

      if (dbError) throw dbError

        // Update local user state
        setUser({
          ...user,
        name: data.name || user.name,
        avatar: data.avatar || user.avatar,
        })
      } catch (error) {
      console.error('Update profile error:', error)
        throw error
    }
  }

  const logout = async () => {
    try {
      await AuthService.signOut()
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
      user, 
        session,
      isLoading, 
      login, 
      signup, 
      signInWithGoogle,
      signInWithApple,
      logout, 
      updateProfile, 
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
