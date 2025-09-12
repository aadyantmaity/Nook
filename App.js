import React, { useEffect, useState, useCallback } from "react";
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
import { auth, db } from "./firebaseConfig";
import { Appearance, Platform } from "react-native";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import * as Notifications from "expo-notifications";
import { colors, getThemeColors } from "./constants/colors";
import * as Linking from "expo-linking";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import GroupChatScreen from "./screens/GroupChatScreen";
import GroupInfoScreen from "./screens/GroupInfoScreen";
import MembersManageScreen from "./screens/MembersManageScreen";
import RecentActivityScreen from "./screens/RecentActivityScreen";

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

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);

  const themeColors = getThemeColors(isDarkMode);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          CarosSoft: require("./assets/fonts/CarosSoftBold.otf"),
          "SF-Pro-Display-Regular": require("./assets/fonts/SF-Pro-Display-Regular.otf"),
        });
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    let unsubscribeUserDoc = null;
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setIsAuthenticated(!!user);
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        // Subscribe to user doc so theme updates live
        unsubscribeUserDoc = onSnapshot(userRef, (snap) => {
          const data = snap.data() || {};
          // lightMode: true => light, false => dark
          const lightMode = data.lightMode;
          if (typeof lightMode === 'boolean') {
            setIsDarkMode(!lightMode);
          } else {
            // default to light if field missing
            setIsDarkMode(false);
          }
        });
      } else {
        // if logged out, fall back to light
        setIsDarkMode(false);
      }
    });
    return () => {
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      unsubscribeAuth();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady || isAuthenticated === null) {
    return null;
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
      <Stack.Screen name="MembersManage" component={MembersManageScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="RecentActivity" component={RecentActivityScreen} />
    </Stack.Navigator>
  );

  return (
    <HomeViewProvider>
      <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, themeColors }}>
        <NavigationContainer ref={navigationRef} linking={linking} onReady={onLayoutRootView}>
          {isAuthenticated ? <MainStack /> : <AuthStack />}
        </NavigationContainer>
      </ThemeContext.Provider>
    </HomeViewProvider>
  );
}
