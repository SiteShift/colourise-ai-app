# Supabase Authentication with React Native - Complete Debugging Guide

## Overview
This guide documents the complete process of debugging and fixing Supabase authentication issues in a React Native/Expo app, specifically the persistent "Database error saving new user" problem.

## Problem Statement
- **App**: AI Colorizer (React Native/Expo)
- **Bundle ID**: com.max.colouriseaiapp
- **Backend**: Supabase with PostgreSQL
- **Error**: "Database error saving new user" occurring with ALL authentication methods (Google Sign-In, Apple Sign-In, email/password)
- **Root Cause**: Missing/broken database trigger for auto-creating user profiles

## Technical Stack
- React Native/Expo
- Supabase (PostgreSQL + Auth)
- Google Sign-In
- Apple Sign-In
- Email/Password authentication

## The Journey: What We Tried vs What Actually Worked

### ❌ Initial Failed Attempts

#### 1. **Supabase Key Configuration Issues**
- **Tried**: Switching from service_role to anon key
- **Result**: Still failed
- **Learning**: Key configuration wasn't the root cause

#### 2. **Manual Profile Creation Fallback**
- **Tried**: Added manual profile creation in `convertSupabaseUser()` function
- **Result**: Still failed
- **Learning**: The issue was deeper in the database layer

#### 3. **JWT Token Authentication Headers**
- **Tried**: Dynamic JWT token auth headers with `updateDbHeaders()` and `getAuthenticatedDb()`
- **Result**: Still failed
- **Learning**: Authentication wasn't the issue - the trigger was missing

#### 4. **Service Role Fallback**
- **Tried**: Direct API calls using service role to bypass RLS
- **Result**: Still failed
- **Learning**: Can't bypass a missing trigger

#### 5. **Unified Supabase Client**
- **Tried**: Using `createClient()` instead of separate `GoTrueClient` and `PostgrestClient`
- **Result**: Compilation errors with Node.js modules (`events` module not found)
- **Learning**: Unified client causes React Native compatibility issues

### ✅ The Actual Root Cause & Solution

## Root Cause Analysis

The real issue was **missing database trigger** for auto-creating user profiles when new users sign up.

### Diagnostic Process

1. **Check if user_profiles table exists**:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_profiles';
```

2. **Check existing RLS policies**:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'user_profiles';
```

3. **Check if trigger exists**:
```sql
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles';
```

**Result**: No triggers found! ❌

4. **Check table structure**:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
```

## The Complete Solution

### Step 1: Create the Database Trigger Function

```sql
-- Create the function to handle new users
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Use INSERT ... ON CONFLICT to handle duplicates gracefully
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Step 2: Create the Trigger

```sql
-- Create trigger to call the function after insert on auth.users
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
```

### Step 3: Fix RLS Policies

```sql
-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow inserts for trigger" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create proper policies
CREATE POLICY "Enable insert for authenticated users only" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for users based on user_id" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable update for users based on user_id" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow service_role to insert (for manual fallback)
CREATE POLICY "Enable insert for service role" ON public.user_profiles
  FOR INSERT TO service_role
  WITH CHECK (true);
```

### Step 4: Proper React Native Supabase Client Setup

```typescript
// lib/supabase.ts
import { GoTrueClient } from '@supabase/gotrue-js'
import { PostgrestClient } from '@supabase/postgrest-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

// Use Expo's secure storage for auth tokens
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key)
    }
    return await SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value)
    } else {
      await SecureStore.setItemAsync(key, value)
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key)
    } else {
      await SecureStore.deleteItemAsync(key)
    }
  },
}

// Create separate auth client (no WebSocket dependencies)
export const auth = new GoTrueClient({
  url: `${supabaseUrl}/auth/v1`,
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  },
  autoRefreshToken: true,
  persistSession: true,
  storageKey: 'supabase.auth.token',
  storage: ExpoSecureStoreAdapter,
  fetch,
})

// Create database client (no WebSocket dependencies)
export const db = new PostgrestClient(`${supabaseUrl}/rest/v1`, {
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  },
  fetch,
})

// Function to get authenticated database client
export const getAuthenticatedDb = (accessToken?: string) => {
  if (accessToken) {
    return new PostgrestClient(`${supabaseUrl}/rest/v1`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      fetch,
    })
  }
  return db
}
```

## Common Debugging Issues & Solutions

### Issue 1: "relation user_profiles does not exist"
**Cause**: Trigger function can't find the table due to schema path issues
**Solution**: Add `SET search_path = public` to the function definition

### Issue 2: "duplicate key value violates unique constraint"
**Cause**: Trigger trying to insert duplicate users
**Solution**: Use `ON CONFLICT (id) DO NOTHING` in the INSERT statement

### Issue 3: "new row violates row-level security policy"
**Cause**: RLS policies blocking legitimate inserts
**Solution**: Create proper policies for authenticated users and service role

### Issue 4: Node.js module errors with unified client
**Cause**: `createClient()` tries to import Node.js modules like 'events'
**Solution**: Use separate `GoTrueClient` and `PostgrestClient` instead

### Issue 5: Multiple conflicting triggers
**Cause**: Old triggers not properly cleaned up
**Solution**: Drop all existing triggers before creating new ones

## Debugging Commands

### Check if trigger exists:
```sql
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
    AND event_object_schema = 'auth';
```

### Test trigger manually:
```sql
-- Test the trigger by manually inserting a user
INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    'dummy_password',
    NOW(),
    NOW(),
    NOW()
);

-- Check if profile was created
SELECT * FROM public.user_profiles WHERE email = 'test@example.com';
```

### Check table structure:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Check RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

## Key Learnings

1. **Always check if the database trigger exists first** - this was the root cause
2. **Use separate clients for React Native** - unified client causes module issues
3. **Handle duplicates gracefully** - use `ON CONFLICT DO NOTHING`
4. **Set explicit schema paths** - add `SET search_path = public`
5. **Test triggers manually** - insert test users to verify trigger works
6. **Check Auth logs, not just Postgres logs** - Auth logs show the actual errors
7. **RLS policies need to allow both authenticated users AND service role**

## Final Working Configuration

### Database:
- ✅ `user_profiles` table exists with proper structure
- ✅ Trigger function `create_user_profile()` with `ON CONFLICT DO NOTHING`
- ✅ Trigger `create_profile_on_signup` on `auth.users` table
- ✅ RLS policies allowing authenticated users and service role

### React Native:
- ✅ Separate `GoTrueClient` and `PostgrestClient` (no unified client)
- ✅ Expo SecureStore for token storage
- ✅ Proper error handling in auth context

### Result:
- ✅ Google Sign-In works
- ✅ Apple Sign-In works  
- ✅ Email/Password signup works
- ✅ User profiles auto-created in database
- ✅ No more "Database error saving new user"

## Success Metrics

After implementing the solution:
- **Authentication**: ✅ All methods working
- **Database**: ✅ User profiles auto-created
- **Logs**: ✅ Clean authentication flow
- **User Experience**: ✅ Seamless sign-in process

This guide serves as a comprehensive reference for debugging similar Supabase authentication issues in React Native applications. 