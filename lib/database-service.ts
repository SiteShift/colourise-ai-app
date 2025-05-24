import { db } from './supabase'

// Types based on our database schema (Credits-Only Model)
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  credits: number
  last_active_date: string
  streak_count: number
  created_at: string
  updated_at: string
}

export interface UserImage {
  id: string
  user_id: string
  original_image_url: string
  colorized_image_url: string | null
  image_title: string
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  image_type: 'colorization' | 'face_enhancement' | 'upscaling' | 'scene_builder'
  credits_used: number
  is_public: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  transaction_type: 'purchase' | 'usage' | 'bonus' | 'refund'
  credits_amount: number
  credits_balance_after: number
  description: string | null
  related_image_id: string | null
  purchase_package_id: string | null
  transaction_reference: string | null
  created_at: string
}

export interface CreditPackage {
  id: string
  name: string
  description: string | null
  credits_amount: number
  price: number
  bonus_credits: number
  is_popular: boolean
  is_active: boolean
  created_at: string
}

export interface UserActivity {
  id: string
  user_id: string
  activity_date: string
  activity_type: 'login' | 'image_upload' | 'image_colorize' | 'credit_purchase'
  metadata: Record<string, any>
  created_at: string
}

export const DatabaseService = {
  // ========================================
  // USER PROFILE OPERATIONS
  // ========================================
  
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await db
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error in getUserProfile:', error)
      return null
    }
  },

  async updateUserProfile(
    userId: string, 
    updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<UserProfile | null> {
    try {
      const { data, error } = await db
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating user profile:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error in updateUserProfile:', error)
      return null
    }
  },

  // ========================================
  // USER IMAGES OPERATIONS
  // ========================================
  
  async getUserImages(userId: string): Promise<UserImage[]> {
    try {
      const { data, error } = await db
        .from('user_images')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching user images:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error in getUserImages:', error)
      return []
    }
  },

  async createUserImage(imageData: Omit<UserImage, 'id' | 'created_at' | 'updated_at'>): Promise<UserImage | null> {
    try {
      const { data, error } = await db
        .from('user_images')
        .insert(imageData)
        .select()
        .single()
      
      if (error) {
        console.error('Error creating user image:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error in createUserImage:', error)
      return null
    }
  },

  async updateUserImage(
    imageId: string, 
    updates: Partial<Omit<UserImage, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<UserImage | null> {
    try {
      const { data, error } = await db
        .from('user_images')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', imageId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating user image:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error in updateUserImage:', error)
      return null
    }
  },

  async deleteUserImage(imageId: string): Promise<boolean> {
    try {
      const { error } = await db
        .from('user_images')
        .delete()
        .eq('id', imageId)
      
      if (error) {
        console.error('Error deleting user image:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error in deleteUserImage:', error)
      return false
    }
  },

  // ========================================
  // CREDIT OPERATIONS
  // ========================================
  
  async useCredits(
    userId: string, 
    creditsToUse: number, 
    description: string = 'Image processing',
    imageId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await db.rpc('use_credits', {
        p_user_id: userId,
        p_credits_to_use: creditsToUse,
        p_description: description,
        p_image_id: imageId || null
      })
      
      if (error) {
        console.error('Error using credits:', error)
        return false
      }
      
      return data === true
    } catch (error) {
      console.error('Error in useCredits:', error)
      return false
    }
  },

  async addCredits(
    userId: string, 
    creditsToAdd: number, 
    description: string = 'Credit purchase',
    packageId?: string,
    transactionRef?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await db.rpc('add_credits', {
        p_user_id: userId,
        p_credits_to_add: creditsToAdd,
        p_description: description,
        p_package_id: packageId || null,
        p_transaction_ref: transactionRef || null
      })
      
      if (error) {
        console.error('Error adding credits:', error)
        return false
      }
      
      return data === true
    } catch (error) {
      console.error('Error in addCredits:', error)
      return false
    }
  },

  async getCreditHistory(userId: string): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await db
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching credit history:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error in getCreditHistory:', error)
      return []
    }
  },

  // ========================================
  // CREDIT PACKAGES
  // ========================================
  
  async getCreditPackages(): Promise<CreditPackage[]> {
    try {
      const { data, error } = await db
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })
      
      if (error) {
        console.error('Error fetching credit packages:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error in getCreditPackages:', error)
      return []
    }
  },

  // ========================================
  // USER ACTIVITY & STREAKS
  // ========================================
  
  async recordUserActivity(
    userId: string, 
    activityType: UserActivity['activity_type'],
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const { error } = await db
        .from('user_activity')
        .insert({
          user_id: userId,
          activity_type: activityType,
          metadata,
          activity_date: new Date().toISOString().split('T')[0] // Just the date part
        })
      
      if (error) {
        // Ignore duplicate errors (user already active today)
        if (error.code === '23505') {
          return true
        }
        console.error('Error recording user activity:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error in recordUserActivity:', error)
      return false
    }
  },

  // ========================================
  // ANALYTICS & STATS
  // ========================================
  
  async getUserStats(userId: string) {
    try {
      const { data, error } = await db
        .from('user_stats')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching user stats:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error in getUserStats:', error)
      return null
    }
  }
} 