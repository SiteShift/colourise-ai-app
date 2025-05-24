# 🚀 AI Colorizer App - Database Implementation Guide (Credits-Only Model)

## 📋 Overview

This guide walks you through setting up the complete database backend for your AI Colorizer app using Supabase. The database schema supports user management, image storage, and **one-time credit purchases** (no recurring subscriptions).

## ⚡ Quick Setup Steps

### 1. **Set Up Database Schema**

1. Open your Supabase dashboard → SQL Editor
2. Copy and paste the entire contents of `database-schema.sql`
3. Run the SQL script
4. ✅ **All tables, functions, triggers, and policies will be created automatically**

### 2. **Verify Setup**

Check that these tables were created:
- `user_profiles` - User data and credits (no subscription fields)
- `user_images` - Image metadata and processing status
- `credit_transactions` - All credit movements
- `user_activity` - For streak tracking
- `credit_packages` - Credit purchase packages (one-time purchases)

### 3. **Storage Buckets**

Two storage buckets are automatically created:
- `original-images` - For uploaded images
- `colorized-images` - For processed results

## 🔄 Integration with Your App

### **Replace Current Auth Context**

Update `context/auth-context.tsx` to use the real database:

```typescript
import { DatabaseService } from '../lib/database-service'

// In convertSupabaseUser function, load from database:
const convertSupabaseUser = async (supabaseUser: SupabaseUser, session: Session): Promise<User> => {
  // Try to get profile from database first
  let userProfile = await DatabaseService.getUserProfile(supabaseUser.id)
  
  if (!userProfile) {
    // Profile will be created automatically by trigger
    // Wait a moment and try again
    await new Promise(resolve => setTimeout(resolve, 1000))
    userProfile = await DatabaseService.getUserProfile(supabaseUser.id)
  }
  
  return {
    id: supabaseUser.id,
    name: userProfile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "User",
    email: supabaseUser.email || "",
    avatar: userProfile?.avatar_url || supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
    createdAt: new Date(supabaseUser.created_at),
    credits: userProfile?.credits || 10,
    lastActive: [new Date()],
    images: [] // Loaded separately via DatabaseService.getUserImages()
  }
}
```

### **Update Gallery Service**

Replace mock storage in `lib/gallery-service.ts`:

```typescript
import { DatabaseService } from './database-service'

// In saveImageToRemoteGallery:
saveImageToRemoteGallery: async (userId: string, imageUri: string): Promise<void> => {
  try {
    // Create image record in database
    const imageData = await DatabaseService.createUserImage({
      user_id: userId,
      original_image_url: imageUri,
      colorized_image_url: imageUri,
      image_title: 'Colorized',
      processing_status: 'completed',
      image_type: 'colorization',
      credits_used: 1,
      is_public: false,
      metadata: {}
    })
    
    if (!imageData) {
      throw new Error('Failed to save image metadata')
    }
  } catch (error) {
    console.error("Error saving to remote gallery:", error)
    throw error
  }
}

// In getUserImages:
const remoteImages = await DatabaseService.getUserImages(userId)
```

### **Update Subscription Context (Now Credits Context)**

Replace AsyncStorage with database in `context/subscription-context.tsx` (you can rename this to `credits-context.tsx`):

```typescript
import { DatabaseService } from '../lib/database-service'

// Remove subscription logic, focus on credits only:
const purchaseCredits = async (packageId: string): Promise<boolean> => {
  if (!user) return false
  
  try {
    // Get package info
    const packages = await DatabaseService.getCreditPackages()
    const package = packages.find(p => p.id === packageId)
    
    if (!package) return false
    
    // Add credits to user account
    const success = await DatabaseService.addCredits(
      user.id,
      package.credits_amount + package.bonus_credits,
      `Purchased ${package.name}`,
      packageId,
      `txn_${Date.now()}` // In real app, this would come from payment processor
    )
    
    return success
  } catch (error) {
    console.error('Error purchasing credits:', error)
    return false
  }
}
```

## 💳 Credit System Integration

### **Deduct Credits for Processing**

In your image processing functions:

```typescript
import { DatabaseService } from '../lib/database-service'

// Before processing an image:
const success = await DatabaseService.useCredits(
  userId, 
  1, // credits needed
  'Image colorization',
  imageId // optional
)

if (!success) {
  throw new Error('Insufficient credits')
}

// Process image...

// Record user activity
await DatabaseService.recordUserActivity(userId, 'image_colorize', {
  imageId: imageId,
  creditsUsed: 1
})
```

### **Get User Credits**

```typescript
const userProfile = await DatabaseService.getUserProfile(userId)
const currentCredits = userProfile?.credits || 0
```

### **Credit History**

```typescript
const transactions = await DatabaseService.getCreditHistory(userId)
// Show transaction history in UI
```

## 📊 Analytics & Streaks

### **Track User Activity**

Add these calls throughout your app:

```typescript
// On app login
await DatabaseService.recordUserActivity(userId, 'login')

// On image upload
await DatabaseService.recordUserActivity(userId, 'image_upload', { fileName: 'photo.jpg' })

// On image processing
await DatabaseService.recordUserActivity(userId, 'image_colorize', { imageId, creditsUsed: 1 })

// On credit purchase
await DatabaseService.recordUserActivity(userId, 'credit_purchase', { packageId, amount: 25 })
```

### **Get User Stats**

```typescript
const stats = await DatabaseService.getUserStats(userId)
// stats.total_images, stats.images_this_month, stats.streak_count, etc.
```

## 🔒 Security Features

### **Row Level Security (RLS)**
- ✅ Users can only access their own data
- ✅ All queries are automatically filtered by user ID
- ✅ Storage buckets follow user-based access patterns

### **Automatic Profile Creation**
- ✅ User profiles are created automatically on signup via trigger
- ✅ Default credits (10) are assigned to new users
- ✅ Streak tracking starts immediately

### **Credit Management**
- ✅ Database functions ensure credit balances are always accurate
- ✅ All credit movements are logged with full audit trail
- ✅ Atomic operations prevent double-spending

## 🧪 Testing Your Implementation

### 1. **Test User Registration**
```typescript
// After user signs up, check:
const profile = await DatabaseService.getUserProfile(newUserId)
console.log('New user credits:', profile?.credits) // Should be 10
```

### 2. **Test Credit Operations**
```typescript
// Test credit usage
const success = await DatabaseService.useCredits(userId, 1, 'Test processing')
console.log('Credits used successfully:', success)

// Test credit addition
const added = await DatabaseService.addCredits(userId, 10, 'Test purchase')
console.log('Credits added successfully:', added)
```

### 3. **Test Image Storage**
```typescript
// Test image creation
const imageData = await DatabaseService.createUserImage({
  user_id: userId,
  original_image_url: 'https://example.com/image.jpg',
  // ... other fields
})
console.log('Image created:', imageData?.id)
```

## 🚨 Common Issues & Solutions

### **Issue: "Database error saving new user"**
**Solution:** The SQL schema creates the profile automatically. If you see this error, make sure the trigger is working:
```sql
-- Check if trigger exists:
SELECT * FROM information_schema.triggers WHERE trigger_name = 'create_user_profile_trigger';
```

### **Issue: Credits not updating**
**Solution:** Use the database functions instead of direct updates:
```typescript
// ❌ Wrong - direct update
await db.from('user_profiles').update({ credits: newAmount }).eq('id', userId)

// ✅ Correct - use database function
await DatabaseService.useCredits(userId, 1, 'Processing')
```

### **Issue: Images not showing in gallery**
**Solution:** Make sure to use DatabaseService for remote images:
```typescript
const images = await DatabaseService.getUserImages(userId)
```

## 📈 Next Steps

1. **Run the SQL schema** in Supabase
2. **Update your auth context** to use DatabaseService
3. **Replace gallery mock storage** with real database
4. **Test user registration and credit operations**
5. **Deploy with EAS build**

## 🎯 Key Benefits of This Setup

- ✅ **Automatic user profile creation** on signup
- ✅ **Real credit system** with audit trail
- ✅ **One-time purchases only** (no recurring subscriptions)
- ✅ **Streak tracking** that actually works
- ✅ **Secure image storage** with proper access controls
- ✅ **Analytics data** for user behavior insights
- ✅ **Production-ready** with proper indexing and performance optimization

Your AI Colorizer app will now have a robust backend that supports all features with a simple credit-based monetization model! 🎨 