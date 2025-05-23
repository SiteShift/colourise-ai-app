import React from "react";
import {
  Switch as RNSwitch,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "../theme-provider";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  labelPosition?: "left" | "right";
  containerStyle?: StyleProp<ViewStyle>;
  switchStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export const Switch = ({
  checked = false,
  onCheckedChange,
  disabled = false,
  label,
  labelPosition = "right",
  containerStyle,
  switchStyle,
  labelStyle,
}: SwitchProps) => {
  const { colors } = useTheme();

  const handleValueChange = (value: boolean) => {
    onCheckedChange?.(value);
  };

  const switchComponent = (
    <RNSwitch
      value={checked}
      onValueChange={handleValueChange}
      disabled={disabled}
      trackColor={{
        false: colors.muted,
        true: colors.primary,
      }}
      thumbColor={checked ? colors.primaryForeground : colors.background}
      ios_backgroundColor={colors.muted}
      style={switchStyle}
    />
  );

  if (!label) {
    return switchComponent;
  }

  return (
    <View
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

      {switchComponent}

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
});
