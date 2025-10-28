export const colors = {
  purple: "#32006e", // University of Washington purple
  gold: "#B7A57A", // University of Washington gold
  silver: "#C0C0C0", // Silver for 2nd place
  bronze: "#CD7F32", // Bronze for 3rd place
  white: "#fffaf4", // Fix: set white to actual white FFFaf4
  black: "#000000", // Use for high-contrast text/icons
  gray: "#F0F0F0",
  darkGray: "#b0b0b0",
  darkBackground: "#121212", // Dark mode background
  darkCard: "#1E1E1E", // Dark mode card background
  lightText: "#b7a57a", // Light text for dark mode
  subtleText: "#CCCCCC", // Subtle text for dark mode
  red: "#E26358", // Brighter red for error or important actions
  green: "#99CD9E", // Green for success messages
  orange: "#FFA500", // Orange for warnings or highlights
  blue: "#3498db", // Blue for timer controls and interactive elements
};

export const dark = {
  purple: "#BCADE0", // Lighter purple for dark mode
  gold: "#B7A57A", // University of Washington gold
  silver: "#C0C0C0", // Silver for 2nd place
  bronze: "#CD7F32", // Bronze for 3rd place
  white: "#121212", // Dark background for dark mode
  black: "#fffaf4", // White text for dark mode
  gray: "#232323", // Darker gray for dark mode
  darkGray: "#888888", // Medium gray for dark mode
  darkBackground: "#121212", // Dark mode background
  darkCard: "#1E1E1E", // Dark mode card background
  lightText: "#b7a57a", // Light text for dark mode
  subtleText: "#888888", // Medium subtle text for dark mode
  red: "#E26358", // Brighter red for errors or important actions in dark mode
  green: "#99CD9E", // Green for success messages
  orange: "#FFA500", // Orange for warnings or highlights
  blue: "#5dade2", // Lighter blue for timer controls in dark mode
};

export function getThemeColors(isDark) {
  return isDark ? dark : colors;
}
