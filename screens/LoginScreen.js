import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth"; // Import Firebase Auth
import { colors } from "../constants/colors";
import { auth } from "../firebaseConfig"; // Import the initialized auth

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!email.endsWith("@uw.edu")) {
      console.error("Only uw.edu emails are allowed");
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Navigation is handled by auth state in App.js, so no manual navigation here
      })
      .catch((error) => {
        console.error(error.message);
      });
  };

  const handleSignUp = () => {
    // Navigate to the Sign Up screen
    navigation.navigate("SignUp");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.darkGray}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.darkGray}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSignUp}>
          <Text style={styles.secondaryButtonText}>Sign Up</Text>
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
    paddingHorizontal: 24, // Add padding around the form elements
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.gray,
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
