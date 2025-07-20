import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Image,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { db } from "../firebaseConfig"; // Import Firestore
import { doc, setDoc } from "firebase/firestore"; // Import Firestore functions
import { colors } from "../constants/colors";
import { auth } from "../firebaseConfig"; // Import the initialized auth

export default function SignUpScreen({ navigation }) {
  const themeColors = colors;

  const [firstName, setFirstName] = useState(""); // Add state for first name
  const [lastName, setLastName] = useState(""); // Add state for last name
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [error, setError] = useState(""); // Add error state
  const [info, setInfo] = useState(""); // Info message (for verification)

  const getFriendlyError = (error) => {
    if (!error?.code) return "An unexpected error occurred. Please try again.";
    switch (error.code) {
      case "auth/email-already-in-use":
        return "This email is already in use. Try logging in.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/missing-password":
        return "Please enter a password.";
      default:
        return error.message || "An error occurred. Please try again.";
    }
  };

  const handleSignUp = async () => {
    setError("");
    setInfo("");
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Save additional user info to Firestore
      await setDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        email,
        gradYear,
        profilePic: null,
        followers: [],
        following: [],
        requireEmailVerification: true, // Add this field
        onboarded: false, // <-- Add this field
        workTimeSetting: 25, // Add default work time setting
        breakTimeSetting: 5, // Add default break time setting
        mapType: "hybrid", // Add default map type
        mapRegion: "UW", // Add default map region
      });

      // Send email verification
      await sendEmailVerification(user);
    } catch (error) {
      setError(getFriendlyError(error));
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.white }]}
    >
      <View style={styles.formContainer}>
        {/* Remove dark mode toggle button */}
        {error ? (
          <Text
            style={{
              color: themeColors.red,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {error}
          </Text>
        ) : null}
        {info ? (
          <Text
            style={{
              color: themeColors.green,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {info}
          </Text>
        ) : null}
        <Text
          style={[
            styles.title,
            {
              color: themeColors.black,
              textAlign: "center",
              fontFamily: "CarosSoft",
            },
          ]}
        >
          Sign Up
        </Text>
        {/* First Name and Last Name side by side */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <TextInput
            style={[
              styles.input,
              {
                flex: 1,
                marginBottom: 0,
                borderColor: themeColors.darkGray,
                backgroundColor: themeColors.white,
                color: themeColors.black,
              },
            ]}
            placeholder="First Name"
            placeholderTextColor={themeColors.darkGray}
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={[
              styles.input,
              {
                flex: 1,
                marginBottom: 0,
                borderColor: themeColors.darkGray,
                backgroundColor: themeColors.white,
                color: themeColors.black,
              },
            ]}
            placeholder="Last Name"
            placeholderTextColor={themeColors.darkGray}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
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
        <TextInput
          style={[
            styles.input,
            {
              borderColor: themeColors.darkGray,
              backgroundColor: themeColors.white,
              color: themeColors.black,
            },
          ]}
          placeholder="Graduation Year"
          placeholderTextColor={themeColors.darkGray}
          value={gradYear}
          onChangeText={setGradYear}
          keyboardType="numeric" // Ensure numeric input
        />

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
            onPress={handleSignUp}
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
              Sign Up
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
            onPress={() => navigation.navigate("Login")}
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
              Login
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
  },
  formContainer: {
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 120,
  },
  input: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontFamily: "CarosSoft",
  },
  button: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "CarosSoft",
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: "CarosSoft",
    fontSize: 16,
  },
});
