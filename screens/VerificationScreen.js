import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { auth } from "../firebaseConfig";

export default function VerificationScreen({ navigation }) {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      setChecking(true);
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          clearInterval(interval);
          navigation.reset({
            index: 0,
            routes: [{ name: "Home" }], // or your main screen
          });
        }
      }
      setChecking(false);
    }, 3000); // check every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.text}>
        A verification email has been sent to your address. Please check your inbox and click the link to verify your email.
      </Text>
      <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 24 }} animating={checking} />
      <Text style={styles.text}>Waiting for verification...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  text: { fontSize: 16, textAlign: "center", marginBottom: 8 },
});