import React from "react";
import { Modal, TouchableOpacity, View, Text } from "react-native";
import { Star, SignOut, Trash, Info } from "phosphor-react-native";

export default function GroupMenuModal({
  visible,
  onClose,
  group,
  themeColors,
  auth,
  setShowShareModal,
  setShowStarredModal,
  setShowMembersModal,
  fetchMembersList,
  handleLeaveGroup,
  handleDeleteGroup,
  navigation, // <-- add this line
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.2)",
          justifyContent: "flex-start",
          alignItems: "flex-end",
        }}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 12,
            marginTop: 54,
            marginRight: 12,
            minWidth: 180,
            paddingVertical: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            borderColor: themeColors.black,
            borderWidth: 0.5,
            elevation: 5,
          }}
        >
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 14,
              paddingHorizontal: 18,
            }}
            onPress={() => {
              onClose?.();
              navigation.navigate("GroupDetails", { groupId: group?.id });
            }}
          >
            <Info
              size={20}
              color={themeColors.purple}
              style={{ marginRight: 10 }}
            />
            <Text
              style={{
                color: themeColors.purple,
                fontFamily: "CarosSoft",
                fontSize: 16,
                fontWeight: "bold",
              }}
            >
              Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              onClose();
              handleLeaveGroup();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
          >
            <SignOut
              size={20}
              color={themeColors.red}
              weight="bold"
              style={{ marginRight: 10 }}
            />
            <Text
              style={{
                color: themeColors.red,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
                fontSize: 15,
              }}
            >
              Leave
            </Text>
          </TouchableOpacity>
          {group?.createdBy === auth.currentUser?.uid && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                handleDeleteGroup();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 18,
              }}
            >
              <Trash
                size={20}
                color={themeColors.red}
                weight="bold"
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  color: themeColors.red,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                  fontSize: 15,
                }}
              >
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
