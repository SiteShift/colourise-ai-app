/**
 * RevenueCat Service
 *
 * Handles in-app purchases and subscription management.
 * Uses RevenueCat SDK for cross-platform purchase handling.
 */

import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOfferings,
} from 'react-native-purchases'
import { Platform } from 'react-native'

// API keys from environment
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY

// Credit amounts for each product (must match RevenueCat product IDs)
export const CREDIT_PRODUCTS = {
  credits_20: { credits: 20, displayName: 'Starter Pack' },
  credits_70: { credits: 70, displayName: 'Popular Pack' },
  credits_250: { credits: 250, displayName: 'Pro Pack' },
} as const

export type CreditProductId = keyof typeof CREDIT_PRODUCTS

export interface PurchaseResult {
  success: boolean
  cancelled?: boolean
  customerInfo?: CustomerInfo
  error?: string
}

class RevenueCatServiceClass {
  private initialized = false
  private currentUserId: string | null = null

  /**
   * Initialize RevenueCat SDK
   * Call this once when the app starts or user logs in
   */
  async initialize(userId?: string): Promise<void> {
    if (this.initialized && this.currentUserId === userId) {
      return
    }

    const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY

    if (!apiKey) {
      console.warn('RevenueCat API key not configured for', Platform.OS)
      return
    }

    try {
      await Purchases.configure({ apiKey })

      if (userId) {
        await this.login(userId)
      }

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error)
      throw error
    }
  }

  /**
   * Log in a user to RevenueCat
   * Links RevenueCat's anonymous ID with your user ID
   */
  async login(userId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize(userId)
      return
    }

    try {
      await Purchases.logIn(userId)
      this.currentUserId = userId
    } catch (error) {
      console.error('Failed to log in to RevenueCat:', error)
      throw error
    }
  }

  /**
   * Log out the current user from RevenueCat
   */
  async logout(): Promise<void> {
    try {
      await Purchases.logOut()
      this.currentUserId = null
    } catch (error) {
      console.error('Failed to log out of RevenueCat:', error)
    }
  }

  /**
   * Get available offerings (products/packages)
   */
  async getOfferings(): Promise<PurchasesOfferings | null> {
    try {
      const offerings = await Purchases.getOfferings()
      return offerings
    } catch (error) {
      console.error('Failed to get offerings:', error)
      return null
    }
  }

  /**
   * Get available credit packages
   */
  async getCreditPackages(): Promise<PurchasesPackage[]> {
    const offerings = await this.getOfferings()

    if (!offerings?.current?.availablePackages) {
      return []
    }

    return offerings.current.availablePackages
  }

  /**
   * Purchase a credit package
   */
  async purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg)

      return {
        success: true,
        customerInfo,
      }
    } catch (error: any) {
      // Check if user cancelled
      if (error.userCancelled) {
        return {
          success: false,
          cancelled: true,
        }
      }

      console.error('Purchase failed:', error)
      return {
        success: false,
        error: error.message || 'Purchase failed',
      }
    }
  }

  /**
   * Purchase credits by product ID
   */
  async purchaseCredits(productId: CreditProductId): Promise<PurchaseResult> {
    const packages = await this.getCreditPackages()
    const pkg = packages.find(
      (p) => p.product.identifier === productId ||
             p.identifier === productId
    )

    if (!pkg) {
      return {
        success: false,
        error: `Product ${productId} not found in offerings`,
      }
    }

    return this.purchasePackage(pkg)
  }

  /**
   * Get customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      return await Purchases.getCustomerInfo()
    } catch (error) {
      console.error('Failed to get customer info:', error)
      return null
    }
  }

  /**
   * Check if RevenueCat is configured and ready
   */
  isReady(): boolean {
    return this.initialized
  }

  /**
   * Get the current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId
  }
}

export const RevenueCatService = new RevenueCatServiceClass()
export default RevenueCatService
