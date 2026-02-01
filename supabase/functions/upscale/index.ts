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
  MAX_UPSCALE_FILE_SIZE,
} from '../_shared/validation.ts'

const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME')!
const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY')!
const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET')!
const CREDITS_REQUIRED = 5

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
    const allowed = await checkRateLimit(adminClient, user.id, 'upscale')
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Parse request body
    const { storagePath, scale = 2 } = await req.json()
    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: 'Missing storagePath parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3.1 Validate storage path
    const pathValidation = validateStoragePath(storagePath)
    if (!pathValidation.valid) {
      return new Response(
        JSON.stringify({ error: pathValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3.2 Validate ownership
    const ownershipValidation = validatePathOwnership(storagePath, user.id)
    if (!ownershipValidation.valid) {
      return new Response(
        JSON.stringify({ error: ownershipValidation.error }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate scale (1x, 2x, or 4x)
    const validScales = [1, 2, 4]
    const scaleValue = validScales.includes(scale) ? scale : 2

    // 4. Check credits
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

    // 5. Deduct credits FIRST
    const deducted = await deductCredits(
      adminClient,
      user.id,
      CREDITS_REQUIRED,
      `4K upscaling (${scaleValue}x)`
    )

    if (!deducted) {
      return new Response(
        JSON.stringify({ error: 'Failed to deduct credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // 6. Download image from Storage
      let imageBlob: Blob | null = null

      const { data: colorizedData } = await adminClient.storage
        .from('colorized-images')
        .download(storagePath)

      if (colorizedData) {
        imageBlob = colorizedData
      } else {
        const { data: originalData } = await adminClient.storage
          .from('original-images')
          .download(storagePath)
        imageBlob = originalData
      }

      if (!imageBlob) {
        throw new Error('Failed to download image from storage')
      }

      // 6.1 Validate image (smaller size limit for upscaling to avoid memory issues)
      const blobValidation = validateImageBlob(imageBlob, MAX_UPSCALE_FILE_SIZE)
      if (!blobValidation.valid) {
        throw new Error(blobValidation.error)
      }

      // 7. Upload to Cloudinary
      const timestamp = Math.floor(Date.now() / 1000)
      const signatureString = `timestamp=${timestamp}${CLOUDINARY_API_SECRET}`
      const encoder = new TextEncoder()
      const data = encoder.encode(signatureString)
      const hashBuffer = await crypto.subtle.digest('SHA-1', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const formData = new FormData()
      formData.append('file', imageBlob, 'image.jpg')
      formData.append('timestamp', timestamp.toString())
      formData.append('api_key', CLOUDINARY_API_KEY)
      formData.append('signature', signature)

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      )

      if (!uploadResponse.ok) {
        throw new Error(`Cloudinary upload failed: ${uploadResponse.status}`)
      }

      const uploadResult = await uploadResponse.json()
      const publicId = uploadResult.public_id

      // 8. Apply upscaling transformation
      // Using Cloudinary's AI upscale for best quality
      const upscaledUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/e_upscale/c_scale,w_${scaleValue === 4 ? 3840 : scaleValue === 2 ? 1920 : 1280}/f_auto,q_auto:best/${publicId}`

      // 9. Download upscaled image
      const upscaledResponse = await fetch(upscaledUrl)
      if (!upscaledResponse.ok) {
        throw new Error('Failed to fetch upscaled image from Cloudinary')
      }
      const upscaledBlob = await upscaledResponse.blob()

      // 10. Upload result to our Storage
      const resultPath = `${user.id}/${Date.now()}_upscaled_${scaleValue}x.jpg`
      const { error: uploadError } = await adminClient.storage
        .from('colorized-images')
        .upload(resultPath, upscaledBlob, {
          contentType: 'image/jpeg',
        })

      if (uploadError) {
        throw new Error(`Failed to upload result: ${uploadError.message}`)
      }

      // 11. Create signed URL
      const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
        .from('colorized-images')
        .createSignedUrl(resultPath, 3600)

      if (signedUrlError || !signedUrlData) {
        throw new Error(`Failed to create signed URL: ${signedUrlError?.message}`)
      }

      // 12. Get remaining credits
      const remainingCredits = await getUserCredits(adminClient, user.id)

      return new Response(
        JSON.stringify({
          success: true,
          url: signedUrlData.signedUrl,
          storagePath: resultPath,
          scale: scaleValue,
          creditsUsed: CREDITS_REQUIRED,
          creditsRemaining: remainingCredits,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (processingError) {
      // REFUND credits on failure
      await refundCredits(
        adminClient,
        user.id,
        CREDITS_REQUIRED,
        'Upscaling processing failed'
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
