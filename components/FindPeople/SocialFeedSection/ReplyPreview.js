import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { X } from "phosphor-react-native";

export default function ReplyPreview({
  replyToPost,
  setReplyToPost,
  themeColors,
}) {
  if (!replyToPost) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: themeColors.lightGray,
        borderLeftWidth: 3,
        borderLeftColor: themeColors.purple,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginBottom: 8,
        borderRadius: 8,
        width: "100%",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: themeColors.purple,
            fontWeight: "bold",
            fontSize: 13,
            fontFamily: "CarosSoft",
          }}
          numberOfLines={1}
        >
          Replying to {replyToPost.userName}
        </Text>
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 12,
            fontFamily: "CarosSoft",
          }}
          numberOfLines={1}
        >
          {replyToPost.message}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => setReplyToPost(null)}
        style={{
          marginLeft: 8,
          padding: 4,
          alignItems: "center",
          justifyContent: "center",
        }}
        accessibilityLabel="Cancel reply"
      >
        <X size={20} color={themeColors.purple} weight="bold" />
      </TouchableOpacity>
    </View>
  );
}
