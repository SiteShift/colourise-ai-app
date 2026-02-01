import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders } from '../_shared/cors.ts'

const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH')!

// Credit amounts for each product
const CREDIT_MAP: Record<string, number> = {
  'credits_20': 20,
  'credits_70': 70,
  'credits_250': 250,
  // Also support full product IDs
  'com.max.colouriseaiapp.credits20': 20,
  'com.max.colouriseaiapp.credits70': 70,
  'com.max.colouriseaiapp.credits250': 250,
}

interface RevenueCatEvent {
  id: string
  type: string
  app_user_id: string
  product_id: string
  entitlement_ids?: string[]
  transaction_id?: string
  original_transaction_id?: string
  price?: number
  currency?: string
  store?: string
}

interface RevenueCatWebhookPayload {
  api_version: string
  event: RevenueCatEvent
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify Authorization header (NOT X-RevenueCat-Signature)
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${WEBHOOK_AUTH}`) {
      console.error('Invalid authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse webhook payload
    const payload: RevenueCatWebhookPayload = await req.json()
    const { event } = payload

    console.log(`Received RevenueCat event: ${event.type} for user ${event.app_user_id}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 3. Handle different event types
    switch (event.type) {
      case 'NON_RENEWING_PURCHASE':
      case 'INITIAL_PURCHASE': {
        // Consumable or initial subscription purchase
        const userId = event.app_user_id
        const productId = event.product_id
        const eventId = event.id  // Use event.id for idempotency

        // Find credit amount for this product
        const credits = CREDIT_MAP[productId]
        if (!credits) {
          console.error(`Unknown product: ${productId}`)
          // Return 200 to prevent RevenueCat from retrying
          return new Response(
            JSON.stringify({ warning: `Unknown product: ${productId}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if this event was already processed (idempotency)
        const { data: existing } = await supabase
          .from('credit_transactions')
          .select('id')
          .eq('revenuecat_event_id', eventId)
          .maybeSingle()

        if (existing) {
          console.log(`Event ${eventId} already processed`)
          return new Response(
            JSON.stringify({ message: 'Already processed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get current user credits
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('credits')
          .eq('id', userId)
          .single()

        if (userError || !userData) {
          console.error(`User not found: ${userId}`)
          // Still return 200 - user might not exist yet
          return new Response(
            JSON.stringify({ error: `User not found: ${userId}` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const newBalance = userData.credits + credits

        // Update credits and log transaction in a single operation
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            credits: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (updateError) {
          console.error('Failed to update credits:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to update credits' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log transaction
        const { error: txError } = await supabase
          .from('credit_transactions')
          .insert({
            user_id: userId,
            transaction_type: 'purchase',
            credits_amount: credits,
            credits_balance_after: newBalance,
            description: `Purchase: ${productId} via ${event.store || 'unknown'}`,
            purchase_package_id: productId,
            transaction_reference: event.transaction_id,
            revenuecat_event_id: eventId,
          })

        if (txError) {
          console.error('Failed to log transaction:', txError)
          // Don't fail the webhook - credits were already added
        }

        console.log(`Added ${credits} credits to user ${userId}. New balance: ${newBalance}`)

        return new Response(
          JSON.stringify({
            success: true,
            creditsAdded: credits,
            newBalance,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'CANCELLATION':
      case 'REFUND': {
        // Log refund/cancellation but don't claw back credits for MVP
        console.warn(`Refund/cancellation received: ${event.id} for product ${event.product_id}`)

        // Log for monitoring
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: event.app_user_id,
            transaction_type: 'refund',
            credits_amount: 0,  // Not clawing back for MVP
            credits_balance_after: 0,  // Will be updated if we add clawback
            description: `Refund notification: ${event.product_id} (not clawed back)`,
            transaction_reference: event.transaction_id,
            revenuecat_event_id: event.id,
          })
          .catch((err) => console.error('Failed to log refund:', err))

        return new Response(
          JSON.stringify({ message: 'Refund logged (no clawback for MVP)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'EXPIRATION':
      case 'BILLING_ISSUE': {
        // Subscription events - log but no action for credits-only model
        console.log(`Subscription event: ${event.type} for user ${event.app_user_id}`)

        return new Response(
          JSON.stringify({ message: `Subscription event ${event.type} logged` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default: {
        console.log(`Unhandled event type: ${event.type}`)
        return new Response(
          JSON.stringify({ message: `Event type ${event.type} not handled` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
