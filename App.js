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
import { colors, getThemeColors } from "./constants/colors";
import * as Linking from "expo-linking";
import * as Font from "expo-font";
import AppLoading from "expo-app-loading";
import GroupDetailView from "./screens/GroupDetailView";
import GroupDetailsScreen from "./screens/GroupDetailsScreen";
import { HomeViewProvider } from "./components/Home/HomeViewContext";


const Stack = createStackNavigator();

export const ThemeContext = React.createContext({
  isDarkMode: false,
  setIsDarkMode: () => {},
  themeColors: colors,
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
      });
      setFontsLoaded(true);
    };
    loadFonts();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
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
      <Stack.Screen name="GroupDetail" component={GroupDetailView} />
      <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
    </Stack.Navigator>
  );

  return (
    <HomeViewProvider>
      <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, themeColors }}>
        <NavigationContainer linking={linking}>
          {isAuthenticated ? <MainStack /> : <AuthStack />}
        </NavigationContainer>
      </ThemeContext.Provider>
    </HomeViewProvider>
  );
}
