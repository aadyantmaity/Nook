import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
} from "react-native";
import ProfilePicture from "../Profile/ProfilePicture";
import { Plus, Minus } from "phosphor-react-native";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

export default function SuggestedPeopleAndGroups({
  suggestedExpanded,
  setSuggestedExpanded,
  fetchFollowing,
  refreshSuggested,
  suggestedWithPics,
  suggestedGroups,
  suggestedLoading,
  suggestedGroupsLoading,
  followingIds,
  followLoading,
  handleFollow,
  navigation,
  themeColors,
  joiningGroups,
  setJoiningGroups,
  user,
}) {
  return (
    <View style={{ width: "100%", marginBottom: 8 }}>
      <TouchableOpacity
        onPress={async () => {
          if (!suggestedExpanded) {
            await fetchFollowing();
            setSuggestedExpanded(true);
            refreshSuggested();
          } else {
            setSuggestedExpanded(false);
          }
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: themeColors.lightGray,
          marginBottom: suggestedExpanded ? 8 : 0,
        }}
        accessibilityLabel={
          suggestedExpanded
            ? "Collapse suggested users and groups"
            : "Expand suggested users and groups"
        }
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: "bold",
            color: themeColors.purple,
            fontFamily: "CarosSoft",
            flex: 1,
          }}
        >
          Suggested
        </Text>
        {suggestedExpanded ? (
          <Minus size={22} color={themeColors.purple} />
        ) : (
          <Plus size={22} color={themeColors.purple} />
        )}
      </TouchableOpacity>
      {suggestedExpanded && (
        <View style={{ marginTop: 0 }}>
          {suggestedLoading || suggestedGroupsLoading ? (
            <ActivityIndicator color={themeColors.purple} />
          ) : suggestedWithPics.length === 0 && suggestedGroups.length === 0 ? (
            <Text
              style={{
                color: themeColors.darkGray,
                fontSize: 15,
                fontFamily: "CarosSoft",
              }}
            >
              No suggestions available.
            </Text>
          ) : (
            <FlatList
              data={[
                ...suggestedWithPics.slice(0, 4).map((u) => ({ ...u, _type: "person" })),
                ...suggestedGroups.slice(0, 4).map((g) => ({ ...g, _type: "group" })),
              ]}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) =>
                item._type === "person"
                  ? `person_${item.uid}`
                  : `group_${item.id}`
              }
              renderItem={({ item }) => {
                if (item._type === "person") {
                  return (
                    <View
                      style={{
                        alignItems: "center",
                        marginRight: 10,
                        minWidth: 140,
                        maxWidth: 180,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          navigation.navigate("Profile", { uid: item.uid });
                        }}
                        style={{
                          backgroundColor: themeColors.lightGray,
                          borderRadius: 10,
                          padding: 12,
                          alignItems: "center",
                          minWidth: 140,
                          maxWidth: 180,
                        }}
                        activeOpacity={0.8}
                      >
                        <ProfilePicture
                          profilePic={item.profilePic}
                          themeColors={themeColors}
                          size={48}
                          isLoading={!item._profilePicLoaded}
                        />
                        <Text
                          style={{
                            color: themeColors.black,
                            fontWeight: "bold",
                            fontSize: 15,
                            fontFamily: "CarosSoft",
                            textAlign: "center",
                            marginTop: 8,
                          }}
                          numberOfLines={1}
                        >
                          {item.firstName} {item.lastName}
                        </Text>
                        <Text
                          style={{
                            color: themeColors.darkGray,
                            fontSize: 13,
                            fontFamily: "CarosSoft",
                            textAlign: "center",
                          }}
                        >
                          {item.email}
                        </Text>
                        <TouchableOpacity
                          style={{
                            marginTop: 8,
                            backgroundColor: followingIds.includes(item.uid)
                              ? themeColors.gray
                              : themeColors.purple,
                            borderRadius: 6,
                            paddingVertical: 6,
                            paddingHorizontal: 16,
                          }}
                          onPress={() => handleFollow(item.uid)}
                          disabled={
                            followingIds.includes(item.uid) ||
                            followLoading[item.uid]
                          }
                        >
                          <Text
                            style={{
                              color: themeColors.white,
                              fontWeight: "bold",
                              fontSize: 14,
                              fontFamily: "CarosSoft",
                            }}
                          >
                            {followLoading[item.uid]
                              ? "Following..."
                              : followingIds.includes(item.uid)
                              ? "Following"
                              : "Follow"}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </View>
                  );
                } else if (item._type === "group") {
                  const IconComponent =
                    item.icon && require("phosphor-react-native")[item.icon]
                      ? require("phosphor-react-native")[item.icon]
                      : require("phosphor-react-native").UsersThree;
                  const isMember =
                    Array.isArray(item.memberUids) &&
                    item.memberUids.includes(user.uid);
                  const isPublic = !(item.isPrivate ?? false);
                  const joining = joiningGroups?.[item.id] ?? false;
                  const handleJoin = async () => {
                    // --- Confirmation alert before joining ---
                    Alert.alert(
                      "Join Group",
                      "You are not a member of this public group. Would you like to join?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Join",
                          style: "default",
                          onPress: async () => {
                            setJoiningGroups((prev) => ({
                              ...prev,
                              [item.id]: true,
                            }));
                            try {
                              const groupRef = doc(
                                require("../../firebaseConfig").db,
                                "studyGroups",
                                item.id
                              );
                              await getDoc(groupRef).then(async (snap) => {
                                if (snap.exists()) {
                                  const data = snap.data();
                                  const memberUids = Array.isArray(data.memberUids)
                                    ? data.memberUids
                                    : [];
                                  if (memberUids.length >= 32) {
                                    Alert.alert(
                                      "Group Full",
                                      "This public group already has 32 members and cannot accept more."
                                    );
                                    setJoiningGroups((prev) => ({
                                      ...prev,
                                      [item.id]: false,
                                    }));
                                    return;
                                  }
                                  if (!memberUids.includes(user.uid)) {
                                    await updateDoc(groupRef, {
                                      memberUids: [...memberUids, user.uid],
                                    });
                                    // --- Add joined the group system message ---
                                    let userDoc;
                                    try {
                                      userDoc = await getDoc(
                                        doc(
                                          require("../../firebaseConfig").db,
                                          "users",
                                          user.uid
                                        )
                                      );
                                    } catch (e) {}
                                    const userName =
                                      userDoc && userDoc.exists()
                                        ? (userDoc.data().firstName || "User") +
                                          (userDoc.data().lastName
                                            ? " " + userDoc.data().lastName.charAt(0)
                                            : "")
                                        : "User";
                                    await addDoc(
                                      collection(
                                        require("../../firebaseConfig").db,
                                        "studyGroups",
                                        item.id,
                                        "messages"
                                      ),
                                      {
                                        type: "system",
                                        text: `${userName} joined the group.`,
                                        uid: user.uid,
                                        createdAt:
                                          require("firebase/firestore").serverTimestamp(),
                                      }
                                    );
                                  }
                                }
                              });
                              navigation.navigate("GroupDetail", {
                                groupId: item.id,
                              });
                            } catch (e) {
                              console.log(e);
                              Alert.alert("Error", "Failed to join group.");
                            }
                            setJoiningGroups((prev) => ({
                              ...prev,
                              [item.id]: false,
                            }));
                          },
                        },
                      ]
                    );
                  };
                  const handlePress = async () => {
                    if (isPublic && !isMember) {
                      // Do nothing, user should use Join button
                    } else {
                      navigation.navigate("GroupDetail", {
                        groupId: item.id,
                      });
                    }
                  };
                  return (
                    <View
                      style={{
                        alignItems: "center",
                        marginRight: 10,
                        minWidth: 140,
                        maxWidth: 180,
                      }}
                    >
                      <TouchableOpacity
                        onPress={handlePress}
                        style={{
                          backgroundColor: themeColors.lightGray,
                          borderRadius: 10,
                          padding: 12,
                          alignItems: "center",
                          minWidth: 140,
                          maxWidth: 180,
                        }}
                        activeOpacity={0.8}
                      >
                        {item.profilePic ? (
                          <Image
                            source={{ uri: item.profilePic }}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                            }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                              backgroundColor: themeColors.purple + "22",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <IconComponent
                              size={42}
                              color={themeColors.purple}
                              weight="fill"
                            />
                          </View>
                        )}
                        <Text
                          style={{
                            color: themeColors.black,
                            fontWeight: "bold",
                            fontSize: 15,
                            fontFamily: "CarosSoft",
                            textAlign: "center",
                            marginTop: 8,
                          }}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={{
                            color: themeColors.darkGray,
                            fontSize: 13,
                            fontFamily: "CarosSoft",
                            textAlign: "center",
                          }}
                          numberOfLines={1}
                        >
                          {Array.isArray(item.memberUids)
                            ? `${item.memberUids.length} members`
                            : ""}
                        </Text>
                        {isPublic && !isMember && (
                          <TouchableOpacity
                            style={{
                              marginTop: 8,
                              backgroundColor: themeColors.purple,
                              borderRadius: 6,
                              paddingVertical: 6,
                              paddingHorizontal: 16,
                            }}
                            onPress={handleJoin}
                            disabled={joining}
                          >
                            <Text
                              style={{
                                color: themeColors.white,
                                fontWeight: "bold",
                                fontSize: 14,
                                fontFamily: "CarosSoft",
                              }}
                            >
                              {joining ? "Joining..." : "Join"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                }
                return null;
              }}
              style={{ minHeight: 60 }}
            />
          )}
        </View>
      )}
    </View>
  );
}
