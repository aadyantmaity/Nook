import React from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import ProfilePicture from "../Profile/ProfilePicture";
import CircleLoader from "../common/CircleLoader";
import { FONTS } from "../../constants/fonts";

export default function FollowersModal({
  visible,
  onClose,
  userList,
  listLoading,
  navigation,
  themeColors,
  isOwnProfile,
  handleRemoveFollower,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 12,
            padding: 18,
            width: "85%",
            maxHeight: "70%",
            borderWidth: 1,
            borderColor: themeColors.black,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 18,
              color: themeColors.purple,
              marginBottom: 8,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Followers
          </Text>
          {listLoading ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <CircleLoader
                themeColors={themeColors}
                text="Loading followers..."
              />
            </View>
          ) : (
            <FlatList
              data={userList}
              keyExtractor={(item) => item.uid}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                  }}
                >
                  <ProfilePicture
                    profilePic={item.profilePic}
                    themeColors={themeColors}
                    size={29}
                    style={{ marginRight: 12 }}
                  />

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
                        fontFamily: FONTS.PRIMARY,
                        marginLeft: 8,
                      }}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                  {isOwnProfile && (
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          "Remove Follower",
                          "Are you sure you want to remove this follower?",
                          [
                            {
                              text: "Cancel",
                              style: "cancel",
                            },
                            {
                              text: "Remove",
                              style: "destructive",
                              onPress: () => handleRemoveFollower(item.uid),
                            },
                          ]
                        );
                      }}
                      style={{
                        marginLeft: 12,
                        backgroundColor: themeColors.red,
                        borderRadius: 6,
                        paddingVertical: 6,
                        paddingHorizontal: 14,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: themeColors.white,
                          fontWeight: "bold",
                          fontFamily: FONTS.PRIMARY,
                          fontSize: 13,
                        }}
                      >
                        Remove
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
                fontFamily: FONTS.PRIMARY,
              }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
