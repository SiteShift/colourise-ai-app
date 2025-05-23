import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from "react-native";
import { useTheme } from "../theme-provider";

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

export const Button = ({
  children,
  variant = "default",
  size = "default",
  isLoading = false,
  startIcon,
  endIcon,
  style,
  textStyle,
  disabled,
  ...props
}: ButtonProps) => {
  const { styles, colors, isDark } = useTheme();
  
  // Get base button styles from theme
  const buttonStyles = styles.button;
  
  // Combine styles based on variant and size
  const containerStyle = [
    buttonStyles.base,
    buttonStyles.variants[variant],
    buttonStyles.sizes[size],
    disabled && { opacity: 0.5 },
    style,
  ];
  
  // Determine text color based on variant
  const getTextColor = () => {
    switch (variant) {
      case "default":
        return colors.primaryForeground;
      case "destructive":
        return colors.destructiveForeground;
      case "outline":
      case "ghost":
        return colors.accentForeground;
      case "secondary":
        return colors.secondaryForeground;
      case "link":
        return colors.primary;
      default:
        return colors.primaryForeground;
    }
  };
  
  // Base text style
  const baseTextStyle: TextStyle = {
    fontSize: 16,
    fontWeight: "500",
    color: getTextColor(),
  };
  
  // Handle size-specific text styles
  if (size === "sm") {
    baseTextStyle.fontSize = 14;
  } else if (size === "lg") {
    baseTextStyle.fontSize = 18;
  }
  
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled || isLoading}
      style={containerStyle}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
        />
      ) : (
        <View style={styles.row}>
          {startIcon && <View style={styles.icon}>{startIcon}</View>}
          {children && (
            <Text style={[baseTextStyle, textStyle]}>
              {children}
            </Text>
          )}
          {endIcon && <View style={styles.icon}>{endIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginHorizontal: 4,
  },
});
