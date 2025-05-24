import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { auth } from "../lib/supabase"
import { AuthService } from "../lib/auth-service"
import { DatabaseService } from "../lib/database-service"
import type { Session, User as SupabaseUser } from "@supabase/gotrue-js"

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
    // Try to get profile from database first
    let userProfile = await DatabaseService.getUserProfile(supabaseUser.id)
    
    if (!userProfile) {
      // Profile will be created automatically by the database trigger
      // Wait a moment and try again
      console.log('User profile not found, waiting for automatic creation...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      userProfile = await DatabaseService.getUserProfile(supabaseUser.id)
      
      if (!userProfile) {
        // Still no profile, something went wrong
        throw new Error('Failed to create user profile in database')
      }
    }
    
    // Record user login activity
    await DatabaseService.recordUserActivity(supabaseUser.id, 'login')
    
    return {
      id: supabaseUser.id,
      name: userProfile.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "User",
      email: supabaseUser.email || "",
      avatar: userProfile.avatar_url || supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
      createdAt: new Date(supabaseUser.created_at),
      credits: userProfile.credits || 10,
      lastActive: [new Date()], // Will be loaded from user_activity table if needed
      images: [] // Will be loaded separately via DatabaseService.getUserImages()
    }
  } catch (error) {
    console.error('Error loading user profile from database:', error)
    // Fallback to basic user info if database fails
    return {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "User",
      email: supabaseUser.email || "",
      avatar: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
      createdAt: new Date(supabaseUser.created_at),
      credits: 10,
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
          setSession(session)
        } catch (error) {
          console.error('Error converting initial user:', error)
        }
      }
      setIsLoading(false)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (session?.user) {
        try {
          const convertedUser = await convertSupabaseUser(session.user, session)
          setUser(convertedUser)
          setSession(session)
        } catch (error) {
          console.error('Error converting user on auth change:', error)
          // Set loading to false even if there's an error
        }
      } else {
        setUser(null)
        setSession(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      await AuthService.signInWithEmail(email, password)
      // User state will be updated via the auth state change listener
    } catch (error: any) {
      setIsLoading(false)
      throw new Error(error.message || 'Failed to sign in')
    }
  }

  const signup = async (email: string, password: string, name?: string) => {
    try {
      setIsLoading(true)
      await AuthService.signUpWithEmail(email, password, name)
      // User state will be updated via the auth state change listener
    } catch (error: any) {
      setIsLoading(false)
      throw new Error(error.message || 'Failed to sign up')
    }
  }

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true)
      await AuthService.signInWithGoogle()
      // User state will be updated via the auth state change listener
    } catch (error: any) {
      setIsLoading(false)
      throw new Error(error.message || 'Failed to sign in with Google')
    }
  }

  const signInWithApple = async () => {
    try {
      setIsLoading(true)
      await AuthService.signInWithApple()
      // User state will be updated via the auth state change listener
    } catch (error: any) {
      setIsLoading(false)
      throw new Error(error.message || 'Failed to sign in with Apple')
    }
  }

  const updateProfile = async (data: { name?: string; avatar?: string }) => {
    if (user && session) {
      try {
        // Update Supabase user metadata
        const updates: any = {}
        if (data.name) updates.full_name = data.name
        if (data.avatar !== undefined) updates.avatar_url = data.avatar

        const { error } = await auth.updateUser({
          data: updates
        })

        if (error) throw error

        // Update database profile
        await DatabaseService.updateUserProfile(user.id, {
          full_name: data.name,
          avatar_url: data.avatar
        })

        // Update local user state
        setUser({
          ...user,
          ...(data.name && { name: data.name }),
          ...(data.avatar !== undefined && { avatar: data.avatar }),
        })
      } catch (error) {
        console.error('Error updating profile:', error)
        throw error
      }
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      await AuthService.signOut()
      // User state will be updated via the auth state change listener
    } catch (error: any) {
      setIsLoading(false)
      throw new Error(error.message || 'Failed to sign out')
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      session,
      login, 
      signup, 
      signInWithGoogle,
      signInWithApple,
      logout, 
      updateProfile, 
      setUser 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
