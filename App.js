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
import SearchScreen from "./screens/SearchScreen";
import { auth } from "./firebaseConfig";
import { Appearance, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { colors, getThemeColors } from "./constants/colors";
import * as Linking from "expo-linking";
import * as Font from "expo-font";
import AppLoading from "expo-app-loading";
import GroupChatScreen from "./screens/GroupChatScreen";
import GroupInfoScreen from "./screens/GroupInfoScreen";

import { HomeViewProvider } from "./components/Home/HomeViewContext";

const Stack = createStackNavigator();

// Create a navigation ref for handling deep links and notifications
export const navigationRef = React.createRef();

export const ThemeContext = React.createContext({
  isDarkMode: false,
  setIsDarkMode: () => {},
  themeColors: colors,
});

// Ensure notifications present while app is foreground (iOS requires explicit handler)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const linking = {
  prefixes: ["nook://", "https://nook-web.netlify.app"],
  config: {
    screens: {
      SpotDetail: {
        path: "/spot/:spotId",
        parse: { spotId: (id) => id },
      },
      Profile: {
        path: "/profile/:uid",
        parse: { uid: (id) => id },
      },

      Home: "/",
    },
  },
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(
    Appearance.getColorScheme() === "dark"
  );
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const themeColors = getThemeColors(isDarkMode);

  useEffect(() => {
    const loadFonts = async () => {
      await Font.loadAsync({
        CarosSoft: require("./assets/fonts/CarosSoftBold.otf"),
        "SF-Pro-Display-Regular": require("./assets/fonts/SF-Pro-Display-Regular.otf"),
      });
      setFontsLoaded(true);
    };
    loadFonts();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setIsAuthenticated(!!user);
    });
    return unsubscribe;
  }, []);
  if (!fontsLoaded || isAuthenticated === null) {
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
      <Stack.Screen name="GroupChat" component={GroupChatScreen} />
      <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
    </Stack.Navigator>
  );

  return (
    <HomeViewProvider>
      <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, themeColors }}>
        <NavigationContainer ref={navigationRef} linking={linking}>
          {isAuthenticated ? <MainStack /> : <AuthStack />}
        </NavigationContainer>
      </ThemeContext.Provider>
    </HomeViewProvider>
  );
}
