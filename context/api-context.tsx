import React, { createContext, useContext, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

type ApiContextType = {
  apiKey: string
}

// Create the context with a default value
const ApiContext = createContext<ApiContextType>({
  apiKey: "755e329a-c84e-4664-b3ae-bc09e1802081" // Your updated API key
})

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState<string>("755e329a-c84e-4664-b3ae-bc09e1802081")

  // Store the API key in AsyncStorage when component mounts
  useEffect(() => {
    const storeApiKey = async () => {
      try {
        await AsyncStorage.setItem("deepai_api_key", apiKey)
      } catch (error) {
        console.error("Error storing API key:", error)
      }
    }
    
    storeApiKey()
  }, [])

  return <ApiContext.Provider value={{ apiKey }}>{children}</ApiContext.Provider>
}

export const useApi = () => {
  return useContext(ApiContext)
} 