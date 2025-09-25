import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { Eye, EyeSlash } from "phosphor-react-native";
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
  const [showPassword, setShowPassword] = useState(false);
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
        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.passwordInput,
              {
                borderColor: themeColors.darkGray,
                backgroundColor: themeColors.white,
                color: themeColors.black,
              },
            ]}
            placeholder="Password"
            placeholderTextColor={themeColors.darkGray}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <Eye size={20} color={themeColors.darkGray} />
            ) : (
              <EyeSlash size={20} color={themeColors.darkGray} />
            )}
          </TouchableOpacity>
        </View>
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
        {/* Primary Action Button - Full Width */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: themeColors.purple,
              marginTop: 24,
            },
          ]}
          onPress={handleLogin}
        >
          <Text
            style={[
              styles.primaryButtonText,
              {
                color: themeColors.white,
              },
            ]}
          >
            Sign In
          </Text>
        </TouchableOpacity>

        {/* Secondary Action - Centered */}
        <View style={styles.secondaryActionContainer}>
          <Text
            style={[
              styles.secondaryActionText,
              {
                color: themeColors.darkGray,
              },
            ]}
          >
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text
              style={[
                styles.secondaryActionLink,
                {
                  color: themeColors.purple,
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
    paddingTop: 90,
  },
  input: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontFamily: FONTS.PRIMARY,
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 16,
  },
  passwordInput: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
    paddingRight: 50, // Make room for the eye button
    fontFamily: FONTS.PRIMARY,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -14, // Half of icon size (20) + padding (4) = 14
    padding: 4,
  },
  primaryButton: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryButtonText: {
    fontWeight: "bold",
    fontSize: 18,
    fontFamily: FONTS.PRIMARY,
  },
  secondaryActionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  secondaryActionText: {
    fontSize: 16,
    fontFamily: FONTS.PRIMARY,
  },
  secondaryActionLink: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: FONTS.PRIMARY,
    textDecorationLine: "underline",
  },
});
