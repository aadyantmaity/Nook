import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth"; // Import Firebase Auth and sendPasswordResetEmail
import { colors } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { auth } from "../firebaseConfig"; // Import the initialized auth

export default function LoginScreen({ navigation }) {
  const themeColors = colors;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetInfo, setResetInfo] = useState(""); // Info message for reset
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState(""); // Add error state

  const getFriendlyError = (error) => {
    if (!error?.code) return "An unexpected error occurred. Please try again.";
    switch (error.code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/invalid-credential":
        return "Invalid email or password. Please try again.";
      default:
        return error.message || "An error occurred. Please try again.";
    }
  };

  const handleLogin = () => {
    setError("");
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {})
      .catch((error) => {
        setError(getFriendlyError(error));
      });
  };

  const handleSignUp = () => {
    // Navigate to the Sign Up screen
    navigation.navigate("SignUp");
  };

  const handleForgotPassword = async () => {
    setResetInfo("");
    setResetLoading(true);
    try {
      if (!email) {
        setResetInfo("Enter your email above first.");
        setResetLoading(false);
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setResetInfo(
        "Password reset email sent! Make sure to check your spam folder."
      );
    } catch (e) {
      setResetInfo("Failed to send reset email.");
    }
    setResetLoading(false);
    setTimeout(() => setResetInfo(""), 4000);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.white }]}
    >
      <View style={styles.formContainer}>
        {/* Show error message */}
        {error ? (
          <Text
            style={{
              color: themeColors.red,
              marginBottom: 8,
              textAlign: "center",
              fontFamily: FONTS.PRIMARY,
            }}
          >
            {error}
          </Text>
        ) : null}
        <Text
          style={[
            styles.title,
            {
              color: themeColors.black,
              fontFamily: FONTS.PRIMARY,
              textAlign: "center",
            },
          ]}
        >
          Login
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              borderColor: themeColors.darkGray,
              backgroundColor: themeColors.white,
              color: themeColors.black,
            },
          ]}
          placeholder="Email"
          placeholderTextColor={themeColors.darkGray}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[
            styles.input,
            {
              borderColor: themeColors.darkGray,
              backgroundColor: themeColors.white,
              color: themeColors.black,
            },
          ]}
          placeholder="Password"
          placeholderTextColor={themeColors.darkGray}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {/* Forgot Password link */}
        <TouchableOpacity
          style={{ alignSelf: "flex-end", marginBottom: 8 }}
          onPress={handleForgotPassword}
          disabled={resetLoading}
        >
          <Text
            style={{
              color: themeColors.purple,
              fontFamily: FONTS.PRIMARY,
              fontSize: 14,
            }}
          >
            {"Forgot Password?"}
          </Text>
        </TouchableOpacity>
        {/* Show info message */}
        {resetInfo ? (
          <Text
            style={{
              color: themeColors.purple,
              fontFamily: FONTS.PRIMARY,
              fontSize: 14,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {resetInfo}
          </Text>
        ) : null}
        {/* Buttons side by side */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 8,
            justifyContent: "center",
          }}
        >
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: themeColors.purple,
                flex: 0.375,
                marginVertical: 0,
                marginTop: 0,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
            onPress={handleLogin}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color: themeColors.white,
                  textAlign: "center",
                  textAlignVertical: "center",
                },
              ]}
            >
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: themeColors.white,
                flex: 0.375,
                marginVertical: 0,
                marginTop: 0,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
            onPress={handleSignUp}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color: themeColors.purple,
                  textAlign: "center",
                  textAlignVertical: "center",
                },
              ]}
            >
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 32,
    fontFamily: FONTS.PRIMARY,
  },
  formContainer: {
    width: "100%",
    paddingHorizontal: 24, // Add padding around the form elements
    paddingTop: 120,
  },
  input: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontFamily: FONTS.PRIMARY,
  },
  button: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 16,
    fontFamily: FONTS.PRIMARY,
  },
  secondaryButton: {
    marginTop: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "bold",
    fontSize: 16,
    fontFamily: FONTS.PRIMARY,
  },
});
