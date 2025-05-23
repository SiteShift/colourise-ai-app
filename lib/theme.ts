import { Platform } from 'react-native';

export const COLORS = {
  // Base colors
  primary: '#0066FF',
  primaryDark: '#0052CC',
  primaryLight: '#4D94FF',
  
  // Foreground colors
  primaryForeground: '#FFFFFF',
  secondaryForeground: '#F1F5F9',
  
  // Background colors
  background: '#FFFFFF',
  backgroundDark: '#000000',
  
  // UI Colors
  secondary: '#64748B',
  secondaryLight: '#94A3B8',
  
  accent: '#F1F5F9',
  accentForeground: '#0F172A',
  
  muted: '#E2E8F0',
  mutedForeground: '#64748B',
  
  // Status colors
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  
  success: '#10B981',
  successForeground: '#FFFFFF',
  
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
  
  // Border colors
  border: '#E2E8F0',
  input: '#E2E8F0',
  ring: '#CBD5E1',
  
  // Card colors
  card: '#FFFFFF',
  cardForeground: '#0F172A',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  
  // Others
  popover: '#FFFFFF',
  popoverForeground: '#0F172A',
};

export const DARK_COLORS = {
  // Base colors
  primary: '#0066FF',
  primaryDark: '#0052CC',
  primaryLight: '#4D94FF',
  
  // Foreground colors
  primaryForeground: '#FFFFFF',
  secondaryForeground: '#F1F5F9',
  
  // Background colors
  background: '#0F172A',
  backgroundDark: '#000000',
  
  // UI Colors
  secondary: '#64748B',
  secondaryLight: '#94A3B8',
  
  accent: '#1E293B',
  accentForeground: '#F8FAFC',
  
  muted: '#1E293B',
  mutedForeground: '#94A3B8',
  
  // Status colors
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  
  success: '#10B981',
  successForeground: '#FFFFFF',
  
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
  
  // Border colors
  border: '#1E293B',
  input: '#1E293B',
  ring: '#1E293B',
  
  // Card colors
  card: '#1E293B',
  cardForeground: '#F8FAFC',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
  
  // Others
  popover: '#1E293B',
  popoverForeground: '#F8FAFC',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const FONT_WEIGHT = {
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
};

// Common component styles
export const createComponentStyles = (isDark = false) => {
  const colors = isDark ? DARK_COLORS : COLORS;
  
  return {
    // Button variants
    button: {
      base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.md,
        gap: SPACING.sm,
      },
      variants: {
        default: {
          backgroundColor: colors.primary,
        },
        destructive: {
          backgroundColor: colors.destructive,
        },
        outline: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        },
        secondary: {
          backgroundColor: colors.secondary,
        },
        ghost: {
          backgroundColor: 'transparent',
        },
        link: {
          backgroundColor: 'transparent',
          paddingVertical: 0,
          paddingHorizontal: 0,
        },
      },
      sizes: {
        default: {
          height: 40,
          paddingHorizontal: SPACING.lg,
        },
        sm: {
          height: 36,
          paddingHorizontal: SPACING.md,
          borderRadius: RADIUS.sm,
        },
        lg: {
          height: 44,
          paddingHorizontal: SPACING.xl,
          borderRadius: RADIUS.md,
        },
        icon: {
          height: 40,
          width: 40,
          paddingHorizontal: 0,
          borderRadius: RADIUS.md,
        },
      },
    },
    
    // Input styles
    input: {
      base: {
        height: 40,
        borderWidth: 1,
        borderColor: colors.input,
        backgroundColor: colors.background,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        fontSize: FONT_SIZE.md,
        color: colors.cardForeground,
      },
      focus: {
        borderColor: colors.primary,
      },
      error: {
        borderColor: colors.destructive,
      },
      disabled: {
        opacity: 0.5,
      },
    },
    
    // Card styles
    card: {
      base: {
        backgroundColor: colors.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        ...(Platform.OS === 'ios' ? SHADOWS.sm : { elevation: 2 }),
      },
    },
    
    // Text styles
    text: {
      base: {
        color: colors.cardForeground,
        fontSize: FONT_SIZE.md,
      },
      variants: {
        heading: {
          fontSize: FONT_SIZE.xl,
          fontWeight: FONT_WEIGHT.bold,
          marginBottom: SPACING.md,
        },
        subheading: {
          fontSize: FONT_SIZE.lg,
          fontWeight: FONT_WEIGHT.semibold,
          marginBottom: SPACING.sm,
        },
        body: {
          fontSize: FONT_SIZE.md,
        },
        small: {
          fontSize: FONT_SIZE.sm,
        },
        muted: {
          color: colors.mutedForeground,
          fontSize: FONT_SIZE.sm,
        },
      },
    },
  };
};

export default {
  COLORS,
  DARK_COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  createComponentStyles,
}; 