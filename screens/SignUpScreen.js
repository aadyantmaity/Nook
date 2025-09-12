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
import { Eye, EyeSlash } from "phosphor-react-native";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { db } from "../firebaseConfig"; // Import Firestore
import { doc, setDoc, collection, addDoc, deleteDoc } from "firebase/firestore"; // Import Firestore functions
import { colors } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { auth } from "../firebaseConfig"; // Import the initialized auth

export default function SignUpScreen({ navigation }) {
  const themeColors = colors;

  const [firstName, setFirstName] = useState(""); // Add state for first name
  const [lastName, setLastName] = useState(""); // Add state for last name
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

        mapType: "hybrid", // Add default map type
        mapRegion: "UW", // Add default map region
        reflectionsEnabled: true, // Add default reflections setting

        workDuration: 25 * 60, // Add default work duration (25 minutes = 1500 seconds)
        breakDuration: 5 * 60, // Add default break duration (5 minutes = 300 seconds)
      });

      // Create recentActivity subcollection for the new user
      // We'll add a placeholder document and then delete it to ensure the subcollection exists
      const recentActivityRef = collection(db, "users", user.uid, "recentActivity");
      const placeholderDoc = await addDoc(recentActivityRef, {
        _created: new Date(),
        _placeholder: true
      });
      
      // Delete the placeholder document to keep the subcollection empty
      await deleteDoc(doc(db, "users", user.uid, "recentActivity", placeholderDoc.id));

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
              fontFamily: FONTS.PRIMARY,
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
          keyboardType="numeric"
          onSubmitEditing={handleSignUp}
          blurOnSubmit={true}
        />

        {/* Primary Action Button - Full Width */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: themeColors.purple,
              marginTop: 12,
            },
          ]}
          onPress={handleSignUp}
        >
          <Text
            style={[
              styles.primaryButtonText,
              {
                color: themeColors.white,
              },
            ]}
          >
            Create Account
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
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text
              style={[
                styles.secondaryActionLink,
                {
                  color: themeColors.purple,
                },
              ]}
            >
              Sign In
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
    paddingHorizontal: 24,
    paddingTop: 90,
  },
  input: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontFamily: FONTS.PRIMARY,
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 12,
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
    shadowColor: "#000",
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
