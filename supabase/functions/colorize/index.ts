import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  createAdminClient,
  getUser,
  getUserCredits,
  deductCredits,
  refundCredits,
} from '../_shared/supabase.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import {
  validateStoragePath,
  validatePathOwnership,
  validateImageBlob,
  MAX_FILE_SIZE,
} from '../_shared/validation.ts'

const DEEPAI_API_KEY = Deno.env.get('DEEPAI_API_KEY')!
const CREDITS_REQUIRED = 1

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = await getUser(authHeader)
    const adminClient = createAdminClient()

    // 2. Check rate limit
    const allowed = await checkRateLimit(adminClient, user.id, 'colorize')
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Parse request body
    const { storagePath } = await req.json()
    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: 'Missing storagePath parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3.1 Validate storage path format
    const pathValidation = validateStoragePath(storagePath)
    if (!pathValidation.valid) {
      return new Response(
        JSON.stringify({ error: pathValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3.2 Validate user owns this path
    const ownershipValidation = validatePathOwnership(storagePath, user.id)
    if (!ownershipValidation.valid) {
      return new Response(
        JSON.stringify({ error: ownershipValidation.error }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Check credits BEFORE processing
    const currentCredits = await getUserCredits(adminClient, user.id)
    if (currentCredits < CREDITS_REQUIRED) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient credits',
          creditsRequired: CREDITS_REQUIRED,
          creditsAvailable: currentCredits,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Deduct credits FIRST (before calling external API)
    const deducted = await deductCredits(
      adminClient,
      user.id,
      CREDITS_REQUIRED,
      'Image colorization'
    )

    if (!deducted) {
      return new Response(
        JSON.stringify({ error: 'Failed to deduct credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // 6. Download image from Storage
      const { data: imageData, error: downloadError } = await adminClient.storage
        .from('original-images')
        .download(storagePath)

      if (downloadError || !imageData) {
        throw new Error(`Failed to download image: ${downloadError?.message}`)
      }

      // 6.1 Validate image size and type
      const blobValidation = validateImageBlob(imageData, MAX_FILE_SIZE)
      if (!blobValidation.valid) {
        throw new Error(blobValidation.error)
      }

      // 7. Call DeepAI API with SERVER-SIDE key
      const formData = new FormData()
      formData.append('image', imageData, 'image.jpg')

      const deepAIResponse = await fetch('https://api.deepai.org/api/colorizer', {
        method: 'POST',
        headers: {
          'api-key': DEEPAI_API_KEY,
        },
        body: formData,
      })

      if (!deepAIResponse.ok) {
        throw new Error(`DeepAI API error: ${deepAIResponse.status}`)
      }

      const result = await deepAIResponse.json()

      if (!result.output_url) {
        throw new Error('DeepAI did not return output URL')
      }

      // 8. Download colorized image from DeepAI
      const colorizedResponse = await fetch(result.output_url)
      if (!colorizedResponse.ok) {
        throw new Error('Failed to download colorized image from DeepAI')
      }
      const colorizedBlob = await colorizedResponse.blob()

      // 9. Upload result to our Storage
      const resultPath = `${user.id}/${Date.now()}_colorized.jpg`
      const { error: uploadError } = await adminClient.storage
        .from('colorized-images')
        .upload(resultPath, colorizedBlob, {
          contentType: 'image/jpeg',
        })

      if (uploadError) {
        throw new Error(`Failed to upload result: ${uploadError.message}`)
      }

      // 10. Create signed URL for result
      const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
        .from('colorized-images')
        .createSignedUrl(resultPath, 3600) // 1 hour expiry

      if (signedUrlError || !signedUrlData) {
        throw new Error(`Failed to create signed URL: ${signedUrlError?.message}`)
      }

      // 11. Get remaining credits
      const remainingCredits = await getUserCredits(adminClient, user.id)

      return new Response(
        JSON.stringify({
          success: true,
          url: signedUrlData.signedUrl,
          storagePath: resultPath,
          creditsUsed: CREDITS_REQUIRED,
          creditsRemaining: remainingCredits,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (processingError) {
      // 12. REFUND credits on failure
      await refundCredits(
        adminClient,
        user.id,
        CREDITS_REQUIRED,
        'Colorization processing failed'
      )

      console.error('Processing error:', processingError)
      return new Response(
        JSON.stringify({
          error: 'Processing failed',
          message: processingError instanceof Error ? processingError.message : 'Unknown error',
          creditsRefunded: true,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
