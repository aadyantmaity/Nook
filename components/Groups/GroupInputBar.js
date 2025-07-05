import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Animated,
} from "react-native";
import { PaperPlaneRight, X } from "phosphor-react-native";

export default function GroupInputBar({
  input,
  setInput,
  sending,
  handleSend,
  replyToMessage,
  setReplyToMessage,
  getUserName,
  themeColors,
}) {
  return (
    <View style={{ backgroundColor: themeColors.white }}>
      {replyToMessage && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: themeColors.lightGray,
            borderLeftWidth: 3,
            borderLeftColor: themeColors.purple,
            paddingVertical: 6,
            paddingHorizontal: 12,
            marginHorizontal: 12,
            marginBottom: 2,
            borderRadius: 8,
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
              Replying to {getUserName(replyToMessage.uid)}
            </Text>
            <Text
              style={{
                color: themeColors.darkGray,
                fontSize: 12,
                fontFamily: "CarosSoft",
              }}
              numberOfLines={1}
            >
              {replyToMessage.text}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setReplyToMessage(null)}
            style={{
              marginLeft: 8,
              padding: 4,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Cancel reply"
          >
            <X size={18} color={themeColors.purple} weight="bold" />
          </TouchableOpacity>
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={
            replyToMessage
              ? `Replying to ${getUserName(replyToMessage.uid)}...`
              : "Type a message..."
          }
          placeholderTextColor={themeColors.darkGray}
          style={{
            flex: 1,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            fontSize: 16,
            maxHeight: 100,
            color: themeColors.black,
            fontFamily: "CarosSoft",
            marginRight: 8,
            backgroundColor: themeColors.lightGray,
          }}
          editable={!sending}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          multiline={true}
          maxLength={200}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !input.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Send"
        >
          <PaperPlaneRight size={22} color={themeColors.purple} weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
