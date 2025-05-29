export const colors = {
  purple: "#32006e", // University of Washington purple
  gold: "#B7A57A", // University of Washington gold
  white: "#FFFFFF", // Fix: set white to actual white
  black: "#000000",
  gray: "#F0F0F0",
  darkGray: "#CCCCCC",
  darkBackground: "#121212", // Dark mode background
  darkCard: "#1E1E1E", // Dark mode card background
  lightText: "#b7a57a", // Light text for dark mode
  subtleText: "#CCCCCC", // Subtle text for dark mode
  red: "#CC0000", // Darker red for error or important actions
  green: "#28A745", // Green for success messages
};

export const dark = {
  purple: "#b7a57a", // Lighter purple for dark mode
  gold: "#B7A57A", // University of Washington gold
  white: "#121212", // Dark background for dark mode
  black: "#FFFFFF", // White text for dark mode
  gray: "#232323", // Darker gray for dark mode
  darkGray: "#888888", // Medium gray for dark mode
  darkBackground: "#121212", // Dark mode background
  darkCard: "#1E1E1E", // Dark mode card background
  lightText: "#b7a57a", // Light text for dark mode
  subtleText: "#888888", // Medium subtle text for dark mode
  red: "#FF5555", // Brighter red for errors or important actions in dark mode
  green: "#28A745", // Green for success messages
};

export function getThemeColors(isDark) {
  return isDark ? dark : colors;
}
