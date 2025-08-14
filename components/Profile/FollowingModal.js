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
import { UserMinus } from "phosphor-react-native";
import CircleLoader from "../common/CircleLoader";
import { FONTS } from "../../constants/fonts";

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
  currentUserFollowing, // Add this prop to check if current user follows them
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
            Following
          </Text>
          {listLoading ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <CircleLoader
                themeColors={themeColors}
                text="Loading following..."
              />
            </View>
          ) : (
            <FlatList
              data={userList}
              showsVerticalScrollIndicator={false}
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
                  <ProfilePicture
                    profilePic={item.profilePic}
                    themeColors={themeColors}
                    size={29} // if your component supports a size prop
                    style={{ marginRight: 12 }} // if your component supports style
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
                        // Check if current user follows this person (they are in current user's following list)
                        const isFriend =
                          currentUserFollowing &&
                          currentUserFollowing.includes(item.uid);

                        if (isFriend) {
                          // Show confirmation for unfollowing a friend
                          Alert.alert(
                            "Unfollow Friend",
                            "Are you sure you want to unfollow this friend?",
                            [
                              {
                                text: "Cancel",
                                style: "cancel",
                              },
                              {
                                text: "Unfollow",
                                style: "destructive",
                                onPress: () =>
                                  handleUnfollowFromModal(item.uid),
                              },
                            ]
                          );
                        } else {
                          // Direct unfollow for non-friends
                          handleUnfollowFromModal(item.uid);
                        }
                      }}
                      disabled={unfollowingUid === item.uid}
                      style={{
                        marginLeft: 12,
                        backgroundColor:
                          currentUserFollowing &&
                          currentUserFollowing.includes(item.uid)
                            ? themeColors.purple
                            : themeColors.red,
                        borderRadius: 6,
                        paddingVertical: 6,
                        paddingHorizontal: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                      }}
                    >
                      {currentUserFollowing &&
                      currentUserFollowing.includes(item.uid) ? (
                        // Show "Friends" for people the current user follows
                        <Text
                          style={{
                            color: themeColors.white,
                            fontWeight: "bold",
                            fontSize: 14,
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          Friends
                        </Text>
                      ) : (
                        // Show "Following" for non-friends (no icon)
                        <Text
                          style={{
                            color:
                              unfollowingUid === item.uid
                                ? themeColors.darkGray
                                : themeColors.white,
                            fontWeight: "bold",
                            fontSize: 14,
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          Following
                        </Text>
                      )}
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
