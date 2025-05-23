import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "../theme-provider";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface CardTitleProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

interface CardContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface CardFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, style }: CardProps) => {
  const { styles } = useTheme();
  
  return (
    <View style={[styles.card.base, style]}>
      {children}
    </View>
  );
};

export const CardHeader = ({ children, style }: CardHeaderProps) => {
  return (
    <View style={[localStyles.header, style]}>
      {children}
    </View>
  );
};

export const CardTitle = ({ children, style }: CardTitleProps) => {
  const { colors } = useTheme();
  
  return (
    <Text style={[localStyles.title, { color: colors.cardForeground }, style]}>
      {children}
    </Text>
  );
};

export const CardDescription = ({ children, style }: CardDescriptionProps) => {
  const { colors } = useTheme();
  
  return (
    <Text style={[localStyles.description, { color: colors.mutedForeground }, style]}>
      {children}
    </Text>
  );
};

export const CardContent = ({ children, style }: CardContentProps) => {
  return (
    <View style={[localStyles.content, style]}>
      {children}
    </View>
  );
};

export const CardFooter = ({ children, style }: CardFooterProps) => {
  return (
    <View style={[localStyles.footer, style]}>
      {children}
    </View>
  );
};

const localStyles = StyleSheet.create({
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
  },
  content: {
    marginVertical: 8,
  },
  footer: {
    marginTop: 12,
  },
});
