import React, { useState, forwardRef } from "react";
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from "react-native";
import { useTheme } from "../theme-provider";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      placeholder,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      ...props
    },
    ref
  ) => {
    const { styles, colors, isDark } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    // Get input styles from theme
    const inputStyles = styles.input;

    // Combine input styles based on state
    const composedInputStyle = [
      inputStyles.base,
      isFocused && inputStyles.focus,
      error && inputStyles.error,
      props.editable === false && inputStyles.disabled,
      inputStyle,
    ];

    return (
      <View style={[localStyles.container, containerStyle]}>
        {label && (
          <Text style={[localStyles.label, labelStyle]}>
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          style={composedInputStyle}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {error && (
          <Text style={[localStyles.error, errorStyle]}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";

const localStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "500",
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    color: "red",
  },
});
