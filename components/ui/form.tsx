import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "../theme-provider";
import { Controller, FieldValues, UseFormReturn, FieldPath, FieldErrors } from "react-hook-form";
import { Input, InputProps } from "./input";

interface FormProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  children: React.ReactNode;
  onSubmit?: (data: T) => void;
  style?: StyleProp<ViewStyle>;
}

interface FormFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  children: React.ReactElement;
}

interface FormItemProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface FormLabelProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

interface FormControlProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface FormDescriptionProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

interface FormMessageProps {
  children?: React.ReactNode;
  error?: string | string[] | null;
  style?: StyleProp<TextStyle>;
}

export function Form<T extends FieldValues>({
  form,
  children,
  onSubmit,
  style,
}: FormProps<T>) {
  const handleSubmit = () => {
    if (onSubmit) {
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <View style={[styles.form, style]}>
      {children}
    </View>
  );
}

export function FormField<T extends FieldValues>({
  form,
  name,
  children,
}: FormFieldProps<T>) {
  const { formState } = form;
  const error = formState.errors[name]?.message as string | undefined;

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => {
        return React.cloneElement(children, {
          ...(children.props || {}),
          onChangeText: field.onChange,
          onBlur: field.onBlur,
          value: field.value as any,
          name: field.name,
          error,
        } as any);
      }}
    />
  );
}

export function FormItem({ children, style }: FormItemProps) {
  return <View style={[styles.formItem, style]}>{children}</View>;
}

export function FormLabel({ children, style }: FormLabelProps) {
  const { colors } = useTheme();

  return (
    <Text style={[styles.formLabel, { color: colors.cardForeground }, style]}>
      {children}
    </Text>
  );
}

export function FormControl({ children, style }: FormControlProps) {
  return <View style={[styles.formControl, style]}>{children}</View>;
}

export function FormDescription({ children, style }: FormDescriptionProps) {
  const { colors } = useTheme();

  return (
    <Text
      style={[styles.formDescription, { color: colors.mutedForeground }, style]}
    >
      {children}
    </Text>
  );
}

export function FormMessage({
  children,
  error,
  style,
}: FormMessageProps) {
  const { colors } = useTheme();

  if (!error && !children) {
    return null;
  }

  return (
    <Text style={[styles.formMessage, { color: colors.destructive }, style]}>
      {error || children}
    </Text>
  );
}

const styles = StyleSheet.create({
  form: {
    width: "100%",
  },
  formItem: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  formControl: {
    width: "100%",
  },
  formDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  formMessage: {
    fontSize: 12,
    marginTop: 4,
  },
});
