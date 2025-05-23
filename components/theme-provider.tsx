import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import { createComponentStyles, COLORS, DARK_COLORS } from "../lib/theme";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  colors: typeof COLORS;
  styles: ReturnType<typeof createComponentStyles>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => null,
  isDark: false,
  colors: COLORS,
  styles: createComponentStyles(false),
});

export const ThemeProvider = ({ 
  children,
  defaultTheme = "system",
}: { 
  children: React.ReactNode;
  defaultTheme?: Theme;
}) => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const systemColorScheme = useColorScheme();
  
  // Determine if dark mode is active based on theme and system preference
  const isDark = 
    theme === "dark" || 
    (theme === "system" && systemColorScheme === "dark");
  
  // Get the appropriate colors based on theme
  const colors = isDark ? DARK_COLORS : COLORS;
  
  // Get component styles based on theme
  const styles = createComponentStyles(isDark);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark,
        colors,
        styles,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
};
