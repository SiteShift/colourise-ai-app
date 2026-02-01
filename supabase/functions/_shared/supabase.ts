import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

// Create authenticated Supabase client for user operations
export function createUserClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  )
}

// Create admin client for privileged operations
export function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

// Get user from auth header
export async function getUser(authHeader: string) {
  const client = createUserClient(authHeader)
  const { data: { user }, error } = await client.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return user
}

// Get user's current credits
export async function getUserCredits(adminClient: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await adminClient
    .from('user_profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (error || !data) {
    throw new Error('Failed to get user credits')
  }

  return data.credits
}

// Deduct credits using the use_credits function
export async function deductCredits(
  adminClient: SupabaseClient,
  userId: string,
  amount: number,
  description: string,
  imageId?: string
): Promise<boolean> {
  const { data, error } = await adminClient.rpc('use_credits', {
    p_user_id: userId,
    p_credits_to_use: amount,
    p_description: description,
    p_image_id: imageId || null,
  })

  if (error) {
    console.error('Failed to deduct credits:', error)
    return false
  }

  return data === true
}

// Refund credits on failure
export async function refundCredits(
  adminClient: SupabaseClient,
  userId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  const { data, error } = await adminClient.rpc('add_credits', {
    p_user_id: userId,
    p_credits_to_add: amount,
    p_description: `Refund: ${reason}`,
    p_package_id: null,
    p_transaction_ref: `refund_${Date.now()}`,
  })

  if (error) {
    console.error('Failed to refund credits:', error)
    return false
  }

  return data === true
}
