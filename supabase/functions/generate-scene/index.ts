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
  validateImageBlob,
  moderatePrompt as sharedModeratePrompt,
  sanitizeText,
  MAX_FILE_SIZE,
} from '../_shared/validation.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const CREDITS_REQUIRED = 10

// Scene presets with safe prompts
const SCENE_PRESETS: Record<string, string> = {
  '1920s_new_york': 'Transform this person into a stylish 1920s New York scene, wearing period-appropriate clothing, with art deco architecture in the background',
  'ancient_rome': 'Place this person in an ancient Roman setting, wearing a toga, with the Colosseum or Roman architecture visible in the background',
  'wwii_era': 'Transform this into a 1940s wartime photograph, with period-appropriate military or civilian attire and vintage atmosphere',
  'cyberpunk': 'Place this person in a futuristic cyberpunk city with neon lights, holograms, and advanced technology in the background',
  'old_hollywood': 'Transform this into a classic Hollywood golden age photograph, with glamorous styling and vintage film aesthetic',
  'victorian': 'Place this person in a Victorian era setting with period-appropriate formal attire and architecture',
  'medieval': 'Transform this into a medieval setting with castle architecture and period-appropriate noble attire',
}

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
    const allowed = await checkRateLimit(adminClient, user.id, 'generate-scene')
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Parse request body
    const { storagePath, scene, customPrompt } = await req.json()
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

    if (!scene && !customPrompt) {
      return new Response(
        JSON.stringify({ error: 'Either scene or customPrompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Build and moderate prompt
    const sanitizedCustomPrompt = customPrompt ? sanitizeText(customPrompt, 500) : null
    let finalPrompt = sanitizedCustomPrompt || SCENE_PRESETS[scene] || SCENE_PRESETS['1920s_new_york']

    const moderationResult = sharedModeratePrompt(finalPrompt)
    if (!moderationResult.valid) {
      return new Response(
        JSON.stringify({ error: moderationResult.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Check credits
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

    // 6. Deduct credits FIRST
    const deducted = await deductCredits(
      adminClient,
      user.id,
      CREDITS_REQUIRED,
      `AI Scene Builder: ${scene || 'custom'}`
    )

    if (!deducted) {
      return new Response(
        JSON.stringify({ error: 'Failed to deduct credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // 7. Download image from Storage
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

      // 7.1 Validate image
      const blobValidation = validateImageBlob(imageBlob, MAX_FILE_SIZE)
      if (!blobValidation.valid) {
        throw new Error(blobValidation.error)
      }

      // 8. Convert image to base64
      const arrayBuffer = await imageBlob.arrayBuffer()
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      // 9. Call OpenAI API with gpt-4-vision-preview
      const systemPrompt = `You are an AI that transforms photographs into artistic scenes.
        When given an image and a scene description, you should:
        1. Preserve the identity and facial features of any people in the image
        2. Transform the setting, clothing, and background according to the scene
        3. Maintain photorealistic quality
        4. Keep the essence of the original photo while applying the transformation

        Important: The person's face and identity must remain recognizable.`

      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
                {
                  type: 'text',
                  text: `Please analyze this image and describe how you would transform it according to this scene: ${finalPrompt}`,
                },
              ],
            },
          ],
          max_tokens: 1000,
        }),
      })

      if (!openAIResponse.ok) {
        const errorData = await openAIResponse.json()
        throw new Error(`OpenAI API error: ${errorData.error?.message || openAIResponse.status}`)
      }

      // For now, we'll use DALL-E 3 for actual image generation
      // Note: In production, you might want to use a different approach
      const dalle3Response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Create a photorealistic image based on: ${finalPrompt}. The image should look like a professional photograph with period-accurate details and high quality lighting.`,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
        }),
      })

      if (!dalle3Response.ok) {
        const errorData = await dalle3Response.json()
        throw new Error(`DALL-E API error: ${errorData.error?.message || dalle3Response.status}`)
      }

      const dalleResult = await dalle3Response.json()
      const generatedImageUrl = dalleResult.data[0]?.url

      if (!generatedImageUrl) {
        throw new Error('No image generated from DALL-E')
      }

      // 10. Download generated image
      const generatedResponse = await fetch(generatedImageUrl)
      if (!generatedResponse.ok) {
        throw new Error('Failed to download generated image')
      }
      const generatedBlob = await generatedResponse.blob()

      // 11. Upload result to our Storage
      const resultPath = `${user.id}/${Date.now()}_scene_${scene || 'custom'}.jpg`
      const { error: uploadError } = await adminClient.storage
        .from('colorized-images')
        .upload(resultPath, generatedBlob, {
          contentType: 'image/jpeg',
        })

      if (uploadError) {
        throw new Error(`Failed to upload result: ${uploadError.message}`)
      }

      // 12. Create signed URL
      const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
        .from('colorized-images')
        .createSignedUrl(resultPath, 3600)

      if (signedUrlError || !signedUrlData) {
        throw new Error(`Failed to create signed URL: ${signedUrlError?.message}`)
      }

      // 13. Get remaining credits
      const remainingCredits = await getUserCredits(adminClient, user.id)

      return new Response(
        JSON.stringify({
          success: true,
          url: signedUrlData.signedUrl,
          storagePath: resultPath,
          scene: scene || 'custom',
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
        'Scene generation processing failed'
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
