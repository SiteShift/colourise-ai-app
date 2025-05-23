# Next.js to React Native Cleanup Checklist

## Overview
This document outlines the steps needed to convert the hybrid Next.js/React Native app to a pure React Native application while maintaining the exact same UI and functionality.

## 1. Files to Remove

- [x] `next.config.mjs`
- [x] `next-env.d.ts`
- [x] `.next/` directory
- [x] `postcss.config.mjs`
- [x] `tailwind.config.ts`
- [x] Components that are explicitly web-only (check for HTML tags usage)
- [x] Any page files in `app/` directory that use Next.js routing

## 2. Configuration Updates

- [x] Update `babel.config.js` to remove any Next.js specific plugins
- [x] Create a proper `app.json` for Expo configuration
- [x] Update `tsconfig.json` to remove Next.js specific settings
- [x] Remove `"use client"` directive from component files (in progress)
  - [x] Core UI components (dialog, tabs, switch, checkbox, toast, select, form)
  - [x] Context providers (auth-context, api-context)
  - [x] Main screen components (login-screen, signup-screen, transform-screen, gallery-screen, profile-screen)
  - [x] Removed unused web-specific components (calendar, carousel, pagination, etc.)
- [x] Update import paths (replace `@/` paths with relative imports)
- [x] Ensure all imports use React Native path structure (not web paths)

## 3. Dependencies to Remove/Replace

### Remove Web-Only Dependencies
- [x] `next`
- [x] `next-themes`
- [x] `react-dom`
- [x] `@types/react-dom`
- [x] All `@radix-ui/*` packages (including Slot and other components)
- [x] `class-variance-authority` (used for web styling)
- [x] `tailwindcss` and related packages:
  - [x] `tailwindcss-animate`
  - [x] `tailwind-merge`
  - [x] `autoprefixer`
  - [x] `postcss`
  - [x] `clsx` (used with Tailwind)
- [x] `recharts` (web charts)
- [x] `vaul` (web drawers)
- [x] `cmdk` (command menu for web)
- [x] `react-day-picker` (web date picker)
- [x] `react-resizable-panels` (web only)
- [x] `sonner` (web toast library)
- [x] `lucide-react` (replace with expo-vector-icons)

### Add React Native Equivalents
- [x] `@rneui/themed` or `react-native-paper` for UI components
- [x] `react-native-chart-kit` for charts
- [x] `react-native-toast-message` for toasts
- [x] `react-native-calendars` for calendar functionality
- [x] `react-native-modal` for modals/dialogs
- [x] `react-native-dropdown-picker` for select/dropdown

## 4. Component Conversion Strategy

### Core UI Components to Rebuild
- [x] Button (currently uses Radix UI Slot and class-variance-authority)
  - Create native Button component with similar variants
- [x] Input
- [x] Card
- [x] Modal/Dialog (replace Radix dialog with React Native Modal)
- [x] Dropdown/Select
- [x] Tabs
- [x] Toast notifications
- [x] Form elements
- [x] Toggle/Switch
- [x] Checkbox/Radio

### Styling Approach
- [x] Remove all className props and cn() utility references
- [x] Replace with React Native StyleSheet
- [x] Create lib/theme.ts to define consistent colors and styles
- [x] Convert variant-based styling (currently using cva) to React Native style props
- [x] Create a theme context to replace `next-themes`
- [x] Implement a style system that maintains the same visual identity
- [x] Create a set of theme variables (colors, spacing, typography) consistent with current design

## 5. Screen-by-Screen Analysis & Conversion

- [x] WelcomeScreen
  - Already using proper React Native components (View, Text, etc.)
  - No conversion needed except for navigation types
- [x] LoginScreen
  - Removed "use client" directive
  - Fixed alert references
- [x] SignupScreen
  - Removed "use client" directive
  - Fixed alert references
- [x] ProfileScreen
  - Removed "use client" directive
- [x] GalleryScreen
  - Removed "use client" directive
- [x] TransformScreen (complex, needs custom UI components)
  - Removed "use client" directive
- [ ] IntroScreen

## 6. Navigation Updates

- [x] Ensure React Navigation is properly configured
- [ ] Update all navigation references to use proper typing
- [ ] Remove any navigation type casts (e.g., "as never")
- [x] Remove any web-specific navigation code

## 7. Testing Process

- [x] Test app runs on Expo mobile client
- [ ] Test each converted component in isolation
- [ ] Test screen flows
- [ ] Test on both iOS and Android
- [ ] Compare with original UI to ensure visual consistency
- [ ] Test all app features (authentication, camera, image manipulation)

## 8. Package.json Updates

- [x] Clean up scripts section to remove web-related commands:
  ```
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
  ```
- [x] Add React Native/Expo specific scripts:
  ```
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  ```
- [x] Ensure all dependencies are correctly versioned for React Native compatibility
- [x] Regenerate package-lock.json to remove Next.js dependencies

## 9. Asset Management

- [ ] Ensure all assets are properly formatted for mobile
- [x] Move assets from public/ to assets/ (appears assets are already in assets/ directory)
- [ ] Check image resolutions and formats for mobile optimization

## 10. Context Providers Updates

- [x] Check `AuthProvider` for web-specific code
- [x] Check `ApiProvider` for web-specific code
- [x] Update any other context providers to use React Native patterns

## 11. Completed Next.js Removal

- [x] Removed all "use client" directives from essential components
- [x] Removed app/ directory with Next.js routing
- [x] Removed web-specific UI components (calendar, carousel, pagination)
- [x] Removed Next.js from dependencies
- [x] Removed Next.js references from package-lock.json

## Notes for Maintaining UI Consistency
- Keep exact same color scheme
- Maintain font sizes and families
- Preserve spacing and layout patterns
- Ensure animations and transitions feel similar (already using Animated API in screens)
- Match interaction patterns where possible

## Implementation Priority
1. Remove Next.js configuration and dependencies first ✅
2. Create base UI components replacements ✅
3. Update screen components one by one ✅
4. Test each screen after conversion ✅
5. Final integration testing ⏳ 