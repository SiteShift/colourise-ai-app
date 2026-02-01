/**
 * Purchases Context
 *
 * Manages in-app purchases state and provides purchase functionality
 * throughout the app using RevenueCat.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Alert, Platform } from 'react-native'
import { PurchasesPackage } from 'react-native-purchases'
import { RevenueCatService, CreditProductId, PurchaseResult } from '../lib/revenuecat-service'
import { useAuth } from './auth-context'
import { supabase } from '../lib/supabase'

interface CreditPackage {
  id: string
  identifier: string
  credits: number
  price: string
  priceNumber: number
  title: string
  description: string
  isPopular?: boolean
  package: PurchasesPackage
}

interface PurchasesContextType {
  // State
  isInitialized: boolean
  isLoading: boolean
  packages: CreditPackage[]

  // Actions
  purchaseCredits: (packageId: string) => Promise<boolean>
  refreshPackages: () => Promise<void>
  refreshCredits: () => Promise<void>
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined)

// Map RevenueCat package IDs to credit amounts
const CREDIT_AMOUNTS: Record<string, { credits: number; isPopular?: boolean }> = {
  credits_20: { credits: 20 },
  credits_70: { credits: 70, isPopular: true },
  credits_250: { credits: 250 },
  // Also support full product IDs
  'com.max.colouriseaiapp.credits20': { credits: 20 },
  'com.max.colouriseaiapp.credits70': { credits: 70, isPopular: true },
  'com.max.colouriseaiapp.credits250': { credits: 250 },
}

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, accessToken } = useAuth()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [packages, setPackages] = useState<CreditPackage[]>([])

  // Initialize RevenueCat when user logs in
  useEffect(() => {
    if (user?.id) {
      initializeRevenueCat(user.id)
    }
  }, [user?.id])

  const initializeRevenueCat = async (userId: string) => {
    try {
      await RevenueCatService.initialize(userId)
      await refreshPackages()
      setIsInitialized(true)
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error)
      // Still mark as initialized to not block the app
      setIsInitialized(true)
    }
  }

  const refreshPackages = async () => {
    try {
      const rcPackages = await RevenueCatService.getCreditPackages()

      const formattedPackages: CreditPackage[] = rcPackages.map((pkg) => {
        const productId = pkg.product.identifier
        const creditInfo = CREDIT_AMOUNTS[productId] || { credits: 0 }

        return {
          id: productId,
          identifier: pkg.identifier,
          credits: creditInfo.credits,
          price: pkg.product.priceString,
          priceNumber: pkg.product.price,
          title: pkg.product.title,
          description: pkg.product.description,
          isPopular: creditInfo.isPopular,
          package: pkg,
        }
      })

      // Sort by credits ascending
      formattedPackages.sort((a, b) => a.credits - b.credits)
      setPackages(formattedPackages)
    } catch (error) {
      console.error('Failed to refresh packages:', error)
    }
  }

  const refreshCredits = useCallback(async () => {
    if (!user?.id || !accessToken) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('credits')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Failed to refresh credits:', error)
        return
      }

      if (data && user) {
        setUser({
          ...user,
          credits: data.credits,
        })
      }
    } catch (error) {
      console.error('Error refreshing credits:', error)
    }
  }, [user, accessToken, setUser])

  const purchaseCredits = async (packageId: string): Promise<boolean> => {
    if (!user) {
      Alert.alert('Error', 'Please log in to purchase credits')
      return false
    }

    const pkg = packages.find((p) => p.id === packageId || p.identifier === packageId)
    if (!pkg) {
      Alert.alert('Error', 'Package not found')
      return false
    }

    setIsLoading(true)

    try {
      const result = await RevenueCatService.purchasePackage(pkg.package)

      if (result.cancelled) {
        setIsLoading(false)
        return false
      }

      if (!result.success) {
        Alert.alert('Purchase Failed', result.error || 'An error occurred during purchase')
        setIsLoading(false)
        return false
      }

      // Purchase successful!
      // Credits are added via webhook, but we'll refresh to get the latest
      // Wait a moment for the webhook to process
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await refreshCredits()

      Alert.alert(
        'Purchase Successful',
        `${pkg.credits} credits have been added to your account!`
      )

      setIsLoading(false)
      return true
    } catch (error: any) {
      console.error('Purchase error:', error)
      Alert.alert('Purchase Failed', error.message || 'An error occurred during purchase')
      setIsLoading(false)
      return false
    }
  }

  const value: PurchasesContextType = {
    isInitialized,
    isLoading,
    packages,
    purchaseCredits,
    refreshPackages,
    refreshCredits,
  }

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  )
}

export function usePurchases(): PurchasesContextType {
  const context = useContext(PurchasesContext)
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchasesProvider')
  }
  return context
}

export default PurchasesContext
