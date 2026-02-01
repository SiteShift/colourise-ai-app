import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

// Maximum file sizes
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_UPSCALE_FILE_SIZE = 5 * 1024 * 1024 // 5MB for upscaling (to avoid memory issues)

// Allowed content types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
]

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate image from storage before processing
 */
export async function validateStorageImage(
  adminClient: SupabaseClient,
  bucket: string,
  path: string,
  maxSize: number = MAX_FILE_SIZE
): Promise<ValidationResult> {
  try {
    // Get file metadata to check size without downloading
    const { data: files, error: listError } = await adminClient.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: path.split('/').pop(),
      })

    if (listError) {
      return { valid: false, error: 'Failed to access image' }
    }

    const file = files?.find(f => path.endsWith(f.name))
    if (!file) {
      return { valid: false, error: 'Image not found' }
    }

    // Check file size from metadata
    if (file.metadata?.size && file.metadata.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024))
      return {
        valid: false,
        error: `Image too large. Maximum size is ${maxMB}MB`,
      }
    }

    // Check content type from metadata
    const contentType = file.metadata?.mimetype || file.metadata?.contentType
    if (contentType && !ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return {
        valid: false,
        error: 'Invalid image format. Allowed: JPEG, PNG, WebP',
      }
    }

    return { valid: true }
  } catch (error) {
    console.error('Validation error:', error)
    return { valid: false, error: 'Failed to validate image' }
  }
}

/**
 * Validate downloaded image blob
 */
export function validateImageBlob(
  blob: Blob,
  maxSize: number = MAX_FILE_SIZE
): ValidationResult {
  // Check size
  if (blob.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024))
    return {
      valid: false,
      error: `Image too large (${Math.round(blob.size / (1024 * 1024))}MB). Maximum size is ${maxMB}MB`,
    }
  }

  // Check type
  if (blob.type && !ALLOWED_IMAGE_TYPES.includes(blob.type)) {
    return {
      valid: false,
      error: `Invalid image format (${blob.type}). Allowed: JPEG, PNG, WebP`,
    }
  }

  return { valid: true }
}

/**
 * Validate storage path format
 */
export function validateStoragePath(path: string): ValidationResult {
  // Basic path validation
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'Invalid storage path' }
  }

  // Prevent path traversal
  if (path.includes('..') || path.startsWith('/')) {
    return { valid: false, error: 'Invalid storage path format' }
  }

  // Must have a user ID prefix (UUID format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i
  if (!uuidRegex.test(path)) {
    return { valid: false, error: 'Storage path must include user ID' }
  }

  return { valid: true }
}

/**
 * Validate that user owns the storage path
 */
export function validatePathOwnership(path: string, userId: string): ValidationResult {
  if (!path.startsWith(`${userId}/`)) {
    return { valid: false, error: 'Access denied: You can only process your own images' }
  }
  return { valid: true }
}

/**
 * Sanitize text input (for prompts, etc.)
 */
export function sanitizeText(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== 'string') return ''

  return text
    .trim()
    .slice(0, maxLength)
    // Remove potential script injections
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
}

/**
 * Basic content moderation for prompts (Scene Builder)
 */
const BLOCKED_TERMS = [
  'nude',
  'naked',
  'explicit',
  'porn',
  'sexual',
  'gore',
  'violent death',
  'terrorism',
  'child abuse',
]

export function moderatePrompt(prompt: string): ValidationResult {
  const lower = prompt.toLowerCase()

  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return {
        valid: false,
        error: 'Your prompt contains content that violates our terms of service',
      }
    }
  }

  return { valid: true }
}
