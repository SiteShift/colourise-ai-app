import React, { createContext, useContext, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

type ApiContextType = {
  apiKey: string
}

// Create the context with a default value
const ApiContext = createContext<ApiContextType>({
  apiKey: "" // API key should be set by user
})

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState<string>("")

  // Load the API key from AsyncStorage when component mounts
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const storedKey = await AsyncStorage.getItem("deepai_api_key")
        if (storedKey) {
          setApiKey(storedKey)
        }
      } catch (error) {
        console.error("Error loading API key:", error)
      }
    }
    
    loadApiKey()
  }, [])

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