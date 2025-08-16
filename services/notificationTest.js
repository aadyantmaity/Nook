import * as Notifications from "expo-notifications";
import notificationService from "./notifications";

// Test function to verify notification system
export const testNotificationSystem = async () => {
  try {
    console.log("Testing notification system...");

    // Check if notification service is initialized
    if (!notificationService.isInitialized) {
      console.log("Initializing notification service...");
      await notificationService.initialize();
    }

    // Test local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a test notification from Nook",
        data: { type: "test" },
      },
      trigger: null, // Show immediately
    });

    console.log("Test notification sent successfully");
    return true;
  } catch (error) {
    console.error("Error testing notification system:", error);
    return false;
  }
};

// Test function to verify FCM token
export const testFCMToken = async () => {
  try {
    console.log("Testing FCM token...");

    if (!notificationService.isInitialized) {
      await notificationService.initialize();
    }

    const token = notificationService.token;
    if (token) {
      console.log("FCM Token is available:", token.substring(0, 20) + "...");
      return true;
    } else {
      console.log("No FCM token available");
      return false;
    }
  } catch (error) {
    console.error("Error testing FCM token:", error);
    return false;
  }
};
