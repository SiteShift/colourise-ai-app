import { db, getAuthenticatedDb } from './supabase'

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
  description: string
  reference_id: string | null
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

export class DatabaseService {
  // ========================================
  // USER PROFILE OPERATIONS
  // ========================================
  
  static async getUserProfile(userId: string, accessToken?: string): Promise<UserProfile | null> {
    try {
      const client = getAuthenticatedDb(accessToken)
      const { data, error } = await client
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
  }

  static async createUserProfile(profile: Partial<UserProfile>, accessToken?: string): Promise<UserProfile | null> {
    try {
      const client = getAuthenticatedDb(accessToken)
      const { data, error } = await client
        .from('user_profiles')
        .insert([profile])
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in createUserProfile:', error)
      return null
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>, accessToken?: string): Promise<UserProfile | null> {
    try {
      const client = getAuthenticatedDb(accessToken)
      const { data, error } = await client
        .from('user_profiles')
        .update(updates)
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
  }

  // ========================================
  // USER IMAGES OPERATIONS
  // ========================================
  
  static async getUserImages(userId: string, limit: number = 50, accessToken?: string): Promise<UserImage[]> {
    try {
      const client = getAuthenticatedDb(accessToken)
      const { data, error } = await client
        .from('user_images')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) {
        console.error('Error fetching user images:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error in getUserImages:', error)
      return []
    }
  }

  static async createUserImage(imageData: Partial<UserImage>, accessToken?: string): Promise<UserImage | null> {
    try {
      const client = getAuthenticatedDb(accessToken)
      const { data, error } = await client
        .from('user_images')
        .insert([imageData])
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
  }

  static async updateUserImage(imageId: string, updates: Partial<UserImage>, accessToken?: string): Promise<UserImage | null> {
    try {
      const client = getAuthenticatedDb(accessToken)
      const { data, error } = await client
        .from('user_images')
        .update(updates)
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
  }

  static async deleteUserImage(imageId: string, accessToken?: string): Promise<boolean> {
    try {
      const client = getAuthenticatedDb(accessToken)
      const { error } = await client
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
  }

  // ========================================
  // CREDIT OPERATIONS
  // ========================================
  
  static async getUserCredits(userId: string, accessToken?: string): Promise<number> {
    try {
      const profile = await this.getUserProfile(userId, accessToken)
      return profile?.credits || 0
    } catch (error) {
      console.error('Error getting user credits:', error)
      return 0
    }
  }

  static async updateUserCredits(userId: string, newCredits: number, accessToken?: string): Promise<boolean> {
    try {
      const client = getAuthenticatedDb(accessToken)
      const { error } = await client
        .from('user_profiles')
        .update({ credits: newCredits })
        .eq('id', userId)
      
      if (error) {
        console.error('Error updating user credits:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error in updateUserCredits:', error)
      return false
    }
  }

  static async deductCredits(userId: string, amount: number, description: string, accessToken?: string): Promise<boolean> {
    try {
      const currentCredits = await this.getUserCredits(userId, accessToken)
      
      if (currentCredits < amount) {
        console.error('Insufficient credits')
        return false
      }
      
      const newCredits = currentCredits - amount
      const success = await this.updateUserCredits(userId, newCredits, accessToken)

      if (success) {
        // Record the transaction
        await this.recordCreditTransaction(userId, 'usage', -amount, description, null, accessToken)
      }

      return success
    } catch (error) {
      console.error('Error in deductCredits:', error)
      return false
    }
  }

  static async addCredits(userId: string, amount: number, description: string, referenceId?: string, accessToken?: string): Promise<boolean> {
    try {
      const currentCredits = await this.getUserCredits(userId, accessToken)
      const newCredits = currentCredits + amount
      const success = await this.updateUserCredits(userId, newCredits, accessToken)

      if (success) {
        // Record the transaction
        await this.recordCreditTransaction(userId, 'purchase', amount, description, referenceId || null, accessToken)
      }

      return success
    } catch (error) {
      console.error('Error in addCredits:', error)
      return false
    }
  }

  static async recordCreditTransaction(
    userId: string,
    type: CreditTransaction['transaction_type'],
    amount: number,
    description: string,
    referenceId: string | null,
    accessToken?: string
  ): Promise<CreditTransaction | null> {
    try {
      const client = getAuthenticatedDb(accessToken)
      const { data, error } = await client
        .from('credit_transactions')
        .insert([{
          user_id: userId,
          transaction_type: type,
          credits_amount: amount,
          description,
          reference_id: referenceId,
        }])
        .select()
        .single()

      if (error) {
        console.error('Error recording credit transaction:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in recordCreditTransaction:', error)
      return null
    }
  }

  static async getCreditTransactions(userId: string, limit: number = 50, accessToken?: string): Promise<CreditTransaction[]> {
    try {
      const client = getAuthenticatedDb(accessToken)
      const { data, error } = await client
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) {
        console.error('Error fetching credit transactions:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error in getCreditTransactions:', error)
      return []
    }
  }

  // ========================================
  // CREDIT PACKAGES
  // ========================================
  
  static async getCreditPackages(): Promise<CreditPackage[]> {
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
  }

  // ========================================
  // USER ACTIVITY & STREAKS
  // ========================================
  
  static async recordUserActivity(userId: string, activityType: string, accessToken?: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Update last active date and potentially streak
      const client = getAuthenticatedDb(accessToken)
      await client
        .from('user_profiles')
        .update({ 
          last_active_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      console.log(`Recorded ${activityType} activity for user ${userId}`)
    } catch (error) {
      console.error('Error recording user activity:', error)
    }
  }

  // ========================================
  // ANALYTICS & STATS
  // ========================================
  
  static async getUserStats(userId: string) {
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