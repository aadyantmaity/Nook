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

  const handleSignUp = async () => {
    setError("");
    setInfo("");
    if (!email.endsWith("@uw.edu")) {
      setError("Only uw.edu emails are allowed");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
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
      });

      // Send email verification
      await sendEmailVerification(user);
      setInfo("Verification email sent. Please check your inbox.");
      // Optionally, sign out user here to force verification before login
      // await auth.signOut();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.white }]}
    >
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
      <Text style={[styles.title, { color: themeColors.black }]}>Sign Up</Text>
      <View style={styles.formContainer}>
        <TextInput
          style={[
            styles.input,
            {
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
          placeholder="Graduation Year"
          placeholderTextColor={themeColors.darkGray}
          value={gradYear}
          onChangeText={setGradYear}
          keyboardType="numeric" // Ensure numeric input
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
          placeholder="Confirm Password"
          placeholderTextColor={themeColors.darkGray}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.purple }]}
          onPress={handleSignUp}
        >
          <Text style={[styles.buttonText, { color: themeColors.white }]}>
            Sign Up
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text
            style={[styles.secondaryButtonText, { color: themeColors.purple }]}
          >
            Back to Login
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
  },
  formContainer: {
    width: "100%",
    paddingHorizontal: 24,
  },
  input: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
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
  },
  profilePictureButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  profilePictureButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  profilePicturePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 0.5,
  },
  secondaryButton: {
    marginTop: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
});
