import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "../theme-provider";
import { MaterialIcons } from "@expo/vector-icons";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  labelPosition?: "left" | "right";
  containerStyle?: StyleProp<ViewStyle>;
  checkboxStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export const Checkbox = ({
  checked = false,
  onCheckedChange,
  disabled = false,
  label,
  labelPosition = "right",
  containerStyle,
  checkboxStyle,
  labelStyle,
}: CheckboxProps) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (!disabled) {
      onCheckedChange?.(!checked);
    }
  };

  const checkboxComponent = (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.checkbox,
        {
          backgroundColor: checked ? colors.primary : "transparent",
          borderColor: checked ? colors.primary : colors.border,
        },
        disabled && { opacity: 0.5 },
        checkboxStyle,
      ]}
    >
      {checked && (
        <MaterialIcons
          name="check"
          size={16}
          color={colors.primaryForeground}
        />
      )}
    </TouchableOpacity>
  );

  if (!label) {
    return checkboxComponent;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.container,
        { opacity: disabled ? 0.5 : 1 },
        containerStyle,
      ]}
    >
      {labelPosition === "left" && (
        <Text
          style={[
            styles.label,
            { color: colors.cardForeground, marginRight: 8 },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}

      {checkboxComponent}

      {labelPosition === "right" && (
        <Text
          style={[
            styles.label,
            { color: colors.cardForeground, marginLeft: 8 },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
});
