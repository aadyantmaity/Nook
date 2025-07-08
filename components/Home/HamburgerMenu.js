import React, { useEffect, useState } from "react";
import { Modal, View, TouchableOpacity, Text } from "react-native";
import { onSnapshot, doc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

export default function HamburgerMenu({
  isOpen,
  onClose,
  onThemeToggle,
  onProfilePress,
  isDarkMode,
  themeColors,
}) {
  // --- Add state for profile picture ---
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (userDoc) => {
      if (userDoc.exists()) {
        setProfilePic(userDoc.data().profilePic || null);
      }
    });
    return () => unsub();
  }, [isOpen]);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          zIndex: 999,
          paddingHorizontal: 16,
        }}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View
          style={{
            position: "absolute",
            top: 60,
            right: 16,
            backgroundColor: themeColors.white,
            borderRadius: 12,
            paddingVertical: 8,
            paddingHorizontal: 0,
            minWidth: 180,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 20,
            zIndex: 1000,
          }}
          onStartShouldSetResponder={() => true}
        >
          <View
            style={{
              height: 1,
              backgroundColor: themeColors.lightGrayBorder || "#eee",
              marginHorizontal: 10,
            }}
          />
          {/* No changes needed here for suggestion/report button. */}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
