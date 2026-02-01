import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const RATE_LIMITS: Record<string, { requests: number; windowMs: number }> = {
  colorize: { requests: 10, windowMs: 60000 },      // 10 per minute
  'enhance-face': { requests: 5, windowMs: 60000 }, // 5 per minute
  upscale: { requests: 5, windowMs: 60000 },        // 5 per minute
  'generate-scene': { requests: 3, windowMs: 60000 }, // 3 per minute
}

export async function checkRateLimit(
  adminClient: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<boolean> {
  const limit = RATE_LIMITS[endpoint] || { requests: 10, windowMs: 60000 }
  const windowStart = new Date(Date.now() - limit.windowMs).toISOString()

  // Count recent requests for this user and endpoint
  const { count, error } = await adminClient
    .from('api_requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart)

  if (error) {
    console.error('Rate limit check failed:', error)
    // On error, allow the request but log it
    return true
  }

  if ((count || 0) >= limit.requests) {
    return false
  }

  // Log this request
  await adminClient.from('api_requests').insert({
    user_id: userId,
    endpoint,
    created_at: new Date().toISOString(),
  }).catch(() => {
    // Ignore insert errors - table might not exist yet
  })

  return true
}
