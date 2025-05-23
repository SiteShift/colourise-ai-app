import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { useTheme } from "../theme-provider";
import { Button } from "./button";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface DialogTriggerProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

interface DialogContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface DialogFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface DialogTitleProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const Dialog = ({ children }: DialogProps) => {
  return <>{children}</>;
};

export const DialogTrigger = ({ children, onPress, style }: DialogTriggerProps) => {
  return (
    <TouchableOpacity onPress={onPress} style={style}>
      {children}
    </TouchableOpacity>
  );
};

export const DialogContent = ({ children, style }: DialogContentProps) => {
  const { colors } = useTheme();
  
  return (
    <View
      style={[
        styles.content,
        { backgroundColor: colors.card },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const DialogHeader = ({ children, style }: DialogHeaderProps) => {
  return <View style={[styles.header, style]}>{children}</View>;
};

export const DialogFooter = ({ children, style }: DialogFooterProps) => {
  return <View style={[styles.footer, style]}>{children}</View>;
};

export const DialogTitle = ({ children, style }: DialogTitleProps) => {
  const { colors } = useTheme();
  
  return (
    <Text
      style={[
        styles.title,
        { color: colors.cardForeground },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export const DialogDescription = ({ children, style }: DialogDescriptionProps) => {
  const { colors } = useTheme();
  
  return (
    <Text
      style={[
        styles.description,
        { color: colors.mutedForeground },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export function DialogRoot({
  open,
  onOpenChange,
  children,
  style,
}: DialogProps) {
  const { colors } = useTheme();
  
  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <TouchableWithoutFeedback onPress={() => onOpenChange(false)}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.container, style]}>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function DialogClose({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 500,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  content: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    marginBottom: 12,
  },
  footer: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
});
