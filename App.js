import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "./screens/HomeScreen";
import SpotDetailScreen from "./screens/SpotDetailScreen";
import AddSpotScreen from "./screens/AddSpotScreen";
import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import ProfileScreen from "./screens/ProfileScreen";
import EditSpotScreen from "./screens/EditSpotScreen";
import VerificationScreen from "./screens/VerificationScreen";
import { auth } from "./firebaseConfig";
import { Appearance } from "react-native";
import { colors, getThemeColors } from "./constants/colors";
import * as Linking from "expo-linking";
import * as Font from "expo-font";
import AppLoading from "expo-app-loading"; // Show while fonts are loading

const Stack = createStackNavigator();

export const ThemeContext = React.createContext({
  isDarkMode: false,
  setIsDarkMode: () => {},
  themeColors: colors,
});

const linking = {
  prefixes: [
    "nook://",
    "https://yourapp.page.link",
    "exp://",
    "exp://192.168.1.151:8081",
  ],
  config: {
    screens: {
      SpotDetail: {
        path: "spot/:spotId",
        parse: { spotId: (id) => id },
      },
    },
  },
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(
    Appearance.getColorScheme() === "dark"
  );
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const themeColors = getThemeColors(isDarkMode);

  useEffect(() => {
    const loadFonts = async () => {
      await Font.loadAsync({
        CarosSoft: require("./assets/fonts/CarosSoftBold.otf"),
      });
      setFontsLoaded(true);
    };
    loadFonts();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        await user.reload();
        setIsEmailVerified(user.emailVerified);
      } else {
        setIsEmailVerified(null);
      }
    });
    return unsubscribe;
  }, []);

  if (!fontsLoaded || isEmailVerified === null) {
    return <AppLoading />;
  }

  const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );

  const MainStack = () => (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SpotDetail" component={SpotDetailScreen} />
      <Stack.Screen name="AddSpot" component={AddSpotScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditSpot" component={EditSpotScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
      <Stack.Screen
        name="FindPeopleView"
        component={require("./screens/FindPeopleView").default}
      />
    </Stack.Navigator>
  );

  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, themeColors }}>
      <NavigationContainer linking={linking}>
        {!currentUser ? (
          <AuthStack />
        ) : !isEmailVerified ? (
          <VerificationScreen />
        ) : (
          <MainStack />
        )}
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}
