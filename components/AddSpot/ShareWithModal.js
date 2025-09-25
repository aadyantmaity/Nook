import React, { useState, useEffect } from "react";
import { FONTS } from "../../constants/fonts";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Check } from "phosphor-react-native";

export default function ShareWithModal({
  visible,
  onClose,
  sharedWith,
  setSharedWith,
  themeColors,
  followingList = [],
  loading = false, // <-- add loading prop
}) {
  // No search, just use followingList as in AddSpotScreen
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",

          shadowOffset: {
            width: 0,
            height: 2
          },

          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4
        }}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 16,
            padding: 24,
            width: "85%",
            maxHeight: "70%",
            alignItems: "center",
            borderWidth: 1,
            borderColor: themeColors.gray + "70",
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 10,
              textAlign: "center",
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Share this Nook with people you follow
          </Text>
          {loading ? (
            <ActivityIndicator color={themeColors.purple} />
          ) : followingList.length === 0 ? (
            <Text
              style={{
                color: themeColors.darkGray,
                fontFamily: FONTS.PRIMARY,
              }}
            >
              You are not following anyone yet.
            </Text>
          ) : (
            <ScrollView style={{ width: "100%" }}>
              {followingList.map((user) => (
                <TouchableOpacity
                  key={user.uid}
                  onPress={() => {
                    setSharedWith((prev) =>
                      prev.includes(user.uid)
                        ? prev.filter((id) => id !== user.uid)
                        : [...prev, user.uid]
                    );
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: themeColors.gray,
                    shadowColor: "#000",

                    shadowOffset: {
                      width: 0,
                      height: 2
                    },

                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1,
                      borderColor: themeColors.purple,
                      backgroundColor: sharedWith.includes(user.uid)
                        ? themeColors.purple
                        : themeColors.white,
                      marginRight: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {sharedWith.includes(user.uid) && (
                      <Check size={14} color={themeColors.white} weight="bold" />
                    )}
                  </View>
                  <Text
                    style={{
                      color: themeColors.black,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {/* Show first name and last initial */}
                    {user.name
                      ? (() => {
                          const parts = user.name.split(" ");
                          const first = parts[0] || "";
                          const lastInitial =
                            parts.length > 1 && parts[1]
                              ? parts[1][0] + "."
                              : "";
                          return `${first} ${lastInitial}`;
                        })()
                      : user.email}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 16,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 24,
              alignItems: "center",
              shadowColor: "#000",

              shadowOffset: {
                width: 0,
                height: 2
              },

              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4
            }}
            disabled={false} // If you want to add a disabled prop, update color below
          >
            <Text
              style={{
                color: false ? themeColors.darkGray : themeColors.white,
                fontWeight: "bold",
                fontFamily: FONTS.PRIMARY,
              }}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
