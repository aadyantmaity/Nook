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
import { auth } from "../firebaseConfig"; // Import the initialized auth

export default function LoginScreen({ navigation }) {
  const themeColors = colors;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetInfo, setResetInfo] = useState(""); // Info message for reset
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {})
      .catch((error) => {
        console.error(error.message);
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
      setResetInfo("Password reset email sent!");
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
      <Text
        style={[
          styles.title,
          { color: themeColors.black, fontFamily: "CarosSoft" },
        ]}
      >
        Login
      </Text>
      <View style={styles.formContainer}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: themeColors.gray,
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
              borderColor: themeColors.gray,
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
              fontFamily: "CarosSoft",
              fontSize: 14,
              textDecorationLine: "underline",
              opacity: resetLoading ? 0.7 : 1,
            }}
          >
            {resetLoading ? "Sending..." : "Forgot Password?"}
          </Text>
        </TouchableOpacity>
        {/* Show info message */}
        {resetInfo ? (
          <Text
            style={{
              color: themeColors.purple,
              fontFamily: "CarosSoft",
              fontSize: 14,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {resetInfo}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.purple }]}
          onPress={handleLogin}
        >
          <Text
            style={[
              styles.buttonText,
              { color: themeColors.white, fontFamily: "CarosSoft" },
            ]}
          >
            {/* Use black for button text */}
            Login
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSignUp}>
          <Text
            style={[
              styles.secondaryButtonText,
              { color: themeColors.purple, fontFamily: "CarosSoft" },
            ]}
          >
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 32,
    fontFamily: "CarosSoft",
  },
  formContainer: {
    width: "100%",
    paddingHorizontal: 24, // Add padding around the form elements
  },
  input: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontFamily: "CarosSoft",
  },
  button: {
    width: "100%",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 16,
    fontFamily: "CarosSoft",
  },
  secondaryButton: {
    marginTop: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "bold",
    fontSize: 16,
    fontFamily: "CarosSoft",
  },
});
