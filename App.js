import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "./screens/HomeScreen";
import SpotDetailScreen from "./screens/SpotDetailScreen";
import AddSpotScreen from "./screens/AddSpotScreen";
import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import ProfileScreen from "./screens/ProfileScreen";
import FocusTimerScreen from "./screens/FocusTimerScreen"; // <-- Add this import
import { auth } from "./firebaseConfig"; // Import Firebase auth
import { Text, View, ActivityIndicator, Appearance } from "react-native"; // For system color scheme
import { colors, getThemeColors } from "./constants/colors"; // <-- Import getThemeColors

const Stack = createStackNavigator();

export const ThemeContext = React.createContext({
  isDarkMode: false,
  setIsDarkMode: () => {},
  themeColors: colors,
});

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // Initialize as null to handle loading state
  const [isLoading, setIsLoading] = useState(false); // Add loading state for screen transitions
  const [isDarkMode, setIsDarkMode] = useState(
    Appearance.getColorScheme() === "dark"
  );
  const themeColors = getThemeColors(isDarkMode);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user); // Set true if user exists, false otherwise
    });
    return unsubscribe;
  }, []);

  if (isAuthenticated === null) {
    // Show a loading screen while checking authentication state
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="Loading"
            component={() => (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="large" color={colors.purple} />
                <Text style={{ color: colors.black }}>Loading...</Text>
              </View>
            )}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Wrap everything in ThemeContext.Provider
  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, themeColors }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="SpotDetail" component={SpotDetailScreen} />
          <Stack.Screen name="AddSpot" component={AddSpotScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="FocusTimer" component={FocusTimerScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}
