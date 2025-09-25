import React, { useState } from "react";
import { FONTS } from "../../constants/fonts";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Animated,
  Modal,
} from "react-native";
import {
  PaperPlaneRight,
  X,
  Plus,
  ListChecks,
  ChartBar,
  MapPin,
} from "phosphor-react-native";

export default function GroupInputBar({
  input,
  setInput,
  sending,
  handleSend,
  replyToMessage,
  setReplyToMessage,
  getUserName,
  themeColors,
  onShowPollModal, // <-- add
  onShowTaskModal, // <-- add
  onShowShareNookModal, // <-- add
}) {
  const [showChooseModal, setShowChooseModal] = useState(false);

  const isPollCommand = input.trim() === "/poll";
  const isTaskCommand = input.trim() === "/task";

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
                fontFamily: FONTS.PRIMARY,
              }}
              numberOfLines={1}
            >
              Replying to {getUserName(replyToMessage.uid)}
            </Text>
            <Text
              style={{
                color: themeColors.darkGray,
                fontSize: 12,
                fontFamily: FONTS.PRIMARY,
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
            <X size={18} color={themeColors.purple} />
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
            paddingVertical: 10,
            fontSize: 15,
            maxHeight: 100,
            color: themeColors.black,
            fontFamily: FONTS.PRIMARY,
            marginRight: 8,
            backgroundColor: themeColors.white,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
          }}
          editable={!sending}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          maxLength={200}
        />
        {/* Show poll button with text if input is exactly "/poll" */}
        {isPollCommand && (
          <TouchableOpacity
            onPress={() => {
              onShowPollModal?.();
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
                fontFamily: FONTS.PRIMARY,
                fontSize: 14,
              }}
            >
              Create Poll
            </Text>
          </TouchableOpacity>
        )}
        {/* Show task button with text if input is exactly "/task" */}
        {isTaskCommand && (
          <TouchableOpacity
            onPress={() => {
              onShowTaskModal?.();
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
            accessibilityLabel="Create Task"
          >
            <Text
              style={{
                color: themeColors.white,
                fontWeight: "bold",
                fontFamily: FONTS.PRIMARY,
                fontSize: 14,
              }}
            >
              Create Task
            </Text>
          </TouchableOpacity>
        )}
        {/* Always show a sleek plus icon button */}
        <TouchableOpacity
          onPress={() => setShowChooseModal(true)}
          style={{
            backgroundColor: themeColors.lightGray,
            borderRadius: 16,
            padding: 6,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Create Poll or Task"
        >
          <Plus size={22} color={themeColors.purple} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !input.trim() || isPollCommand || isTaskCommand}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Send"
        >
          <PaperPlaneRight
            size={22}
            color={
              sending || !input.trim() || isPollCommand || isTaskCommand
                ? themeColors.darkGray
                : themeColors.purple
            }
          />
        </TouchableOpacity>
      </View>
      {/* --- Choose Modal --- */}
      <Modal
        visible={showChooseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChooseModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPressOut={() => setShowChooseModal(false)}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 24,
              width: "80%",
              maxWidth: 340,
              alignItems: "center",
              borderWidth: 1,
              borderColor: themeColors.black,
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            onStartShouldSetResponder={() => true}
          >
            {/* Close X button */}
            <TouchableOpacity
              onPress={() => setShowChooseModal(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 2,
                padding: 4,
              }}
              accessibilityLabel="Close create menu"
            >
              <X size={22} color={themeColors.purple} />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 12,
                fontFamily: FONTS.PRIMARY,
              }}
            >
              Create...
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowChooseModal(false);
                setTimeout(() => onShowPollModal?.(), 100);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                marginBottom: 12,
                width: "100%",
                justifyContent: "center",
              }}
            >
              <ChartBar
                size={22}
                color={themeColors.white}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                  fontSize: 16,
                }}
              >
                Poll
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowChooseModal(false);
                setTimeout(() => onShowTaskModal?.(), 100);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                width: "100%",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <ListChecks
                size={22}
                color={themeColors.white}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                  fontSize: 16,
                }}
              >
                Task
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowChooseModal(false);
                setTimeout(() => onShowShareNookModal?.(), 100);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                width: "100%",
                justifyContent: "center",
              }}
            >
              <MapPin
                size={22}
                color={themeColors.white}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                  fontSize: 16,
                }}
              >
                Share Nook
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
