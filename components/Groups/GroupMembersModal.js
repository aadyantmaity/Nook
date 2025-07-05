import React from "react";
import { Modal, View, Text, TouchableOpacity, FlatList } from "react-native";

export default function GroupMembersModal({
  visible,
  onClose,
  membersList,
  themeColors,
}) {
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
          backgroundColor: "rgba(0,0,0,0.2)",
          justifyContent: "center",
          alignItems: "center",
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
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              fontFamily: "CarosSoft",
              marginBottom: 12,
            }}
          >
            Group Members
          </Text>
          <FlatList
            data={membersList}
            keyExtractor={(item) => item.uid}
            renderItem={({ item: u }) => (
              <View
                style={{
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: themeColors.gray + "33",
                }}
              >
                <Text
                  style={{
                    color: themeColors.black,
                    fontFamily: "CarosSoft",
                    fontWeight: "bold",
                  }}
                >
                  {u.firstName} {u.lastName}
                </Text>
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontFamily: "CarosSoft",
                    fontSize: 13,
                  }}
                >
                  {u.email}
                </Text>
              </View>
            )}
            style={{ width: "100%" }}
          />
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 16,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 32,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: themeColors.white,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
              }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
