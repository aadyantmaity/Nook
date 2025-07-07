import React from "react";
import { View, ScrollView, TouchableOpacity, Image, Text } from "react-native";

export default function MentionPicker({
  visible,
  mentionUsers,
  mentionQuery,
  handleMentionSelect,
  themeColors,
}) {
  if (
    !visible ||
    mentionUsers.filter((u) =>
      u.name.toLowerCase().includes(mentionQuery.toLowerCase())
    ).length === 0
  )
    return null;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 80,
        backgroundColor: themeColors.white,
        zIndex: 1000,
        maxHeight: 220,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: themeColors.lightGray,
        paddingHorizontal: 0,
        overflow: "hidden",
      }}
    >
      <ScrollView
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingVertical: 4,
          paddingHorizontal: 0,
        }}
      >
        {mentionUsers
          .filter((u) =>
            u.name.toLowerCase().includes(mentionQuery.toLowerCase())
          )
          .map((u, idx, arr) => (
            <TouchableOpacity
              key={u.uid}
              onPress={() => handleMentionSelect(u)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 18,
                backgroundColor: themeColors.white,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: themeColors.purple,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  overflow: "hidden",
                }}
              >
                {u.profilePic ? (
                  <Image
                    source={{ uri: u.profilePic }}
                    style={{ width: 32, height: 32, borderRadius: 16 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={{
                      color: themeColors.white,
                      fontWeight: "bold",
                      fontSize: 16,
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <Text
                style={{
                  color: themeColors.purple,
                  fontFamily: "CarosSoft",
                  fontSize: 16,
                  fontWeight: "bold",
                }}
              >
                {u.name}
              </Text>
              {idx !== arr.length - 1 && (
                <View
                  style={{
                    position: "absolute",
                    left: 32 + 18 + 12,
                    right: 18,
                    bottom: 0,
                    height: 0.5,
                    backgroundColor: themeColors.black,
                    opacity: 0.5,
                  }}
                />
              )}
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
}
