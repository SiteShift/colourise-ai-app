import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Dimensions,
  Animated,
} from "react-native";
import { useTheme } from "../theme-provider";
import { MaterialIcons } from "@expo/vector-icons";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps {
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
  optionStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  placeholderStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
}

export const Select = ({
  placeholder = "Select an option",
  options,
  value,
  onValueChange,
  disabled = false,
  label,
  error,
  containerStyle,
  triggerStyle,
  optionStyle,
  labelStyle,
  placeholderStyle,
  valueStyle,
  errorStyle,
}: SelectProps) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  // Update internal state when value prop changes
  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  // Animation for modal
  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(50);
    }
  }, [isOpen]);

  const toggleSelect = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelectOption = (option: SelectOption) => {
    if (option.disabled) {
      return;
    }
    setSelectedValue(option.value);
    onValueChange?.(option.value);
    setIsOpen(false);
  };

  const selectedOption = options.find((option) => option.value === selectedValue);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.cardForeground }, labelStyle]}>{label}</Text>}
      
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggleSelect}
        disabled={disabled}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.background,
            borderColor: error ? colors.destructive : colors.border,
            borderWidth: 1,
          },
          disabled && { opacity: 0.5 },
          triggerStyle,
        ]}
      >
        <Text
          style={[
            selectedValue
              ? [styles.valueText, { color: colors.cardForeground }, valueStyle]
              : [styles.placeholder, { color: colors.mutedForeground }, placeholderStyle],
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <MaterialIcons
          name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={20}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>
      
      {error && <Text style={[styles.error, { color: colors.destructive }, errorStyle]}>{error}</Text>}
      
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
          style={styles.modalOverlay}
        >
          <Animated.View
            style={[
              styles.optionsContainer,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <ScrollView style={styles.optionsScrollView}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.7}
                  onPress={() => handleSelectOption(option)}
                  disabled={option.disabled}
                  style={[
                    styles.option,
                    {
                      backgroundColor:
                        selectedValue === option.value ? colors.accent : "transparent",
                    },
                    option.disabled && { opacity: 0.5 },
                    optionStyle,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color:
                          selectedValue === option.value
                            ? colors.accentForeground
                            : colors.cardForeground,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedValue === option.value && (
                    <MaterialIcons
                      name="check"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  trigger: {
    height: 40,
    borderRadius: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  placeholder: {
    fontSize: 14,
  },
  valueText: {
    fontSize: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionsContainer: {
    borderRadius: 8,
    borderWidth: 1,
    width: "80%",
    maxHeight: SCREEN_HEIGHT * 0.6,
    overflow: "hidden",
  },
  optionsScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: {
    fontSize: 14,
  },
});
