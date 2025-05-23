import React, { createContext, useContext, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "../theme-provider";
import { MaterialIcons } from "@expo/vector-icons";

type ToastType = "default" | "success" | "error" | "warning" | "info";

interface ToastProps {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  toast: (props: Omit<ToastProps, "id">) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const ToastProviderComponent = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const idCounter = useRef(0);

  const toast = (props: Omit<ToastProps, "id">) => {
    const id = `toast-${idCounter.current++}`;
    const newToast = { ...props, id };

    setToasts((prev) => [...prev, newToast]);

    if (props.duration !== 0) {
      setTimeout(() => {
        dismiss(id);
      }, props.duration || 3000);
    }

    return id;
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const dismissAll = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss, dismissAll }}>
      {children}
      <View style={styles.container}>
        {toasts.map((t) => (
          <ToastComponent key={t.id} {...t} onClose={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const ToastComponent = ({
  title,
  description,
  type = "default",
  onClose,
  action,
}: ToastProps) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const getIconName = () => {
    switch (type) {
      case "success":
        return "check-circle" as const;
      case "error":
        return "error" as const;
      case "warning":
        return "warning" as const;
      case "info":
        return "info" as const;
      default:
        return "notifications" as const;
    }
  };

  const getIconColor = (): string => {
    switch (type) {
      case "success":
        return colors.success;
      case "error":
        return colors.destructive;
      case "warning":
        return colors.warning;
      case "info":
        return colors.primary;
      default:
        return colors.primary;
    }
  };

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      // Clean up animations
      opacity.stopAnimation();
      translateY.stopAnimation();
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons
          name={getIconName()}
          size={24}
          color={getIconColor()}
        />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: colors.cardForeground }]}>
          {title}
        </Text>
        {description && (
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {description}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        {action && (
          <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
            <Text style={[styles.actionText, { color: colors.primary }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons
            name="close"
            size={16}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    marginRight: 8,
    padding: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
});

export const ToastProvider = ToastProviderComponent;
