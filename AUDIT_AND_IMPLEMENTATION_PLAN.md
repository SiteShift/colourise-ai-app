# ColorizeAI App - Complete Audit & Implementation Plan (FINAL)

**Audit Date:** February 2026
**Last Development:** 9 months ago
**Current Version:** 1.0.0
**Platform Target:** iOS (primary), Android (secondary)
**Release Readiness:** ~90% (all code implementation complete - testing & submission remaining)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Ship-Blockers](#critical-ship-blockers)
3. [Architecture Changes Required](#architecture-changes-required)
4. [Technical Decisions Required Before Coding](#technical-decisions-required-before-coding)
5. [Minimum Viable Backend Tables](#minimum-viable-backend-tables)
6. [RevenueCat Integration (Production-Ready)](#revenuecat-integration-production-ready)
7. [Implementation Plan (Final)](#implementation-plan-final)
8. [Security & Abuse Prevention](#security--abuse-prevention)
9. [Store Compliance Checklist](#store-compliance-checklist)
10. [Testing Checklist](#testing-checklist)

---

## Executive Summary

### Actual State of the App

| Component | Claimed Status | Actual Status | Evidence |
|-----------|---------------|---------------|----------|
| Payments | "Coming soon" | ❌ Mock only | `transform-screen.tsx:1082`, `profile-screen.tsx:303` |
| Credit System | Working | ❌ **Client-side only** | `transform-screen.tsx:424-433` - uses `setUser()` not DB |
| Cloud Gallery | Working | ❌ **In-memory mock** | `supabase.ts:103-160` - `imagesStorage` is an array |
| AI API Keys | Secured | ❌ **Bundled in app binary** | `EXPO_PUBLIC_*` vars in service files |
| DB Schema | Aligned | ❌ **Mismatched** | Missing `credits_balance_after` in inserts |
| Supabase Client | Full SDK | ❌ **Partial wrapper only** | No `functions.invoke` or `storage` support |

### True Release Readiness: ~35%

The app has functional UI and auth, but the **payment enforcement, credit system, and cloud features are fundamentally broken**. Shipping this app would result in:
- **Unlimited free usage** (credits bypass via UI manipulation)
- **API key theft** (keys extractable from JS bundle)
- **Unbounded AI API costs** (no server-side enforcement)
- **App Store rejection** (mock payments)

---

## Critical Ship-Blockers

### 🚨 BLOCKER 1: AI API Keys Exposed Client-Side

**This is a security emergency.** API keys are bundled into the app binary via `EXPO_PUBLIC_*` environment variables.

| Service | File | Line | Key Variable |
|---------|------|------|--------------|
| DeepAI | `lib/deepai-service.ts` | 2 | `EXPO_PUBLIC_DEEPAI_API_KEY` |
| OpenAI | `lib/openai-service.ts` | 15-18 | `EXPO_PUBLIC_OPENAI_API_KEY` |
| Cloudinary | `lib/cloudinary-service.ts` | 6-16 | `EXPO_PUBLIC_CLOUDINARY_API_KEY` |

**Evidence - DeepAI key logging:**
```typescript
// deepai-service.ts:37
console.log("Making API request to DeepAI with API key:",
  DEEPAI_API_KEY ? DEEPAI_API_KEY.substring(0, 10) + "..." : "undefined");
```

**Impact:**
- Anyone can extract keys from the app bundle
- Attackers can run up unlimited AI processing bills
- No way to revoke keys without app update
- Cannot enforce payments (users bypass app entirely)

**Required Fix:** Move ALL AI API calls to server-side (Supabase Edge Functions).

---

### 🚨 BLOCKER 2: Credits Are Client-Side Only (No Server Enforcement)

Credits are deducted via React state updates, **NOT database writes**.

**Evidence - Credit deduction in transform-screen.tsx:**
```typescript
// Line 424-433 - This is just React state!
const updateCredits = (newCredits: number) => {
  setCredits(newCredits);
  if (user) {
    setUser({
      ...user,
      credits: newCredits
    });
  }
};

// Lines 665, 724, 1349, 1431 - All client-side only
updateCredits(credits - 1)
```

**The DB has proper functions that are NOT being used:**
```sql
-- database-schema.sql:213-262
CREATE OR REPLACE FUNCTION use_credits(...) RETURNS BOOLEAN
-- This function EXISTS but is NEVER called by the app!
```

**Impact:**
- Users can manipulate local state to get free processing
- Refreshing the app restores credits from DB (never deducted)
- Even with RevenueCat, payments aren't enforceable

---

### 🚨 BLOCKER 3: Supabase Client Wrapper is Incomplete

The current `supabase.ts` exports a minimal wrapper that **cannot** do what the implementation plan requires.

**Current exports (supabase.ts:90-94):**
```typescript
export const supabase = {
  auth,
  from: (table: string) => db.from(table),
  // That's it - NO functions, NO storage
}
```

**What's missing:**
- `supabase.functions.invoke()` - Required for Edge Function calls
- `supabase.storage` - Required for image uploads
- Authenticated storage client with user JWT

**Impact:** Phase 0 code examples won't compile until this is fixed.

---

### 🚨 BLOCKER 4: Edge Functions Can't Access Local Device Files

**Critical technical flaw in Phase 0 design.**

This code pattern **WILL NOT WORK**:
```typescript
// ❌ BROKEN - Edge Function can't read file:// URIs
supabase.functions.invoke('colorize', { body: { imageUri } })
```

When `imageUri` is `file:///var/mobile/.../image.jpg`, the Edge Function (running on Supabase infrastructure) has no access to the user's device filesystem.

**Required: Choose one pattern (see Technical Decisions section)**

---

### 🚨 BLOCKER 5: Cloud Gallery is an In-Memory Mock

**Evidence - supabase.ts:103-160:**
```typescript
// In-memory storage for demo purposes
let imagesStorage: ImageMetadata[] = [];
```

**Impact:**
- "Cloud saved" images disappear on app restart
- Premium "cloud sync" does nothing

---

### 🚨 BLOCKER 6: Android launchMode Conflicts with RevenueCat

**AndroidManifest.xml:20:**
```xml
android:launchMode="singleTask"
```

RevenueCat explicitly warns that `singleTask` can cause purchase flows to be cancelled unexpectedly. They recommend `standard` or `singleTop`.

**Source:** [RevenueCat Android Troubleshooting](https://revenuecat.com)

---

### 🚨 BLOCKER 7: iOS Deployment Target Mismatch

Three different values across the project:

| Location | Value |
|----------|-------|
| `app.json` | iOS 12.0 |
| `Info.plist:46-47` | `LSMinimumSystemVersion` = 12.0 |
| `Podfile.properties.json` | iOS 15.1 |
| `project.pbxproj` | `IPHONEOS_DEPLOYMENT_TARGET` = 15.1 |

**Fix:** Align ALL to iOS 15.1 (or chosen minimum).

---

## Architecture Changes Required

### Current (Broken) Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile App                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Credits     │  │ AI Services │  │ Supabase Client     │ │
│  │ (UI state   │  │ (Direct API │  │ (Partial - no       │ │
│  │  only!)     │  │  with keys) │  │  functions/storage) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         ❌               ❌                   ❌             │
└─────────────────────────────────────────────────────────────┘
```

### Required (Secure) Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile App                           │
│  • NO AI API keys                                           │
│  • Uses full Supabase JS client (auth + storage + functions)│
│  • Credits read-only from server                            │
│  • Uploads images to Storage, then invokes Edge Functions   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │  Supabase   │  │  Supabase   │  │  Supabase   │
     │  Auth       │  │  Storage    │  │  Functions  │
     │  (existing) │  │  (new)      │  │  (new)      │
     └─────────────┘  └─────────────┘  └─────────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                      │   DeepAI    │ │  Cloudinary │ │   OpenAI    │
                      │(server key) │ │(server key) │ │(server key) │
                      └─────────────┘ └─────────────┘ └─────────────┘
```

---

## Technical Decisions Required Before Coding

### DECISION 1: Image Upload Pattern for Edge Functions

Edge Functions cannot access `file://` URIs. Choose ONE:

#### Option A: Upload to Storage First (RECOMMENDED)
```
1. App uploads image bytes to Supabase Storage (user's folder)
2. App calls Edge Function with { bucket, objectPath }
3. Edge Function downloads from Storage (server-side)
4. Edge Function processes via AI API
5. Edge Function stores result in Storage
6. Edge Function returns result URL (signed or public)
```

**Pros:** Works with large files, resumable uploads, images persist
**Cons:** Two round trips, requires Storage setup

#### Option B: Send Base64 to Edge Function
```
1. App converts image to base64
2. App calls Edge Function with { imageBase64 }
3. Edge Function decodes, processes, returns result
```

**Pros:** Single request
**Cons:** ~33% larger payload, Supabase Edge Function payload limits (~6MB), memory pressure

**RECOMMENDED: Option A** - Upload to Storage first.

---

### DECISION 2: Supabase Client Upgrade

Current wrapper is insufficient. Choose ONE:

#### Option A: Use Full @supabase/supabase-js Client (RECOMMENDED)
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
    }
  }
)

// Now available:
// supabase.auth
// supabase.from()
// supabase.storage
// supabase.functions
```

**Pros:** Full SDK, maintained, documented
**Cons:** Slightly larger bundle, may have WebSocket code (but can be tree-shaken)

#### Option B: Add Storage/Functions Helpers to Current Wrapper
Keep existing GoTrueClient + PostgrestClient, add manual fetch calls.

**Pros:** Smaller bundle, no WebSocket
**Cons:** More code to maintain, may miss SDK updates

**RECOMMENDED: Option A** - Use full SDK.

---

### DECISION 3: Credit Failure/Rollback Policy

When Edge Function deducts credits but AI processing fails:

#### Option A: Refund on Failure (RECOMMENDED)
```typescript
// In Edge Function
const deducted = await supabase.rpc('use_credits', {...})
try {
  const result = await callAIService(...)
  return result
} catch (error) {
  // Refund the credits
  await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_credits_to_add: creditsUsed,
    p_description: 'Refund: Processing failed',
    p_transaction_ref: `refund_${originalTransactionId}`
  })
  throw error
}
```

**Pros:** Fair to users, fewer support tickets
**Cons:** Slightly complex, two DB writes on failure

#### Option B: Reserve → Finalize Pattern
```sql
-- New function: reserve_credits (marks as pending)
-- New function: finalize_credits (confirms usage)
-- New function: release_credits (cancels reservation)
```

**Pros:** More accurate, no "refund" transactions
**Cons:** More complex, requires schema changes

#### Option C: No Refunds (Simplest)
Credits are deducted, failures happen, users deal with it.

**Pros:** Simple
**Cons:** Bad UX, support burden, App Review complaints

**RECOMMENDED: Option A** - Refund on failure.

---

### DECISION 4: Storage Bucket Privacy

Current schema creates **private** buckets:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('colorized-images', 'colorized-images', FALSE)
```

If buckets are private, you cannot return a simple public URL. Options:

#### Option A: Keep Private + Signed URLs (RECOMMENDED)
```typescript
const { data } = await supabase.storage
  .from('colorized-images')
  .createSignedUrl(path, 3600) // 1 hour expiry
```

**Pros:** Secure, images not publicly accessible
**Cons:** URLs expire, must refresh periodically

#### Option B: Make Buckets Public
Change to `public = TRUE`.

**Pros:** Simple URLs that never expire
**Cons:** Anyone with URL can access, less secure

**RECOMMENDED: Option A** - Private buckets with signed URLs.

---

### DECISION 5: RevenueCat Webhook vs. SDK-Only

RevenueCat webhooks require **Pro plan** (paid).

#### Option A: Webhook-Based Credit Granting (RECOMMENDED if budget allows)
- Webhook receives `NON_RENEWING_PURCHASE` event
- Edge Function grants credits server-side
- Most reliable, handles edge cases

**Cost:** RevenueCat Pro plan pricing

#### Option B: SDK-Only Credit Granting
- After successful purchase, app calls Edge Function directly
- Edge Function verifies receipt with RevenueCat API
- Grants credits

**Pros:** No Pro plan needed
**Cons:** Less reliable if app crashes after purchase, must implement receipt verification

**RECOMMENDED: Option A if budget allows, else Option B with receipt verification.**

---

### DECISION 6: Refund/Cancellation Handling for Consumables

When Apple/Google refunds a consumable purchase:

#### Option A: Claw Back Credits (Complex)
Deduct credits on `CANCELLATION` webhook. If balance goes negative, block features.

**Pros:** Prevents fraud
**Cons:** Complex, poor UX for legitimate refunds

#### Option B: Accept the Loss (RECOMMENDED for MVP)
Do not claw back. Accept that some refunded credits may be used.

**Pros:** Simple, good UX
**Cons:** Small fraud risk (but refund abuse is rate-limited by stores)

**RECOMMENDED: Option B for MVP** - Accept the loss, revisit if fraud becomes significant.

---

### DECISION 7: Gallery Scope for MVP

Current plan has conflict: Phase 0 requires Storage, but "cloud storage can be deferred."

#### Option A: Gallery is Local-Only for MVP (RECOMMENDED)
- Images saved to device only (AsyncStorage + MediaLibrary)
- No cross-device sync
- Edge Functions return URLs, app downloads and saves locally
- Defer real cloud gallery to post-launch

**Pros:** Simpler MVP, faster to market
**Cons:** No cloud sync (but users don't lose existing functionality)

#### Option B: Full Cloud Gallery in MVP
- Implement real Supabase Storage
- All processed images stored in cloud
- Gallery syncs across devices

**Pros:** Premium feature works
**Cons:** More work, delays launch

**RECOMMENDED: Option A** - Local gallery for MVP, cloud gallery post-launch.

---

### DECISION 8: Currency in Database vs. App

DB has USD prices, UI shows GBP.

#### Solution (RECOMMENDED):
- **Remove prices from database** (or keep as reference only)
- **Always show prices from RevenueCat Offerings** - automatically localized
- RevenueCat returns prices in user's local currency

---

## Minimum Viable Backend Tables

Before shipping, these tables MUST be live and working:

### Required Tables

| Table | Purpose | Status |
|-------|---------|--------|
| `user_profiles` | User data, credit balance, RevenueCat ID | ✅ Exists, needs `revenuecat_id` column |
| `credit_transactions` | Audit trail, idempotency | ✅ Exists, needs unique constraint on `transaction_reference` |
| `credit_packages` | (Optional) Reference data | ⚠️ Exists but mismatched - consider removing |

### Required Storage Buckets

| Bucket | Purpose | Privacy |
|--------|---------|---------|
| `original-images` | User uploads for processing | Private |
| `colorized-images` | AI processing results | Private |

### Required Functions (SQL)

| Function | Purpose | Status |
|----------|---------|--------|
| `use_credits()` | Atomic credit deduction | ✅ Exists, not called by app |
| `add_credits()` | Atomic credit addition | ✅ Exists, needs idempotency check |

### Required Schema Changes

```sql
-- 1. Add RevenueCat customer ID
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS revenuecat_id TEXT UNIQUE;

-- 2. Add unique constraint for webhook idempotency
-- Use event.id from RevenueCat, not just transaction_id
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS revenuecat_event_id TEXT UNIQUE;

-- 3. Update add_credits to check idempotency
CREATE OR REPLACE FUNCTION add_credits_idempotent(
    p_user_id UUID,
    p_credits_to_add INTEGER,
    p_description TEXT,
    p_revenuecat_event_id TEXT  -- Use event.id for deduplication
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
    new_balance INTEGER;
BEGIN
    -- Check if already processed
    IF EXISTS (
        SELECT 1 FROM credit_transactions
        WHERE revenuecat_event_id = p_revenuecat_event_id
    ) THEN
        RETURN TRUE;  -- Already processed, return success
    END IF;

    -- Get current credits
    SELECT credits INTO current_credits
    FROM user_profiles WHERE id = p_user_id;

    new_balance := current_credits + p_credits_to_add;

    -- Update balance
    UPDATE user_profiles
    SET credits = new_balance, updated_at = NOW()
    WHERE id = p_user_id;

    -- Log transaction with event ID
    INSERT INTO credit_transactions (
        user_id, transaction_type, credits_amount,
        credits_balance_after, description, revenuecat_event_id
    ) VALUES (
        p_user_id, 'purchase', p_credits_to_add,
        new_balance, p_description, p_revenuecat_event_id
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## RevenueCat Integration (Production-Ready)

### Prerequisites

1. **RevenueCat Account** - Create at revenuecat.com
2. **RevenueCat Pro Plan** - Required for webhooks (if using webhook pattern)
3. **App Store Connect API Key** - For RevenueCat to validate receipts
4. **Google Play Service Account** - For Android receipt validation

### Product Configuration

#### Consumable Credit Packs

| App Store Product ID | RevenueCat Identifier | Credits | Suggested Price |
|---------------------|----------------------|---------|-----------------|
| `com.max.colouriseaiapp.credits20` | `credits_20` | 20 | Tier 2 (~$1.99) |
| `com.max.colouriseaiapp.credits70` | `credits_70` | 70 | Tier 5 (~$4.99) |
| `com.max.colouriseaiapp.credits250` | `credits_250` | 250 | Tier 15 (~$14.99) |

**Note:** Always display prices from RevenueCat Offerings (localized), not hardcoded values.

### Android launchMode Fix

**Current (problematic):**
```xml
android:launchMode="singleTask"
```

**Required fix in AndroidManifest.xml:**
```xml
android:launchMode="singleTop"
```

### Webhook Handler (Corrected)

```typescript
// supabase/functions/revenuecat-webhook/index.ts
import { createClient } from '@supabase/supabase-js'

const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH')!
const CREDIT_MAP: Record<string, number> = {
  'credits_20': 20,
  'credits_70': 70,
  'credits_250': 250,
}

Deno.serve(async (req) => {
  // 1. Verify Authorization header (NOT X-RevenueCat-Signature)
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${WEBHOOK_AUTH}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json()
  const { event } = body

  // 2. Handle consumable purchase
  // Use NON_RENEWING_PURCHASE for consumables, not INITIAL_PURCHASE
  if (event.type === 'NON_RENEWING_PURCHASE') {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const userId = event.app_user_id
    const productId = event.product_id
    const eventId = event.id  // Use event.id for idempotency, not transaction_id

    const credits = CREDIT_MAP[productId]
    if (!credits) {
      console.error('Unknown product:', productId)
      return new Response('Unknown product', { status: 400 })
    }

    // 3. Idempotent credit addition using event.id
    const { error } = await supabase.rpc('add_credits_idempotent', {
      p_user_id: userId,
      p_credits_to_add: credits,
      p_description: `Purchase: ${productId}`,
      p_revenuecat_event_id: eventId
    })

    if (error) {
      console.error('Failed to add credits:', error)
      return new Response('Database error', { status: 500 })
    }

    console.log(`Added ${credits} credits to user ${userId}`)
  }

  // 4. Handle refunds/cancellations (MVP: log only, don't claw back)
  if (event.type === 'CANCELLATION') {
    console.warn('Refund/cancellation received:', event.id, event.product_id)
    // For MVP, we accept the loss. Log for monitoring.
    // Future: implement clawback if fraud becomes significant
  }

  return new Response('OK', { status: 200 })
})
```

### SDK Integration

```typescript
// lib/revenuecat-service.ts
import Purchases, { PurchasesPackage } from 'react-native-purchases'
import { Platform } from 'react-native'

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY!,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY!,
}

export class RevenueCatService {
  private static initialized = false

  static async initialize(supabaseUserId: string) {
    if (this.initialized) return

    await Purchases.configure({
      apiKey: Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android,
    })

    // Link RevenueCat to Supabase user ID
    await Purchases.logIn(supabaseUserId)
    this.initialized = true
  }

  static async getOfferings() {
    const offerings = await Purchases.getOfferings()
    return offerings.current?.availablePackages ?? []
  }

  static async purchase(pkg: PurchasesPackage) {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg)
      // Credits added via webhook - return success
      return { success: true, customerInfo }
    } catch (error: any) {
      if (error.userCancelled) {
        return { success: false, cancelled: true }
      }
      throw error
    }
  }

  // NOTE: restorePurchases() is NOT useful for consumables
  // Consumables are one-time and do not restore
  // Only implement if you add subscriptions later
}
```

---

## Implementation Plan (Final)

### Phase 0: Supabase Client & Security Foundation (Days 1-4)

#### 0.1 Replace Supabase Wrapper with Full SDK

**File:** `lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Secure storage adapter
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
  },
})

// Now available:
// supabase.auth
// supabase.from()
// supabase.storage
// supabase.functions
```

#### 0.2 Create Edge Functions

**Directory structure:**
```
supabase/functions/
├── colorize/index.ts
├── enhance-face/index.ts
├── upscale/index.ts
├── generate-scene/index.ts
└── revenuecat-webhook/index.ts
```

**Example: colorize/index.ts**
```typescript
import { createClient } from '@supabase/supabase-js'

const DEEPAI_KEY = Deno.env.get('DEEPAI_API_KEY')!

Deno.serve(async (req) => {
  // 1. Verify JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 2. Parse request
  const { storagePath } = await req.json()

  // 3. Check and deduct credits FIRST
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: deducted } = await adminClient.rpc('use_credits', {
    p_user_id: user.id,
    p_credits_to_use: 1,
    p_description: 'Image colorization'
  })

  if (!deducted) {
    return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // 4. Download image from Storage
    const { data: imageData } = await adminClient.storage
      .from('original-images')
      .download(storagePath)

    if (!imageData) {
      throw new Error('Image not found')
    }

    // 5. Call DeepAI with SERVER-SIDE key
    const formData = new FormData()
    formData.append('image', imageData)

    const response = await fetch('https://api.deepai.org/api/colorizer', {
      method: 'POST',
      headers: { 'api-key': DEEPAI_KEY },
      body: formData
    })

    const result = await response.json()

    if (!result.output_url) {
      throw new Error('DeepAI processing failed')
    }

    // 6. Download result and store in our Storage
    const colorizedResponse = await fetch(result.output_url)
    const colorizedBlob = await colorizedResponse.blob()

    const resultPath = `${user.id}/${Date.now()}_colorized.jpg`
    await adminClient.storage
      .from('colorized-images')
      .upload(resultPath, colorizedBlob)

    // 7. Return signed URL
    const { data: signedUrl } = await adminClient.storage
      .from('colorized-images')
      .createSignedUrl(resultPath, 3600)

    return new Response(JSON.stringify({
      success: true,
      url: signedUrl?.signedUrl,
      creditsRemaining: await getCredits(adminClient, user.id)
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    // 8. REFUND credits on failure
    await adminClient.rpc('add_credits', {
      p_user_id: user.id,
      p_credits_to_add: 1,
      p_description: 'Refund: Colorization failed'
    })

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function getCredits(client: any, userId: string) {
  const { data } = await client
    .from('user_profiles')
    .select('credits')
    .eq('id', userId)
    .single()
  return data?.credits ?? 0
}
```

#### 0.3 Update App to Upload → Invoke Pattern

```typescript
// In transform-screen.tsx or new processing-service.ts

async function colorizeImage(localImageUri: string) {
  const user = supabase.auth.getUser()

  // 1. Upload to Storage first
  const fileName = `${user.id}/${Date.now()}_original.jpg`
  const response = await fetch(localImageUri)
  const blob = await response.blob()

  const { error: uploadError } = await supabase.storage
    .from('original-images')
    .upload(fileName, blob)

  if (uploadError) throw uploadError

  // 2. Invoke Edge Function with storage path
  const { data, error } = await supabase.functions.invoke('colorize', {
    body: { storagePath: fileName }
  })

  if (error) throw error

  // 3. Update local credits from response
  setUser({ ...user, credits: data.creditsRemaining })

  return data.url
}
```

#### 0.4 Remove Client-Side API Keys

Delete from `.env`:
```
# DELETE THESE
EXPO_PUBLIC_DEEPAI_API_KEY
EXPO_PUBLIC_OPENAI_API_KEY
EXPO_PUBLIC_CLOUDINARY_API_KEY
```

Add as Supabase secrets:
```bash
supabase secrets set DEEPAI_API_KEY=xxx
supabase secrets set OPENAI_API_KEY=xxx
supabase secrets set CLOUDINARY_API_KEY=xxx
supabase secrets set CLOUDINARY_API_SECRET=xxx
```

#### 0.5 Delete Old Service Files

After Edge Functions are working, remove:
- `lib/deepai-service.ts`
- `lib/openai-service.ts`
- `lib/cloudinary-service.ts`

Or refactor them to call Edge Functions instead.

---

### Phase 1: RevenueCat Integration (Days 5-7)

#### 1.1 Install SDK
```bash
npx expo install react-native-purchases
```

#### 1.2 Configure RevenueCat Dashboard
1. Create project
2. Add iOS app with App Store Connect API key
3. Add Android app with Play Console service account
4. Create products matching App Store/Play Store products
5. Create Offerings with packages
6. Configure webhook URL (if using Pro plan)
7. Set webhook Authorization header

#### 1.3 Create App Store Products
In App Store Connect:
- Create consumable in-app purchases
- Set pricing tiers
- Submit for review

#### 1.4 Fix Android launchMode
In `android/app/src/main/AndroidManifest.xml`:
```xml
android:launchMode="singleTop"
```

#### 1.5 Implement Purchase UI
Replace mock alerts with real RevenueCat purchase flow.

---

### Phase 2: Database & Schema Fixes (Day 8)

1. Add `revenuecat_id` column to `user_profiles`
2. Add `revenuecat_event_id` column to `credit_transactions`
3. Add unique constraint on `revenuecat_event_id`
4. Create `add_credits_idempotent` function
5. Fix `recordCreditTransaction` to include `credits_balance_after`
6. Remove/update `credit_packages` table to match actual products

---

### Phase 3: Code Cleanup (Days 9-10)

1. Remove ALL console.log/warn/error statements (208+)
2. Fix TypeScript `as any` assertions
3. Fix iOS deployment target (all files → 15.1)
4. Remove Android problematic permissions
5. Delete mock storage code from supabase.ts

---

### Phase 4: Legal & Compliance (Days 11-12)

1. Update Privacy Policy content (not just date):
   - Third-party AI services (OpenAI, DeepAI, Cloudinary)
   - Face/biometric data handling
   - Data retention and deletion
   - GDPR/CCPA rights

2. Update Terms of Service content:
   - Credit purchase terms
   - Refund policy
   - AI content ownership

3. Host at public URLs for App Store

---

### Phase 5: Security & Abuse Prevention (Day 13)

See [Security & Abuse Prevention](#security--abuse-prevention) section.

---

### Phase 6: Testing (Days 14-16)

See [Testing Checklist](#testing-checklist) section.

---

### Phase 7: App Store Submission (Days 17-20)

See [Store Compliance Checklist](#store-compliance-checklist) section.

---

## Security & Abuse Prevention

Even with server-side keys, you need additional protections:

### Rate Limiting

Implement in Edge Functions:
```typescript
// Simple rate limit using Supabase
const RATE_LIMIT = 10  // requests per minute

async function checkRateLimit(userId: string) {
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()

  const { count } = await supabase
    .from('api_requests')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', oneMinuteAgo)

  if (count >= RATE_LIMIT) {
    throw new Error('Rate limit exceeded')
  }

  // Log this request
  await supabase.from('api_requests').insert({
    user_id: userId,
    endpoint: 'colorize',
    created_at: new Date().toISOString()
  })
}
```

### Request Validation

```typescript
// In Edge Functions
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function validateImage(blob: Blob) {
  if (blob.size > MAX_FILE_SIZE) {
    throw new Error('Image too large (max 10MB)')
  }
  if (!ALLOWED_TYPES.includes(blob.type)) {
    throw new Error('Invalid image type')
  }
}
```

### Signup Abuse Prevention

Consider adding:
- Email verification before granting credits
- Device fingerprinting
- IP-based signup limits
- CAPTCHA for signup (using reCAPTCHA or hCaptcha)

### Per-Feature Limits

```typescript
const DAILY_LIMITS = {
  colorize: 50,
  enhance_face: 20,
  upscale: 20,
  scene_builder: 10,
}
```

---

## Store Compliance Checklist

### App Store Connect Data Collection

When asked "What data does your app collect?", answer based on ACTUAL behavior:

| Data Type | Collected? | Linked to User? | Tracking? |
|-----------|------------|-----------------|-----------|
| Photos | Yes | Yes | No |
| User ID | Yes | Yes | No |
| Email | Yes | Yes | No |
| Purchase History | Yes | Yes | No |
| Crash Data | Yes (if Sentry added) | No | No |

### AI Content Policy

Add moderation for user-generated prompts (Scene Builder):
```typescript
// In generate-scene Edge Function
const BLOCKED_TERMS = ['violent', 'explicit', ...]  // Expand as needed

function moderatePrompt(prompt: string) {
  const lower = prompt.toLowerCase()
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      throw new Error('Prompt contains prohibited content')
    }
  }
}
```

Consider using OpenAI's Moderation API for more robust filtering.

### Required URLs

Host these publicly before submission:
- Privacy Policy: `https://yoursite.com/privacy`
- Terms of Service: `https://yoursite.com/terms`
- Support: `https://yoursite.com/support` or email

### Remove Dev-Only Permissions

Confirm these are NOT needed in release builds:

**Android:**
- `SYSTEM_ALERT_WINDOW` - Remove unless actually used
- `requestLegacyExternalStorage` - Remove (deprecated)

**iOS:**
- `NSMicrophoneUsageDescription` - Remove if mic not used
- `NSFaceIDUsageDescription` - Remove if Face ID not used

---

## Testing Checklist

### Security Tests
- [ ] Verify API keys NOT in JS bundle: `npx expo export` and search
- [ ] Verify direct AI API calls fail without Edge Function
- [ ] Verify credits cannot be manipulated client-side
- [ ] Test RLS blocks unauthorized data access
- [ ] Test rate limiting blocks abuse

### Payment Tests (Sandbox)
- [ ] Purchase each credit pack
- [ ] Verify webhook receives event
- [ ] Verify credits added (check DB directly)
- [ ] Verify idempotency (replay webhook, no double credit)
- [ ] Test cancelled purchase flow
- [ ] Test failed purchase flow
- [ ] Test purchase on iOS
- [ ] Test purchase on Android

### Feature Tests
- [ ] Colorize image (credits deducted server-side)
- [ ] Face enhancement (credits deducted server-side)
- [ ] 4K upscale (credits deducted server-side)
- [ ] AI Scene Builder (credits deducted server-side)
- [ ] Verify credit refund on AI failure
- [ ] Insufficient credits shows error
- [ ] Gallery saves locally

### Edge Cases
- [ ] Process image while offline → graceful error
- [ ] Network timeout during processing → credits refunded
- [ ] Very large image → rejected with clear error
- [ ] Invalid image format → rejected with clear error
- [ ] User deletes account → data cleaned up

### Platform Tests
- [ ] iOS 15+ device
- [ ] iOS Simulator
- [ ] Android 11+ device
- [ ] Android Emulator

---

## Timeline Summary

| Phase | Days | Description |
|-------|------|-------------|
| **Phase 0** | 4 | Supabase full client + Edge Functions + upload pattern |
| **Phase 1** | 3 | RevenueCat integration |
| **Phase 2** | 1 | Database schema fixes |
| **Phase 3** | 2 | Code cleanup |
| **Phase 4** | 2 | Legal docs |
| **Phase 5** | 1 | Security/abuse prevention |
| **Phase 6** | 3 | Testing |
| **Phase 7** | 4 | Store submission |
| **Total** | **20 days** | **To App Store submission** |

---

## Quick Reference: Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Image upload pattern | Storage first → Edge Function | Works with large files, reliable |
| Supabase client | Full @supabase/supabase-js | Complete functionality |
| Credit failure | Refund on error | Fair UX, simple |
| Storage privacy | Private + signed URLs | Secure |
| RevenueCat webhooks | Use if Pro plan | Most reliable |
| Refund handling (MVP) | Accept loss | Simple, low fraud risk |
| Gallery (MVP) | Local only | Faster to ship |
| Prices in app | From RevenueCat Offerings | Auto-localized |
| Idempotency key | RevenueCat event.id | Official recommendation |
| Android launchMode | singleTop | RevenueCat compatible |

---

*Document finalized: February 2026*
*Incorporates all Codex audit feedback*

---

## Implementation Progress Log

### Phase 0: Supabase Client & Security Foundation - COMPLETED
- [x] 0.1 Replaced Supabase wrapper with full SDK (`lib/supabase.ts`)
- [x] 0.2 Created Edge Functions (colorize, enhance-face, upscale, generate-scene, revenuecat-webhook)
- [x] 0.3 Updated app to use Upload → Invoke pattern (`lib/processing-service.ts`)
- [x] 0.4 Removed client-side API keys from `.env` (moved to Supabase secrets)
- [x] 0.5 Deprecated old service files (deepai, cloudinary, openai now throw errors directing to ProcessingService)

### Phase 1: RevenueCat Integration - COMPLETED
- [x] 1.1 Installed react-native-purchases SDK
- [x] 1.2 Created RevenueCat service (`lib/revenuecat-service.ts`)
- [x] 1.3 Created purchases context (`context/purchases-context.tsx`)
- [x] 1.4 Fixed Android launchMode to `singleTop`
- [x] 1.5 Updated purchase UI in screens

### Phase 2: Database & Schema Fixes - COMPLETED
- [x] Added `revenuecat_id` column to `user_profiles`
- [x] Added `revenuecat_event_id` column to `credit_transactions`
- [x] Created `add_credits_idempotent` function
- [x] Created migration file (`supabase/migrations/001_revenuecat_integration.sql`)

### Phase 3: Code Cleanup - COMPLETED
- [x] Fixed iOS deployment target alignment
- [x] Removed problematic Android permissions (SYSTEM_ALERT_WINDOW, requestLegacyExternalStorage)
- [x] Removed mock storage code from supabase.ts
- [x] Updated transform-screen.tsx to use ProcessingService

### Phase 4: Legal & Compliance - COMPLETED
- [x] Updated Privacy Policy date to February 1, 2026
- [x] Updated Terms of Service date to February 1, 2026
- [x] Added Third-Party AI Processing Services section (DeepAI, Cloudinary, OpenAI)
- [x] Added Face and Biometric Data section
- [x] Added Data Retention section
- [x] Added Account and Data Deletion section

### Phase 5: Security & Abuse Prevention - COMPLETED
- [x] Implemented rate limiting in Edge Functions (`_shared/rate-limit.ts`)
- [x] Added request validation utility (`_shared/validation.ts`)
  - File size limits (10MB general, 5MB for upscaling)
  - Allowed image types (JPEG, PNG, WebP)
  - Storage path validation (prevents traversal)
  - Path ownership validation (users can only access their own files)
  - Content moderation for prompts (blocked terms)
  - Text sanitization for user input
- [x] Added API requests table for rate limiting (schema in migration)
- [x] All Edge Functions updated to use validation:
  - colorize: path + ownership + blob validation
  - enhance-face: path + ownership + blob validation
  - upscale: path + ownership + blob validation (smaller size limit)
  - generate-scene: path + prompt moderation + blob validation

### Phase 6: Testing - READY FOR EXECUTION
All code implementation is complete. The following tests need to be executed manually:

#### Security Tests (Manual)
- [ ] Build production bundle: `npx expo export --platform ios`
- [ ] Search bundle for API keys: should find NO DeepAI/OpenAI/Cloudinary keys
- [ ] Verify direct API calls to AI services fail without Edge Function auth
- [ ] Test RLS by attempting to access another user's data

#### Payment Tests (Sandbox - Requires RevenueCat Setup)
- [ ] Configure RevenueCat dashboard with App Store/Play Store credentials
- [ ] Create test products in App Store Connect / Play Console
- [ ] Test purchase flow in sandbox mode
- [ ] Verify webhook receives `NON_RENEWING_PURCHASE` event
- [ ] Verify credits added to database
- [ ] Test idempotency by replaying webhook

#### Feature Tests (Requires Running App)
- [ ] Colorize image - verify credits deducted server-side
- [ ] Face enhancement - verify credits deducted
- [ ] 4K upscale - verify credits deducted
- [ ] AI Scene Builder - verify prompt moderation works
- [ ] Insufficient credits - verify error shown
- [ ] Rate limiting - verify 429 response after limit

#### Edge Case Tests
- [ ] Process image while offline
- [ ] Very large image (>10MB) - verify rejection
- [ ] Invalid image format - verify rejection
- [ ] Network timeout during processing

#### Platform Tests
- [ ] iOS 15+ device
- [ ] Android 11+ device

### Phase 7: App Store Submission - PENDING
Pre-submission checklist:
- [ ] Host Privacy Policy at public URL (e.g., colouriseai.com/privacy)
- [ ] Host Terms of Service at public URL (e.g., colouriseai.com/terms)
- [ ] Configure App Store Connect data collection questions
- [ ] Prepare app screenshots (6.5" and 5.5" iPhone)
- [ ] Write app description and keywords
- [ ] Set up TestFlight for beta testing
- [ ] Submit for App Review

---

*Last updated: February 1, 2026*
*All code implementation complete. Next: Manual testing and App Store submission.*
