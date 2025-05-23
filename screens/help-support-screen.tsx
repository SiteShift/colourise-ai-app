import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { StatusBar } from "expo-status-bar"

interface FAQItemProps {
  question: string
  answer: string
}

const FAQItem = ({ question, answer }: FAQItemProps) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.questionContainer}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.questionText}>{question}</Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color="#6366f1"
        />
      </TouchableOpacity>
      {expanded && <Text style={styles.answerText}>{answer}</Text>}
    </View>
  )
}

export default function HelpSupportScreen() {
  const navigation = useNavigation()

  const faqs = [
    {
      question: "How do I colorize a black and white image?",
      answer: "Upload a black and white photo by tapping the 'Upload an Image' button or use the 'Scan Photo' option to take a picture with your camera. Once uploaded, the AI will automatically colorize your image."
    },
    {
      question: "What image formats are supported?",
      answer: "The app supports common image formats including JPEG, PNG, and HEIC. For best results, use high-quality images with good contrast."
    },
    {
      question: "How many credits do I need to colorize an image?",
      answer: "Basic colorization requires 1 credit. Premium features like enhanced colors, face enhancement, or 4K upscaling may require additional credits."
    },
    {
      question: "How can I purchase more credits?",
      answer: "You can purchase credits by tapping on the diamond icon in the top right corner of the main screen or by going to your profile and tapping on 'Unlock the Full Power of AI'."
    },
    {
      question: "Can I save both the original and colorized images?",
      answer: "Yes, once your image is colorized, you can save both versions to your device by using the save buttons below the image."
    },
    {
      question: "How do I view my previous colorized images?",
      answer: "All your previously colorized images are stored in the Gallery tab. Tap on any image to view, share, or save it again."
    },
    {
      question: "What should I do if the colorization results aren't accurate?",
      answer: "For best results, use high-quality images with good lighting and contrast. You can also try our premium features like Enhanced Colors for better results."
    },
    {
      question: "How do I edit my profile?",
      answer: "Go to the Profile tab and tap on 'Edit Profile'. From there, you can change your profile picture and display name."
    },
    {
      question: "Is there a limit to how many images I can colorize?",
      answer: "Your ability to colorize images depends on your available credits. Premium users receive more credits and special features."
    },
    {
      question: "How can I contact support?",
      answer: "For additional help or to report issues, please email us at support@colouriseai.com"
    }
  ]

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>How to Use the App</Text>
        <View style={styles.guideContainer}>
          <View style={styles.guideItem}>
            <View style={styles.guideNumber}>
              <Text style={styles.guideNumberText}>1</Text>
            </View>
            <View style={styles.guideContent}>
              <Text style={styles.guideTitle}>Upload an Image</Text>
              <Text style={styles.guideText}>
                Select a black and white photo from your gallery or take a new photo
              </Text>
            </View>
          </View>

          <View style={styles.guideItem}>
            <View style={styles.guideNumber}>
              <Text style={styles.guideNumberText}>2</Text>
            </View>
            <View style={styles.guideContent}>
              <Text style={styles.guideTitle}>AI Colorization</Text>
              <Text style={styles.guideText}>
                Our AI will automatically add natural colors to your image
              </Text>
            </View>
          </View>

          <View style={styles.guideItem}>
            <View style={styles.guideNumber}>
              <Text style={styles.guideNumberText}>3</Text>
            </View>
            <View style={styles.guideContent}>
              <Text style={styles.guideTitle}>Enhance & Save</Text>
              <Text style={styles.guideText}>
                Apply additional enhancements and save your colorized image
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqContainer}>
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Need more help?</Text>
          <Text style={styles.contactText}>
            Contact our support team at support@colouriseai.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
    marginTop: 10,
  },
  guideContainer: {
    marginBottom: 30,
  },
  guideItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  guideNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  guideNumberText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  guideText: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 22,
  },
  faqContainer: {
    marginBottom: 30,
  },
  faqItem: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  questionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
    paddingRight: 16,
  },
  answerText: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 22,
    padding: 16,
    paddingTop: 0,
    backgroundColor: "white",
  },
  contactSection: {
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  contactText: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 22,
  },
}) 