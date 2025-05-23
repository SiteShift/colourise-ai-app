import React from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { StatusBar } from "expo-status-bar"

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation()

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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: June 15, 2023</Text>
        
        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to Colourise AI ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our app. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
        </Text>
        <Text style={styles.paragraph}>
          Please read this Privacy Policy carefully. By accessing or using our app, you acknowledge that you have read, understood, and agree to be bound by all the terms outlined in this Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.subSectionTitle}>2.1 Information You Provide</Text>
        <Text style={styles.paragraph}>
          • Account Information: When you create an account, we collect your name, email address, and password.
        </Text>
        <Text style={styles.paragraph}>
          • Profile Information: Profile picture and any other information you choose to add to your profile.
        </Text>
        <Text style={styles.paragraph}>
          • User Content: Images you upload for colorization and enhancement.
        </Text>
        <Text style={styles.paragraph}>
          • Payment Information: If you make in-app purchases, our payment processors collect necessary payment details.
        </Text>

        <Text style={styles.subSectionTitle}>2.2 Automatically Collected Information</Text>
        <Text style={styles.paragraph}>
          • Device Information: Device type, operating system, unique device identifiers, and mobile network information.
        </Text>
        <Text style={styles.paragraph}>
          • Usage Data: How you interact with our app, features you use, and time spent on the app.
        </Text>
        <Text style={styles.paragraph}>
          • Log Data: Error reports, app activity, and the date and time of your usage.
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.paragraph}>We use your information for the following purposes:</Text>
        <Text style={styles.paragraph}>
          • To provide and maintain our services, including processing your images.
        </Text>
        <Text style={styles.paragraph}>
          • To create and manage your account and verify your identity.
        </Text>
        <Text style={styles.paragraph}>
          • To process transactions and send related information.
        </Text>
        <Text style={styles.paragraph}>
          • To improve our app, services, and user experience.
        </Text>
        <Text style={styles.paragraph}>
          • To communicate with you about updates, features, offers, and technical notices.
        </Text>
        <Text style={styles.paragraph}>
          • To monitor and analyze usage patterns and trends.
        </Text>
        <Text style={styles.paragraph}>
          • To detect, prevent, and address technical issues and fraudulent activities.
        </Text>

        <Text style={styles.sectionTitle}>4. Sharing Your Information</Text>
        <Text style={styles.paragraph}>We may share your information with:</Text>
        <Text style={styles.paragraph}>
          • Service Providers: Third parties that help us operate, provide, improve, and market our services.
        </Text>
        <Text style={styles.paragraph}>
          • Business Partners: For joint marketing efforts or promotions.
        </Text>
        <Text style={styles.paragraph}>
          • Legal Requirements: If required by law, regulation, legal process, or governmental request.
        </Text>
        <Text style={styles.paragraph}>
          • Business Transfers: In connection with a merger, acquisition, or sale of all or a portion of our assets.
        </Text>
        <Text style={styles.paragraph}>
          • With Your Consent: When you have consented to the sharing of your information.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Storage and Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized or unlawful processing, accidental loss, destruction, or damage. However, no method of transmission over the internet or electronic storage is 100% secure.
        </Text>
        <Text style={styles.paragraph}>
          Your data is stored on secure servers and we retain your information for as long as your account is active or as needed to provide you services, comply with legal obligations, resolve disputes, and enforce our agreements.
        </Text>

        <Text style={styles.sectionTitle}>6. Your Rights and Choices</Text>
        <Text style={styles.paragraph}>
          Depending on your location, you may have certain rights regarding your personal information, including:
        </Text>
        <Text style={styles.paragraph}>
          • Access and Review: You can request access to your personal information.
        </Text>
        <Text style={styles.paragraph}>
          • Correction: You can request that we correct inaccurate or incomplete information.
        </Text>
        <Text style={styles.paragraph}>
          • Deletion: You can request that we delete your personal information.
        </Text>
        <Text style={styles.paragraph}>
          • Opt-out: You can opt out of marketing communications and certain data collection.
        </Text>
        <Text style={styles.paragraph}>
          To exercise these rights, please contact us at privacy@colouriseai.com.
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our app is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
        </Text>

        <Text style={styles.sectionTitle}>8. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions or concerns about our Privacy Policy or data practices, please contact us at:
        </Text>
        <Text style={styles.contactInfo}>Colourise AI</Text>
        <Text style={styles.contactInfo}>Email: privacy@colouriseai.com</Text>
        <View style={styles.spacer} />
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
  lastUpdated: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 24,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 12,
  },
  contactInfo: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
  },
  spacer: {
    height: 60,
  },
}) 