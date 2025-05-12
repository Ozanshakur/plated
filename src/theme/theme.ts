import { createTheme } from "@shopify/restyle"

// Definiere die Farbpalette
const palette = {
  // Helle Farben
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  black: "#000000",

  // Primärfarben (Lila/Pink)
  purple50: "#FAF5FF",
  purple100: "#F3E8FF",
  purple200: "#E9D5FF",
  purple300: "#D8B4FE",
  purple400: "#C084FC",
  purple500: "#A855F7",
  purple600: "#9333EA",
  purple700: "#7E22CE",
  purple800: "#6B21A8",
  purple900: "#581C87",

  // Pink Akzente
  pink300: "#F9A8D4",
  pink400: "#F472B6",
  pink500: "#EC4899",
  pink600: "#DB2777",

  // Akzentfarben
  red500: "#EF4444",
  green500: "#10B981",
  yellow500: "#F59E0B",
}

// Definiere das Light Theme
const lightTheme = createTheme({
  colors: {
    mainBackground: palette.white,
    cardBackground: palette.white,
    primaryText: palette.gray900,
    secondaryText: palette.gray600,
    primary: palette.purple600,
    primaryLight: palette.purple100,
    accent: palette.pink400,
    border: palette.gray200,
    error: palette.red500,
    success: palette.green500,
    warning: palette.yellow500,
    buttonPrimary: palette.purple600,
    buttonSecondary: palette.gray200,
    buttonText: palette.white,
    buttonTextSecondary: palette.gray800,
    inputBackground: palette.gray100,
    tabBarBackground: palette.white,
    tabBarIcon: palette.gray500,
    tabBarIconActive: palette.purple600,
    // Füge die fehlenden Farben hinzu
    gray400: palette.gray400,
    gray500: palette.gray500,
    black: palette.black,
    // Neue Farben für Effekte
    gradientStart: palette.purple500,
    gradientEnd: palette.pink500,
    cardBorder: palette.purple100,
    highlight: palette.pink300,
    // Neue Farben für verbesserte UI
    surfaceBackground: palette.gray50,
    divider: palette.gray200,
    cardShadow: "rgba(0, 0, 0, 0.05)",
    shimmer: palette.gray200,
    shimmerHighlight: palette.white,
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadii: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    xxl: 32,
    full: 9999,
  },
  textVariants: {
    defaults: {
      fontSize: 16,
      lineHeight: 24,
      color: "primaryText",
    },
    header: {
      fontWeight: "bold",
      fontSize: 34,
      lineHeight: 42.5,
      color: "primaryText",
    },
    subheader: {
      fontWeight: "600",
      fontSize: 28,
      lineHeight: 36,
      color: "primaryText",
    },
    title: {
      fontWeight: "600",
      fontSize: 22,
      lineHeight: 28,
      color: "primaryText",
    },
    subtitle: {
      fontWeight: "500",
      fontSize: 17,
      lineHeight: 22,
      color: "primaryText",
    },
    body: {
      fontSize: 17,
      lineHeight: 22,
      color: "primaryText",
    },
    caption: {
      fontSize: 15,
      lineHeight: 20,
      color: "secondaryText",
    },
    small: {
      fontSize: 13,
      lineHeight: 18,
      color: "secondaryText",
    },
    button: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "600",
      color: "buttonText",
    },
  },
  breakpoints: {
    phone: 0,
    tablet: 768,
  },
})

// Definiere das Dark Theme basierend auf dem Light Theme
const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    // Elegantere Grau-/Schwarztöne für den Dark Mode
    mainBackground: "#121212", // Tiefes Schwarz statt Blau
    cardBackground: "#1E1E1E", // Dunkelgrau statt Dunkelblau
    surfaceBackground: "#262626", // Mittleres Dunkelgrau
    primaryText: palette.white,
    secondaryText: palette.gray400,
    border: "#333333", // Dunkelgrau statt Blau
    divider: "#333333",
    inputBackground: "#262626", // Dunkelgrau
    tabBarBackground: "#121212",
    buttonSecondary: "#333333",
    buttonTextSecondary: palette.white,
    cardBorder: "#333333",
    cardShadow: "rgba(0, 0, 0, 0.2)",
    // Dunklere Versionen der Gradient-Farben für Dark Mode
    gradientStart: palette.purple700,
    gradientEnd: palette.pink600,
    shimmer: "#333333",
    shimmerHighlight: "#444444",
  },
}

export type Theme = typeof lightTheme
export { lightTheme, darkTheme }
