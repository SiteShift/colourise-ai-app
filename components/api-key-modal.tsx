import React, { useState, useEffect } from "react"
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Linking, Alert } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Feather } from "@expo/vector-icons"

interface ApiKeyModalProps {
  isVisible: boolean
  onClose: () => void
  onSave: (apiKey: string) => void
}

export default function ApiKeyModal({ isVisible, onClose, onSave }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("")

  const handleSave = async () => {
    if (apiKey.trim()) {
      try {
        await AsyncStorage.setItem("deepai_api_key", apiKey.trim())
        onSave(apiKey.trim())
        onClose()
      } catch (error) {
        console.error("Error saving API key:", error)
        Alert.alert("Failed to save API key. Please try again.")
      }
    } else {
      Alert.alert("Please enter a valid API key")
    }
  }

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>API Key Required</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalText}>To use the AI colorization feature, you need a DeepAI API key.</Text>

          <View style={styles.steps}>
            <Text style={styles.stepsTitle}>How to get an API key:</Text>
            <Text style={styles.step}>1. Sign up at DeepAI.org</Text>
            <Text style={styles.step}>2. Go to your account dashboard</Text>
            <Text style={styles.step}>3. Copy your API key</Text>
          </View>

          <TouchableOpacity
            style={styles.getKeyButton}
            onPress={() => Linking.openURL("https://deepai.org/dashboard/profile")}
          >
            <Text style={styles.getKeyButtonText}>Get API Key</Text>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Your DeepAI API Key:</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Enter your API key"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save & Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  closeButton: {
    padding: 5,
  },
  modalText: {
    marginBottom: 15,
    fontSize: 16,
    color: "#334155",
    lineHeight: 22,
  },
  steps: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 10,
  },
  step: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 5,
    paddingLeft: 10,
  },
  getKeyButton: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  getKeyButtonText: {
    color: "#6366f1",
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
})
