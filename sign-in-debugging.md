# Sign-In Database Error Debugging Log

## 🔴 **THE PERSISTENT PROBLEM**
**Error**: "Database error saving new user"
**Frequency**: Occurs with ALL authentication methods (Apple Sign-In, Google Sign-In, Email/Password)
**Impact**: Users cannot create accounts or sign in successfully

---

## 📋 **ORIGINAL ISSUE ANALYSIS**

### **Error Source Location**
- **File**: `context/auth-context.tsx`
- **Function**: `convertSupabaseUser()`
- **Line**: Thrown when manual user profile creation fails
- **Error Message**: `Database error saving new user: ${insertError.message}`

### **Expected Flow**
1. User authenticates with Supabase Auth (Apple/Google/Email)
2. Database trigger should automatically create user profile
3. If trigger fails, manual profile creation should work
4. User profile should exist with 10 default credits

### **Actual Flow**
1. User authenticates successfully with Supabase Auth ✅
2. Database trigger fails to create profile ❌
3. Manual profile creation also fails ❌
4. Error thrown and user sees "Database error saving new user" ❌

---

## 🛠️ **ATTEMPTED SOLUTIONS & ANALYSIS**

### **Attempt 1: Basic Fallback Mechanism**
**Date**: Initial implementation
**Approach**: Wait for database trigger, then manual creation if needed
**Code Changes**:
```typescript
// Wait for trigger
await new Promise(resolve => setTimeout(resolve, 2000))
userProfile = await DatabaseService.getUserProfile(supabaseUser.id)

if (!userProfile) {
  // Manual creation fallback
  throw new Error('Failed to create user profile in database')
}
```
**Result**: ❌ Still failed
**Analysis**: Likely insufficient - no actual manual creation, just error throwing

---

### **Attempt 2: Supabase Key Configuration Fix**
**Date**: Build `ee26ba8e-4806-42ad-a643-e30cd8915457`
**Problem Identified**: Using service_role key instead of anon key
**Approach**: Updated to correct anon key from Supabase dashboard
**Code Changes**:
```typescript
// Before
const supabaseAnonKey = 'eyJ...service_role...'
// After  
const supabaseAnonKey = 'eyJ...anon...'
```
**Result**: ❌ All auth methods still failed
**Analysis**: Key was correct but didn't resolve the core issue

---

### **Attempt 3: Manual Profile Creation Implementation**
**Date**: Build `b0b42ef3-4a23-4a9d-9f02-1f5aa3808349`
**Approach**: Added actual manual profile creation logic
**Code Changes**:
```typescript
const profileData = {
  id: supabaseUser.id,
  email: supabaseUser.email || '',
  full_name: supabaseUser.user_metadata?.full_name || "User",
  avatar_url: supabaseUser.user_metadata?.avatar_url || null,
  credits: 10,
  last_active_date: new Date().toISOString().split('T')[0],
  streak_count: 1
}

const { data: createdProfile, error: insertError } = await db
  .from('user_profiles')
  .insert(profileData)
  .select()
  .single()
```
**Result**: ❌ Insert operation failed
**Analysis**: RLS policies likely blocking insert with anon key

---

### **Attempt 4: Authentication Header Management**
**Date**: Build `af1fe458-d7ed-4822-a66e-40ea777ca3d5`
**Problem Identified**: Database client using static anon key, needs user JWT
**Approach**: Dynamic auth header updates with user access token
**Code Changes**:
```typescript
// Added functions to update DB headers
export const updateDbHeaders = (accessToken: string) => {
  if (db && accessToken) {
    db.headers = {
      ...db.headers,
      Authorization: `Bearer ${accessToken}`,
    }
  }
}

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

// In auth context
updateDbHeaders(session.access_token)
const authDb = getAuthenticatedDb(session.access_token)
```
**Result**: ❌ Still failed
**Analysis**: JWT token approach should work for RLS, but something is still wrong

---

### **Attempt 5: Comprehensive Debugging + Service Role Fallback**
**Date**: Build `3768275d-035a-49e4-bb16-d062d40943cd` (Latest)
**Approach**: Added detailed logging + service role API fallback
**Code Changes**:
```typescript
// Extended trigger wait time
await new Promise(resolve => setTimeout(resolve, 3000))

// Detailed error logging
console.error('=== DETAILED INSERT ERROR ===')
console.error('Error code:', insertError.code)
console.error('Error message:', insertError.message)
console.error('Error details:', insertError.details)
console.error('Error hint:', insertError.hint)

// Service role fallback via direct API call
const serviceRoleResponse = await fetch(`https://wnkxqkesotshizqedmxw.supabase.co/rest/v1/user_profiles`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJ...service_role...',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify(profileData)
})
```
**Result**: 🔄 Pending testing
**Analysis**: Should provide detailed error info and bypass RLS with service role

---

## 🔍 **CURRENT THEORIES**

### **Theory 1: RLS Policy Issues**
**Hypothesis**: Row Level Security policies are blocking profile creation
**Evidence**: 
- Manual insert fails even with user JWT token
- Database trigger might also be affected by RLS
**Potential Issues**:
- RLS policy requires authenticated role but user isn't fully authenticated yet
- Policy logic might be incorrect
- INSERT policy might be missing or wrong

### **Theory 2: Database Schema/Trigger Problems**
**Hypothesis**: Database trigger isn't working correctly
**Evidence**:
- Profile never gets created automatically
- Even after 3 second wait, no profile exists
**Potential Issues**:
- Trigger not installed correctly in database
- Trigger failing silently
- Wrong trigger conditions

### **Theory 3: Timing/Race Condition**
**Hypothesis**: Auth flow timing issues
**Evidence**:
- User gets authenticated but profile creation happens too early
- JWT token might not be fully valid yet
**Potential Issues**:
- Calling database operations before auth session is fully established
- Token not propagated correctly to database client

### **Theory 4: Supabase Configuration Issues**
**Hypothesis**: Project settings or permissions wrong
**Evidence**:
- Multiple different approaches all fail
- Even service role might fail
**Potential Issues**:
- Project not configured correctly for auth
- Database permissions incorrect
- API keys not working as expected

---

## 🎯 **NEEDED DEBUGGING DATA**

### **From Latest Build (`3768275d-035a-49e4-bb16-d062d40943cd`)**
When testing, we need to capture:

1. **Detailed Error Information**:
   - Exact error code (e.g., 23505, 42501, etc.)
   - Full error message and hint
   - Error details object

2. **Session Information**:
   - Whether access token is present
   - User ID being used
   - Email and metadata available

3. **Database Trigger Status**:
   - Whether profile gets created after 3 second wait
   - If trigger is working at all

4. **Service Role Fallback**:
   - Whether direct API call with service role succeeds
   - What error occurs if it fails

### **Console Log Format**
Look for these logs in the debug console:
```
=== USER PROFILE CREATION PROCESS ===
User ID: [uuid]
Email: [email]
Session token present: true/false
Waiting for database trigger...
Profile found after trigger wait: true/false
Attempting manual profile creation with data: [object]
=== DETAILED INSERT ERROR ===
Error code: [code]
Error message: [message]
[... other error details]
Service role profile creation successful/failed: [result]
```

---

## 🚨 **MOST LIKELY ISSUES**

### **Issue 1: RLS Policy Missing INSERT Permission**
**Probability**: HIGH
**Solution**: Check/fix RLS policies in Supabase dashboard
```sql
-- Required policy
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
```

### **Issue 2: Database Trigger Not Installed**
**Probability**: HIGH  
**Solution**: Verify trigger exists and is working
```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'create_user_profile_trigger';
```

### **Issue 3: Auth Session Not Fully Established**
**Probability**: MEDIUM
**Solution**: Delay profile creation until session is fully ready

### **Issue 4: Wrong JWT Token Scope**
**Probability**: MEDIUM
**Solution**: Verify JWT token has correct role and permissions

---

## 📋 **NEXT STEPS TO TRY**

### **Immediate Actions**
1. **Test Latest Build** - Get detailed error logs from build `3768275d`
2. **Check Supabase Dashboard** - Verify RLS policies and triggers exist
3. **Manual Database Test** - Try creating profile directly in Supabase dashboard

### **If Still Failing**
1. **Disable RLS Temporarily** - Test if RLS is the issue
2. **Use Service Role Only** - Bypass RLS completely for profile creation
3. **Simplify Profile Creation** - Remove complex fields, just create basic profile
4. **Check Auth Session** - Verify session.access_token is valid JWT

### **Alternative Approaches**
1. **Server-Side Profile Creation** - Use Edge Function or webhook
2. **Pre-Auth Profile Creation** - Create profile before full authentication
3. **Two-Step Process** - Authenticate first, then create profile separately

---

## 🔧 **CODE INVESTIGATION AREAS**

### **Files to Review**
- `database-schema.sql` - Check trigger and RLS policies
- `lib/supabase.ts` - Verify client configuration
- `context/auth-context.tsx` - Auth flow logic
- `lib/database-service.ts` - Database operations

### **Supabase Dashboard Checks**
- Authentication → Settings → Confirm Apple/Google providers
- Database → user_profiles table → Check RLS policies
- SQL Editor → Test trigger function manually
- Logs → Check for any error messages

---

## 💡 **DEBUGGING COMMANDS FOR MANUAL TESTING**

### **Test Database Trigger**
```sql
-- Simulate user creation to test trigger
INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at)
VALUES ('test-uuid', 'test@example.com', now(), now(), now());

-- Check if profile was created
SELECT * FROM user_profiles WHERE id = 'test-uuid';
```

### **Test RLS Policies**
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Test insert with specific user
SET LOCAL role TO authenticated;
SET LOCAL jwt.claims.sub TO 'user-uuid-here';
INSERT INTO user_profiles (id, email, credits) VALUES ('user-uuid-here', 'test@example.com', 10);
```

### **Test Manual Profile Creation**
```sql
-- Direct insert (should work with service role)
INSERT INTO user_profiles (id, email, full_name, credits, last_active_date, streak_count)
VALUES ('test-uuid-2', 'test2@example.com', 'Test User', 10, CURRENT_DATE, 1);
```

---

## 📊 **SUCCESS CRITERIA**

### **Build Considered Fixed When**:
1. ✅ New user can sign up with Apple Sign-In
2. ✅ New user can sign up with Google Sign-In  
3. ✅ New user can sign up with Email/Password
4. ✅ User profile created automatically with 10 credits
5. ✅ No "Database error saving new user" message
6. ✅ User can proceed to main app interface

### **Partial Success Indicators**:
- Database trigger works (profile created after wait)
- Manual creation works (logged as successful)
- Service role fallback works (API call succeeds)
- Detailed error logs show specific issue

---

*Last Updated: Latest build `3768275d-035a-49e4-bb16-d062d40943cd` deployed*
*Status: Awaiting test results with comprehensive debugging* 