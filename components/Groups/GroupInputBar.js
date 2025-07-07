import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Animated,
} from "react-native";
import { PaperPlaneRight, X, Plus } from "phosphor-react-native";
import PollModal from "./PollModal";

export default function GroupInputBar({
  input,
  setInput, // now this is handleInputChange
  sending,
  handleSend,
  replyToMessage,
  setReplyToMessage,
  getUserName,
  themeColors,
  onSendPoll, // <-- add this prop
}) {
  // --- Poll modal state ---
  const [showPollModal, setShowPollModal] = useState(false);

  // --- New: Only show poll button if input is /poll ---
  const isPollCommand = input.trim() === "/poll";

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
          onChangeText={setInput} // now triggers mention logic
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
          maxLength={200}
        />
        {/* Always show a sleek poll icon button */}
        <TouchableOpacity
          onPress={() => {
            setShowPollModal(true);
            if (input.trim() === "/poll") setInput(""); // clear input if /poll
          }}
          style={{
            backgroundColor: themeColors.lightGray,
            borderRadius: 16,
            padding: 6,
            alignItems: "center",
            justifyContent: "center",
            opacity: isPollCommand ? 0.5 : 1, // subtle fade if /poll is typed
          }}
          accessibilityLabel="Create Poll"
          disabled={isPollCommand}
        >
          <Plus size={22} color={themeColors.purple} weight="bold" />
        </TouchableOpacity>
        {/* Show poll button with text if input is exactly "/poll" */}
        {isPollCommand && (
          <TouchableOpacity
            onPress={() => {
              setShowPollModal(true);
              setInput(""); // clear input after opening modal
            }}
            style={{
              marginRight: 8,
              backgroundColor: themeColors.purple,
              borderRadius: 20,
              paddingVertical: 8,
              paddingHorizontal: 16,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Create Poll"
          >
            <Text
              style={{
                color: themeColors.white,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
                fontSize: 14,
              }}
            >
              Create Poll
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !input.trim() || isPollCommand}
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
      <PollModal
        visible={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSubmit={onSendPoll}
        themeColors={themeColors}
      />
    </View>
  );
}
