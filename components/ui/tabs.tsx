import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  ScrollView,
} from "react-native";
import { useTheme } from "../theme-provider";

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface TabsListProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  isActive?: boolean;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

export const Tabs = ({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  style,
}: TabsProps) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || "");

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <View style={[styles.container, style]}>{children}</View>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, style }: TabsListProps) => {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.list, style]}
    >
      {children}
    </ScrollView>
  );
};

export const TabsTrigger = ({
  value,
  children,
  onPress,
  style,
  textStyle,
  isActive: isActiveProp,
}: TabsTriggerProps) => {
  const context = React.useContext(TabsContext);
  const { colors } = useTheme();

  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component");
  }

  const isActive = isActiveProp !== undefined ? isActiveProp : context.value === value;

  const handlePress = () => {
    context.onValueChange(value);
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.trigger,
        isActive && [
          styles.triggerActive,
          { backgroundColor: colors.accent }
        ],
        style,
      ]}
    >
      <Text
        style={[
          styles.triggerText,
          { color: colors.mutedForeground },
          isActive && [
            styles.triggerTextActive,
            { color: colors.accentForeground }
          ],
          textStyle,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export const TabsContent = ({ value, children, style }: TabsContentProps) => {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component");
  }

  const isActive = context.value === value;

  if (!isActive) return null;

  return <View style={[styles.content, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  list: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  trigger: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  triggerActive: {
    borderRadius: 8,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: "500",
  },
  triggerTextActive: {
    fontWeight: "600",
  },
  content: {
    marginTop: 12,
  },
});
