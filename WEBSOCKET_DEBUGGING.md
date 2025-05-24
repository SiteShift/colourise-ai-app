# WebSocket/Supabase Debugging Documentation

## 🎯 **GOAL**
Get Supabase authentication working in React Native iOS app without WebSocket dependencies.

## ❌ **WHAT WE'VE TRIED (AND FAILED)**

### 1. Polyfills Approach (FAILED)
- **What**: Added 22 browserify polyfills (buffer, crypto-browserify, stream-browserify, etc.)
- **Result**: Complex, heavy, still had WebSocket issues
- **Status**: ❌ ABANDONED - User doesn't want polyfills

### 2. Blocking @supabase/realtime-js (FAILED)
- **What**: Blocked realtime-js in metro.config.js
- **Result**: Still imported ws through other dependencies
- **Status**: ❌ FAILED

### 3. Auth-Only Client @supabase/auth-js (FAILED)
- **What**: Switched to auth-only client to avoid realtime
- **Result**: "Invalid API key" errors, missing methods
- **Status**: ❌ FAILED - API incompatible

### 4. Downgrading Supabase (TRIED BEFORE)
- **What**: User says we already tried downgrading versions
- **Result**: User explicitly said we tried this
- **Status**: ❌ DON'T REPEAT

### 5. Complex Metro Configurations (FAILED)
- **What**: Multiple blocking, aliasing, and mock configurations
- **Result**: Still had issues, overly complex
- **Status**: ❌ ABANDONED

### 6. Simple realtime: {disabled: true} (FAILED)
- **What**: Tried to disable realtime in createClient options
- **Result**: TypeScript errors, realtime module still imported
- **Status**: ❌ FAILED - API changed

## 📊 **CURRENT STATUS**

### What's Working:
- ✅ App loads successfully
- ✅ iOS build compiles
- ✅ Metro server connects
- ✅ UI renders properly

### What's Broken:
- ❌ Supabase v2.49.8 imports `ws` module
- ❌ React Native can't import Node.js `stream` module
- ❌ Authentication completely broken

### Current Configuration:
- **Supabase**: v2.49.8 (user updated from 2.39.3)
- **Package**: @supabase/supabase-js
- **Realtime**: Can't be properly disabled in newer versions
- **Metro**: Default Expo config

## 🔍 **ROOT CAUSE ANALYSIS**

The issue is that `@supabase/supabase-js` v2.49.8 has a dependency chain:
```
@supabase/supabase-js → @supabase/realtime-js → ws → Node.js modules
```

**NEW INSIGHT**: Even with `realtime: { disabled: true }`, the module still gets imported at bundle time.

## 🚀 **NEXT APPROACH OPTIONS**

### Option A: Environment-Specific Realtime Blocking ❌ FAILED
- TypeScript errors with realtime options
- Module still imported even when disabled

### ✅ Option B: Custom Auth Client (RECOMMENDED)
Based on Medium article findings:
- Use `@supabase/gotrue-js` for auth
- Use `@supabase/postgrest-js` for database
- Skip the full supabase-js client entirely
- **Proven to work** in React Native projects

### Option C: Fork/Patch Approach
- Use patch-package to modify @supabase/supabase-js
- Remove realtime imports at the source

### Option D: Alternative Auth Solution
- Use a different auth provider (Firebase Auth, Auth0, etc.)
- Keep Supabase for data but use different auth

## 🚨 **RULES TO AVOID CIRCLES**
1. ❌ NO MORE POLYFILLS - User explicitly rejected
2. ❌ NO DOWNGRADING - User said we already tried
3. ❌ NO COMPLEX METRO CONFIGS - Proven to fail
4. ❌ NO @supabase/auth-js - API incompatible
5. ❌ NO realtime options tweaking - Doesn't prevent imports
6. ✅ KEEP IT SIMPLE - Minimal changes only

## 📝 **DECISION LOG**
- **2024-01-XX**: Started with polyfills → FAILED
- **2024-01-XX**: Tried auth-js → API errors
- **2024-01-XX**: Back to supabase-js v2.49.8 → WebSocket errors
- **2024-01-XX**: Tried realtime: {disabled: true} → TypeScript errors
- **2024-01-XX**: User rejected going in circles → CREATE THIS DOC
- **2024-01-XX**: Research found gotrue-js + postgrest-js approach → TRYING NOW
- **2024-01-XX**: Implemented separate clients → API KEY MISSING ERROR

## 🎯 **CURRENT APPROACH: Option B - Separate Auth/DB Clients**

**Replace:**
```typescript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(url, key, options)
```

**With:**
```typescript
import { GoTrueClient } from '@supabase/gotrue-js'
import { PostgrestClient } from '@supabase/postgrest-js'

export const auth = new GoTrueClient({...})
export const db = new PostgrestClient(url, {...})
```

**Advantages:**
- ✅ No WebSocket dependencies
- ✅ Smaller bundle size
- ✅ Only load what we need
- ✅ Proven to work in React Native 

## 🔍 **CURRENT ISSUE ANALYSIS**

### ❌ **Root Cause Found: Missing API Key in GoTrueClient**

**Problem:** The `GoTrueClient` is missing the API key configuration!

**Current Configuration:**
```typescript
export const auth = new GoTrueClient({
  url: `${supabaseUrl}/auth/v1`,
  autoRefreshToken: true,
  persistSession: true,
  storageKey: 'supabase.auth.token',
  storage: ExpoSecureStoreAdapter,
  fetch,
  // ❌ MISSING: API key headers!
})
```

**What's Missing:**
- The `apikey` header in auth requests
- The `Authorization` header with the anon key

**Why This Breaks:**
1. **Email/Password signup/signin**: Supabase auth endpoints require the API key
2. **Google Sign-In**: `signInWithIdToken()` calls Supabase auth API without credentials
3. **Apple Sign-In**: Same issue as Google

### ✅ **Comparison: Database Client Has API Key**
```typescript
export const db = new PostgrestClient(`${supabaseUrl}/rest/v1`, {
  headers: {
    apikey: supabaseAnonKey,        // ✅ Has API key
    Authorization: `Bearer ${supabaseAnonKey}`, // ✅ Has auth header
  },
  fetch,
})
```

### 🎯 **Simple Fix Needed**
Add API key headers to the GoTrueClient configuration (similar to PostgrestClient).

## 🚀 **NEXT STEP: Minimal Fix**
Add the missing API key headers to the GoTrueClient without changing anything else. 