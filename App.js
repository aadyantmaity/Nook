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
import GroupDetailView from "./screens/GroupDetailView";
import { auth } from "./firebaseConfig";
import { Appearance } from "react-native";
import { colors, getThemeColors } from "./constants/colors";
import * as Linking from "expo-linking";
import * as Font from "expo-font";
import AppLoading from "expo-app-loading";

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
  const [isDarkMode, set]()
