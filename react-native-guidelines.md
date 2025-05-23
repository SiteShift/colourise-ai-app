# React Native Mobile App Development Guidelines

This document provides guidelines for maintaining and developing this React Native mobile application to ensure we don't accidentally reintroduce web dependencies or practices that would require cleanup later.

## Project Architecture

### Directory Structure

- `assets/` - All app images, icons, and other static assets
- `components/` - Reusable UI components 
  - `ui/` - Core UI components (buttons, inputs, etc.)
- `context/` - React context providers for app-wide state
- `hooks/` - Custom React hooks
- `navigation/` - Navigation configuration and components
- `screens/` - Full screens of the application
- `lib/` - Utility functions and helpers
- `@types/` - TypeScript type definitions

### Key Components

- **UI Components** - Use only React Native compatible components from `react-native`, `react-native-paper`, or custom components
- **Navigation** - Uses React Navigation (`@react-navigation/native` and related packages)
- **Forms** - Uses `react-hook-form` with `zod` for validation
- **Storage** - Uses `@react-native-async-storage/async-storage` for local data persistence

## Development Rules

### 🚫 What to Avoid

1. **Next.js or Web-specific Dependencies**
   - Never add Next.js or related web dependencies
   - No web-specific UI libraries (e.g., Radix UI, Tailwind, etc.)
   - No DOM-specific packages (react-dom, etc.)

2. **Web-Specific Code Patterns**
   - No HTML tags (`<div>`, `<span>`, etc.) - use React Native components instead
   - No CSS or className props - use StyleSheet objects
   - No "use client" directives
   - No web-specific browser APIs
   - No CSS-in-JS libraries designed for web

3. **File Structure**
   - No `/app` directory (Next.js routing)
   - No `/pages` directory (Next.js routing)
   - No `/public` directory (use `/assets` instead)
   - No web config files (next.config.js, postcss.config.js, etc.)

### ✅ What to Use Instead

1. **Styling**
   - Use React Native's `StyleSheet` for styling
   - Define styles at the bottom of component files
   - Use theme constants for consistent colors and spacing

2. **Navigation**
   - Use React Navigation for all routing
   - Stack Navigator for screen stacks
   - Tab Navigator for tab-based navigation
   - Drawer Navigator for side menus

3. **UI Components**
   - Use React Native core components (`View`, `Text`, `TouchableOpacity`, etc.)
   - Use React Native Paper components for more complex UI needs
   - For custom components, ensure they're built with React Native primitives

4. **Asset Handling**
   - Store all assets in the `/assets` directory
   - Use `require()` or import syntax for local images
   - Use Expo Vector Icons for iconography
   - Optimize images for mobile devices

## Dependencies Management

### Approved Dependencies

- **UI**: `react-native-paper`, `@expo/vector-icons`
- **Navigation**: `@react-navigation/*` packages
- **Forms**: `react-hook-form`, `@hookform/resolvers`, `zod`
- **Storage**: `@react-native-async-storage/async-storage`
- **Camera/Images**: `expo-camera`, `expo-image-picker`, `expo-image-manipulator`
- **Effects**: `expo-blur`, `expo-linear-gradient`
- **Utilities**: `date-fns`, `expo-haptics`

### Before Adding New Dependencies

1. Check if the library is compatible with React Native
2. Check if it has mobile-specific implementation
3. Look for Expo compatibility if using Expo
4. Verify it doesn't introduce web-specific dependencies
5. Test on both iOS and Android before merging

## Component Development Guidelines

1. **Create Mobile-First Designs**
   - Consider touch interactions instead of hover/click
   - Design for smaller screens and touch targets
   - Account for keyboard overlays and different screen sizes

2. **Performance Considerations**
   - Minimize re-renders using memoization (useCallback, useMemo)
   - Optimize list rendering with FlatList and its performance props
   - Use appropriate image formats and sizes

3. **Use React Native Patterns**
   - Handle layout with Flexbox
   - Use native feedback (haptics, animations) for interactions
   - Follow platform-specific conventions where appropriate

## Testing and Quality Assurance

1. **Test on Real Devices**
   - Test on both iOS and Android physical devices
   - Test on multiple screen sizes

2. **Performance Testing**
   - Monitor memory usage and frame rates
   - Test on lower-end devices
   - Check for unnecessary re-renders

## Expo Configuration

Maintain the `app.json` file with appropriate Expo configuration:
- Keep permissions minimal and justified
- Update versions appropriately
- Configure splash screens and icons properly

## Example Components

### Correct React Native Button:
```tsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function Button({ title, onPress, variant = 'primary' }: ButtonProps) {
  return (
    <TouchableOpacity 
      style={[styles.button, variant === 'secondary' ? styles.secondaryButton : styles.primaryButton]} 
      onPress={onPress}
    >
      <Text style={[styles.text, variant === 'secondary' ? styles.secondaryText : styles.primaryText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  text: {
    fontWeight: '600',
    fontSize: 16,
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#6366f1',
  },
});
```

## Conclusion

Following these guidelines will help maintain a clean React Native codebase without web dependencies that would require cleanup later. When in doubt, always prefer React Native/Expo specific solutions over web-based alternatives. 