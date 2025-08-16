import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.token = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Set up Android notification channel
      if (Platform.OS === "android") {
        await this.setupAndroidChannel();
      }

      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return;
      }

      // Get Expo push token instead of FCM token
      this.token = await this.getExpoPushToken();

      this.isInitialized = true;
      console.log("Notification service initialized successfully");
    } catch (error) {
      console.error("Error initializing notification service:", error);
    }
  }

  async setupAndroidChannel() {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("group_messages", {
        name: "Study Group Messages",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      });
    }
  }

  async getExpoPushToken() {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: "4fa00c32-f3ed-4ef5-ad72-b04ec4e10589", // Your Expo project ID
      });

      if (token) {
        console.log("Expo Push Token:", token.data);
        return token.data;
      } else {
        console.log("No Expo push token available");
      }
    } catch (error) {
      console.error("Error getting Expo push token:", error);
    }
    return null;
  }

  async saveTokenToFirestore(userId) {
    if (!this.token || !userId) return;

    try {
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          fcmToken: this.token,
          lastTokenUpdate: new Date(),
        },
        { merge: true }
      );

      console.log("FCM token saved to Firestore");
    } catch (error) {
      console.error("Error saving FCM token to Firestore:", error);
    }
  }

  async getTokenFromFirestore(userId) {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        return userDoc.data().fcmToken;
      }
    } catch (error) {
      console.error("Error getting FCM token from Firestore:", error);
    }
    return null;
  }

  async refreshToken() {
    this.token = await this.getExpoPushToken();
    return this.token;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
