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

export default function TermsOfServiceScreen() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: February 1, 2026</Text>
        
        <Text style={styles.sectionTitle}>1. Agreement to Terms</Text>
        <Text style={styles.paragraph}>
          Welcome to Colourise AI. These Terms of Service ("Terms") govern your access to and use of the Colourise AI mobile application and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.
        </Text>

        <Text style={styles.sectionTitle}>2. Changes to Terms or Service</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these Terms at any time. If we make changes, we will provide notice by posting the updated Terms on the Service and updating the "Last Updated" date. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
        </Text>
        <Text style={styles.paragraph}>
          We may update, modify, or discontinue the Service or any part thereof at any time without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
        </Text>

        <Text style={styles.sectionTitle}>3. Eligibility</Text>
        <Text style={styles.paragraph}>
          The Service is intended for users who are at least 13 years of age. By using the Service, you represent and warrant that you are at least 13 years old and that you have the right, authority, and capacity to enter into these Terms and abide by all of the terms and conditions set forth herein.
        </Text>

        <Text style={styles.sectionTitle}>4. Account Registration</Text>
        <Text style={styles.paragraph}>
          To use certain features of the Service, you may be required to create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
        </Text>
        <Text style={styles.paragraph}>
          You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
        </Text>

        <Text style={styles.sectionTitle}>5. User Content</Text>
        <Text style={styles.paragraph}>
          Our Service allows you to upload, store, and share content, including photographs ("User Content"). You retain all rights in, and are solely responsible for, the User Content you upload, post, or otherwise make available through the Service.
        </Text>
        <Text style={styles.paragraph}>
          By uploading or sharing User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, and distribute your User Content in connection with providing and improving the Service.
        </Text>
        <Text style={styles.paragraph}>
          You represent and warrant that: (i) you own the User Content or have the right to use and grant us the rights and license as provided in these Terms, and (ii) the uploading and use of your User Content does not violate the privacy rights, publicity rights, copyrights, contract rights, intellectual property rights, or any other rights of any person.
        </Text>

        <Text style={styles.sectionTitle}>6. Prohibited Conduct</Text>
        <Text style={styles.paragraph}>
          You agree not to engage in any of the following prohibited activities:
        </Text>
        <Text style={styles.paragraph}>
          • Using the Service for any illegal purpose or in violation of any local, state, national, or international law
        </Text>
        <Text style={styles.paragraph}>
          • Uploading or sharing content that is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable
        </Text>
        <Text style={styles.paragraph}>
          • Impersonating any person or entity, or falsely stating or otherwise misrepresenting your affiliation with a person or entity
        </Text>
        <Text style={styles.paragraph}>
          • Interfering with or disrupting the Service or servers or networks connected to the Service
        </Text>
        <Text style={styles.paragraph}>
          • Attempting to gain unauthorized access to parts of the Service that are restricted
        </Text>
        <Text style={styles.paragraph}>
          • Using any robot, spider, crawler, scraper, or other automated means to access the Service
        </Text>

        <Text style={styles.sectionTitle}>7. In-App Purchases and Subscription</Text>
        <Text style={styles.paragraph}>
          The Service may offer in-app purchases and subscription options. Purchases made through the Service are processed by third-party payment processors and are subject to their terms and conditions.
        </Text>
        <Text style={styles.paragraph}>
          All purchases are final and non-refundable, except as required by applicable law. You acknowledge that we are not required to provide a refund for any reason, and that you will not receive money or other compensation for unused virtual items when you close your account or discontinue use of the Service.
        </Text>

        <Text style={styles.sectionTitle}>8. Intellectual Property Rights</Text>
        <Text style={styles.paragraph}>
          The Service and its original content (excluding User Content), features, and functionality are and will remain the exclusive property of Colourise AI and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
        </Text>
        <Text style={styles.paragraph}>
          Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Colourise AI.
        </Text>

        <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL COLOURISE AI, ITS AFFILIATES, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, THAT RESULT FROM THE USE OF, OR INABILITY TO USE, THE SERVICE.
        </Text>
        <Text style={styles.paragraph}>
          UNDER NO CIRCUMSTANCES WILL COLOURISE AI BE RESPONSIBLE FOR ANY DAMAGE, LOSS, OR INJURY RESULTING FROM HACKING, TAMPERING, OR OTHER UNAUTHORIZED ACCESS OR USE OF THE SERVICE OR YOUR ACCOUNT OR THE INFORMATION CONTAINED THEREIN.
        </Text>

        <Text style={styles.sectionTitle}>10. Disclaimer of Warranties</Text>
        <Text style={styles.paragraph}>
          THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT ANY WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED.
        </Text>
        <Text style={styles.paragraph}>
          TO THE FULLEST EXTENT PROVIDED BY LAW, COLOURISE AI HEREBY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, NON-INFRINGEMENT, AND FITNESS FOR PARTICULAR PURPOSE.
        </Text>

        <Text style={styles.sectionTitle}>11. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.
        </Text>
        <Text style={styles.paragraph}>
          Any disputes arising out of or relating to these Terms or the Service will be resolved exclusively in the state or federal courts located in San Francisco County, California, and you consent to the personal jurisdiction of those courts.
        </Text>

        <Text style={styles.sectionTitle}>12. Termination</Text>
        <Text style={styles.paragraph}>
          We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms.
        </Text>
        <Text style={styles.paragraph}>
          Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service or delete your account through the app settings.
        </Text>

        <Text style={styles.sectionTitle}>13. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms, please contact us at:
        </Text>
        <Text style={styles.contactInfo}>Colourise AI</Text>
        <Text style={styles.contactInfo}>Email: legal@colouriseai.com</Text>
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