import React from "react";
import { Modal, View, TouchableOpacity, Text } from "react-native";
import {
  ExclamationMark,
  Sun,
  Moon,
  User,
  UserPlus,
} from "phosphor-react-native";

export default function HamburgerMenu({
  isOpen,
  onClose,
  onReportPress,
  onThemeToggle,
  onProfilePress,
  isDarkMode,
  themeColors,
  onAddFriend,
}) {
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
        >
          {/* Profile */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              setTimeout(onProfilePress, 150);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 20,
            }}
          >
            <User size={20} color={themeColors.purple} weight="bold" />
            <Text
              style={{
                marginLeft: 12,
                color: themeColors.purple,
                fontWeight: "bold",
                fontSize: 16,
                fontFamily: "CarosSoft",
              }}
            >
              Profile
            </Text>
          </TouchableOpacity>
          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: themeColors.lightGrayBorder || "#eee",
              marginHorizontal: 10,
            }}
          />
          {/* Add Friend */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              setTimeout(onAddFriend, 150);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 20,
            }}
          >
            <UserPlus size={20} color={themeColors.purple} weight="bold" />
            <Text
              style={{
                marginLeft: 12,
                color: themeColors.purple,
                fontWeight: "bold",
                fontSize: 16,
                fontFamily: "CarosSoft",
              }}
            >
              Add Friend
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: themeColors.lightGrayBorder || "#eee",
              marginHorizontal: 10,
            }}
          />
          {/* Report */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              setTimeout(onReportPress, 150);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 20,
            }}
          >
            <ExclamationMark
              size={22}
              color={themeColors.purple}
              weight="bold"
            />
            <Text
              style={{
                marginLeft: 12,
                color: themeColors.purple,
                fontWeight: "bold",
                fontSize: 16,
                fontFamily: "CarosSoft",
              }}
            >
              Suggestion / Report
            </Text>
          </TouchableOpacity>
          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: themeColors.lightGrayBorder || "#eee",
              marginHorizontal: 10,
            }}
          />
          {/* Theme toggle */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              setTimeout(onThemeToggle, 150);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 20,
            }}
          >
            {isDarkMode ? (
              <Sun size={22} color={themeColors.purple} weight="bold" />
            ) : (
              <Moon size={22} color={themeColors.purple} weight="bold" />
            )}
            <Text
              style={{
                marginLeft: 12,
                color: themeColors.purple,
                fontWeight: "bold",
                fontSize: 16,
                fontFamily: "CarosSoft",
              }}
            >
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
