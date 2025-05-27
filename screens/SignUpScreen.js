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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db } from "../firebaseConfig"; // Import Firestore
import { doc, setDoc } from "firebase/firestore"; // Import Firestore functions
import { colors } from "../constants/colors";
import { auth } from "../firebaseConfig"; // Import the initialized auth

export default function SignUpScreen({ navigation }) {
  const [firstName, setFirstName] = useState(""); // Add state for first name
  const [lastName, setLastName] = useState(""); // Add state for last name
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [major, setMajor] = useState("");
  const [gradYear, setGradYear] = useState("");

  const handleSignUp = async () => {
    if (!email.endsWith("@uw.edu")) {
      console.error("Only uw.edu emails are allowed");
      return;
    }

    if (password !== confirmPassword) {
      console.error("Passwords do not match");
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
        major,
        gradYear,
      });

      // Navigate to Home on successful sign-up
      navigation.navigate("Home");
    } catch (error) {
      console.error(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor={colors.darkGray}
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor={colors.darkGray}
          value={lastName}
          onChangeText={setLastName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.darkGray}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Major"
          placeholderTextColor={colors.darkGray}
          value={major}
          onChangeText={setMajor}
        />
        <TextInput
          style={styles.input}
          placeholder="Graduation Year"
          placeholderTextColor={colors.darkGray}
          value={gradYear}
          onChangeText={setGradYear}
          keyboardType="numeric" // Ensure numeric input
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.darkGray}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={colors.darkGray}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity style={styles.button} onPress={handleSignUp}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.secondaryButtonText}>Back to Login</Text>
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
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.purple,
    marginBottom: 32,
  },
  formContainer: {
    width: "100%",
    paddingHorizontal: 24,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.darkGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: colors.white,
    color: colors.black,
  },
  button: {
    width: "100%",
    padding: 16,
    backgroundColor: colors.purple,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  profilePictureButton: {
    padding: 12,
    backgroundColor: colors.purple,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  profilePictureButtonText: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  profilePicturePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.purple,
  },
  secondaryButton: {
    marginTop: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.purple,
    fontWeight: "bold",
    fontSize: 16,
  },
});
