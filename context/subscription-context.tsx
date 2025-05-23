import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./auth-context";

type SubscriptionType = "free" | "premium";

interface SubscriptionContextType {
  subscriptionType: SubscriptionType;
  isLoading: boolean;
  isPremium: boolean;
  toggleSubscription: () => void; // For testing purposes
  upgradeToPermium: () => Promise<void>;
  downgradeToFree: () => Promise<void>;
  purchaseCredits: (packageId: string) => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  // Load subscription status when user changes
  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      if (!user) {
        setSubscriptionType("free");
        setIsLoading(false);
        setIsPremium(false);
        return;
      }

      try {
        setIsLoading(true);
        // Fetch from local storage first (for demo purposes)
        const storedType = await AsyncStorage.getItem(`subscription_${user.id}`);
        
        if (storedType && (storedType === "free" || storedType === "premium")) {
          setSubscriptionType(storedType);
          setIsPremium(storedType === "premium");
        } else {
          // Default to free
          setSubscriptionType("free");
          setIsPremium(false);
          // Store the default
          await AsyncStorage.setItem(`subscription_${user.id}`, "free");
        }
      } catch (error) {
        console.error("Error loading subscription status:", error);
        // Default to free on error
        setSubscriptionType("free");
        setIsPremium(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionStatus();
  }, [user]);

  // Save subscription status changes
  useEffect(() => {
    const saveSubscriptionStatus = async () => {
      if (!user) return;
      
      try {
        await AsyncStorage.setItem(`subscription_${user.id}`, subscriptionType);
      } catch (error) {
        console.error("Error saving subscription status:", error);
      }
    };

    if (!isLoading) {
      saveSubscriptionStatus();
    }
  }, [subscriptionType, user, isLoading]);

  // Test function to toggle between free and premium
  const toggleSubscription = () => {
    setSubscriptionType(current => current === "free" ? "premium" : "free");
    setIsPremium(current => !current);
  };

  // Upgrade to premium
  const upgradeToPermium = async () => {
    try {
      setSubscriptionType("premium");
      setIsPremium(true);
      return Promise.resolve();
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      return Promise.reject(error);
    }
  };

  // Downgrade to free
  const downgradeToFree = async () => {
    try {
      setSubscriptionType("free");
      setIsPremium(false);
      return Promise.resolve();
    } catch (error) {
      console.error("Error downgrading subscription:", error);
      return Promise.reject(error);
    }
  };

  // Mock purchasing credits
  const purchaseCredits = async (packageId: string): Promise<boolean> => {
    // In a real app, this would integrate with in-app purchases
    // and update the user's credit balance on the server
    console.log(`Purchasing package: ${packageId}`);
    
    // Return success (would normally be based on actual purchase result)
    return true;
  };

  return (
    <SubscriptionContext.Provider 
      value={{ 
        subscriptionType, 
        isLoading, 
        isPremium,
        toggleSubscription,
        upgradeToPermium,
        downgradeToFree,
        purchaseCredits
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}; 