import * as Notifications from "expo-notifications";
import { navigationRef } from "../App";

// Handle notification taps
export const handleNotificationResponse = (response) => {
  const data = response.notification.request.content.data;

  if (data.type === "group_message") {
    // Navigate to the group chat
    if (navigationRef.current) {
      navigationRef.current.navigate("GroupDetail", {
        groupId: data.groupId,
      });
    }
  }
};

// Set up notification response listener
export const setupNotificationResponseListener = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse
  );

  return subscription;
};

// Handle notification received while app is in foreground
export const handleNotificationReceived = (notification) => {
  console.log("Notification received:", notification);
  // You can add custom logic here for foreground notifications
};
