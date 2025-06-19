import React from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";

export default function FollowingModal({
  visible,
  onClose,
  userList,
  listLoading,
  navigation,
  themeColors,
  isOwnProfile,
  handleUnfollowFromModal,
  unfollowingUid,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 12,
            padding: 18,
            width: "85%",
            maxHeight: "70%",
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 18,
              color: themeColors.purple,
              marginBottom: 8,
              fontFamily: "CarosSoft",
            }}
          >
            Following
          </Text>
          {listLoading ? (
            <ActivityIndicator color={themeColors.purple} />
          ) : (
            <FlatList
              data={userList}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      navigation.push("Profile", { uid: item.uid });
                    }}
                    style={{ flex: 1 }}
                  >
                    <Text
                      style={{
                        color: themeColors.black,
                        fontSize: 16,
                        fontFamily: "CarosSoft",
                      }}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                  {isOwnProfile && (
                    <TouchableOpacity
                      onPress={() => handleUnfollowFromModal(item.uid)}
                      disabled={unfollowingUid === item.uid}
                      style={{
                        marginLeft: 12,
                        backgroundColor: themeColors.red,
                        borderRadius: 6,
                        paddingVertical: 6,
                        paddingHorizontal: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: unfollowingUid === item.uid ? 0.6 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: themeColors.white,
                          fontWeight: "bold",
                          fontSize: 14,
                          fontFamily: "CarosSoft",
                        }}
                      >
                        {unfollowingUid === item.uid
                          ? "Unfollowing..."
                          : "Unfollow"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 12,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingVertical: 10,
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
