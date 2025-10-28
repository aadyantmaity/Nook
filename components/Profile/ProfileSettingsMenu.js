import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  PencilSimple,
  ShareNetwork,
  Sun,
  Moon,
  Flag,
  User,
  SignOut,
  Trash,
} from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

export default function ProfileSettingsMenu({
  visible,
  onClose,
  themeColors,
  isDarkMode,
  // Handlers
  onEditProfile,
  onShareProfile,
  onToggleTheme,
  onReportIssue,
  onResetPassword,
  onLogout,
  onDeleteAccount,
  // Visibility flags
  showEditProfile = true,
  showShareProfile = true,
  showThemeToggle = true,
  showReportIssue = true,
  showResetPassword = true,
  showLogout = true,
  showDeleteAccount = true,
  // Positioning tweaks for different screens
  containerStyle,
}) {
  if (!visible) return null;

  return (
    <TouchableOpacity
      style={
        containerStyle || {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          justifyContent: "flex-start",
          alignItems: "flex-end",
        }
      }
      activeOpacity={1}
      onPressOut={onClose}
    >
      <View
        style={{
          marginTop: 54 + 24,
          marginRight: 18,
          backgroundColor: themeColors.white,
          borderRadius: 12,
          minWidth: 180,
          elevation: 8,
          borderWidth: 1,
          borderColor: themeColors.gray,
          shadowColor: themeColors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          paddingVertical: 4,
        }}
        onStartShouldSetResponder={() => true}
      >
        {showEditProfile && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
            onPress={onEditProfile}
          >
            <PencilSimple
              size={20}
              color={themeColors.purple}
              style={{ marginRight: 10 }}
            />
            <Text
              style={{
                color: themeColors.purple,
                fontFamily: FONTS.PRIMARY,
                fontSize: 16,
              }}
            >
              Edit Profile
            </Text>
          </TouchableOpacity>
        )}

        {showShareProfile && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
            onPress={onShareProfile}
          >
            <ShareNetwork
              size={20}
              color={themeColors.purple}
              style={{ marginRight: 10 }}
            />
            <Text
              style={{
                color: themeColors.purple,
                fontFamily: FONTS.PRIMARY,
                fontSize: 16,
              }}
            >
              Share Profile
            </Text>
          </TouchableOpacity>
        )}

        {showThemeToggle && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
            onPress={onToggleTheme}
          >
            {isDarkMode ? (
              <Sun size={20} color={themeColors.purple} style={{ marginRight: 10 }} />
            ) : (
              <Moon size={20} color={themeColors.purple} style={{ marginRight: 10 }} />
            )}
            <Text
              style={{
                color: themeColors.purple,
                fontFamily: FONTS.PRIMARY,
                fontSize: 16,
              }}
            >
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </Text>
          </TouchableOpacity>
        )}

        {showReportIssue && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
            onPress={onReportIssue}
          >
            <Flag size={20} color={themeColors.purple} style={{ marginRight: 10 }} />
            <Text
              style={{
                color: themeColors.purple,
                fontFamily: FONTS.PRIMARY,
                fontSize: 16,
              }}
            >
              Report Issue
            </Text>
          </TouchableOpacity>
        )}

        {showResetPassword && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
            onPress={onResetPassword}
          >
            <User size={20} color={themeColors.purple} style={{ marginRight: 10 }} />
            <Text
              style={{
                color: themeColors.purple,
                fontFamily: FONTS.PRIMARY,
                fontSize: 16,
              }}
            >
              Reset Password
            </Text>
          </TouchableOpacity>
        )}

        {showLogout && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
            onPress={onLogout}
          >
            <SignOut size={20} color={themeColors.red} style={{ marginRight: 10 }} />
            <Text
              style={{
                color: themeColors.red,
                fontFamily: FONTS.PRIMARY,
                fontSize: 16,
              }}
            >
              Log Out
            </Text>
          </TouchableOpacity>
        )}

        {showDeleteAccount && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
            onPress={onDeleteAccount}
          >
            <Trash size={20} color={themeColors.red} style={{ marginRight: 10 }} />
            <Text
              style={{
                color: themeColors.red,
                fontFamily: FONTS.PRIMARY,
                fontSize: 16,
              }}
            >
              Delete Account
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}


