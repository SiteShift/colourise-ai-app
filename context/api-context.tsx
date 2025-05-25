import React, { createContext, useContext, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

type ApiContextType = {
  apiKey: string
  setApiKey: (key: string) => void
  isApiKeyLoaded: boolean
}

// Create the context with a default value
const ApiContext = createContext<ApiContextType>({
  apiKey: "",
  setApiKey: () => {},
  isApiKeyLoaded: false
})

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string>("")
  const [isApiKeyLoaded, setIsApiKeyLoaded] = useState<boolean>(false)

  // Load the API key from AsyncStorage when component mounts
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const storedKey = await AsyncStorage.getItem("deepai_api_key")
        if (storedKey) {
          setApiKeyState(storedKey)
        }
        setIsApiKeyLoaded(true)
      } catch (error) {
        console.error("Error loading API key:", error)
        setIsApiKeyLoaded(true)
      }
    }
    
    loadApiKey()
  }, [])

  // Store the API key in AsyncStorage when it changes
  useEffect(() => {
    const storeApiKey = async () => {
      if (isApiKeyLoaded && apiKey) {
        try {
          await AsyncStorage.setItem("deepai_api_key", apiKey)
        } catch (error) {
          console.error("Error storing API key:", error)
        }
      }
    }
    
    storeApiKey()
  }, [apiKey, isApiKeyLoaded])

  const setApiKey = (key: string) => {
    setApiKeyState(key)
  }

  return (
    <ApiContext.Provider value={{ apiKey, setApiKey, isApiKeyLoaded }}>
      {children}
    </ApiContext.Provider>
  )
}

export const useApi = () => {
  return useContext(ApiContext)
} 