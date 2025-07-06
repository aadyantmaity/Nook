import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as PhosphorIcons from "phosphor-react-native";
import { LockKey } from "phosphor-react-native";
import { db, auth } from "../../../firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

export default function GroupList({
  loadingGroups,
  groupSearch,
  groupSearchResults,
  sortedGroups,
  favoriteGroups,
  allUsers,
  user,
  navigation,
  themeColors,
}) {
  const [isScrolled, setIsScrolled] = useState(false);

  if (loadingGroups) {
    return (
      <ActivityIndicator color={themeColors.purple} style={{ marginTop: 8 }} />
    );
  }

  if (
    groupSearch ? groupSearchResults.length === 0 : sortedGroups.length === 0
  ) {
    return (
      <Text
        style={{
          color: themeColors.darkGray,
          fontFamily: "CarosSoft",
          textAlign: "center",
          marginTop: 12,
        }}
      >
        {groupSearch
          ? "No groups found matching your search."
          : "No study groups found."}
      </Text>
    );
  }

  return (
    <View style={{ flex: 1, position: "relative", width: "100%" }}>
      {sortedGroups.length > 0 && isScrolled && (
        <LinearGradient
          colors={[themeColors.white + "FF", themeColors.white + "00"]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 24,
            zIndex: 2,
            pointerEvents: "none",
          }}
          pointerEvents="none"
        />
      )}
      <FlatList
        data={sortedGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const IconComponent =
            item.icon && PhosphorIcons[item.icon]
              ? PhosphorIcons[item.icon]
              : PhosphorIcons.UsersThree;
          const isMember =
            Array.isArray(item.memberUids) &&
            item.memberUids.includes(user.uid);
          const isPublic = !(item.isPrivate ?? false);
          const handlePress = async () => {
            if (isPublic && !isMember) {
              Alert.alert(
                "Join Group",
                "You are not a member of this public group. Would you like to join?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Join",
                    style: "default",
                    onPress: async () => {
                      try {
                        const groupRef = doc(db, "studyGroups", item.id);
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
                                  doc(db, "users", user.uid)
                                );
                              } catch {}
                              const userName =
                                userDoc && userDoc.exists()
                                  ? (userDoc.data().firstName || "User") +
                                    (userDoc.data().lastName
                                      ? " " + userDoc.data().lastName.charAt(0)
                                      : "")
                                  : "User";
                              await addDoc(
                                collection(
                                  db,
                                  "studyGroups",
                                  item.id,
                                  "messages"
                                ),
                                {
                                  type: "system",
                                  text: `${userName} joined the group.`,
                                  uid: user.uid,
                                  createdAt: serverTimestamp(),
                                }
                              );
                            }
                          }
                        });
                        navigation.navigate("GroupDetail", {
                          groupId: item.id,
                        });
                      } catch (e) {
                        Alert.alert("Error", "Failed to join group.");
                      }
                    },
                  },
                ]
              );
            } else {
              navigation.navigate("GroupDetail", { groupId: item.id });
            }
          };
          return (
            <TouchableOpacity
              onPress={handlePress}
              style={{
                backgroundColor: themeColors.white,
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                borderColor: themeColors.darkGray,
                borderWidth: 0.5,
                position: "relative",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {item.profilePic ? (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: themeColors.purple + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    source={{ uri: item.profilePic }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: themeColors.purple + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <IconComponent
                    size={28}
                    color={themeColors.purple}
                    weight="fill"
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 18,
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {item.name}
                  </Text>
                  {item.isPrivate && (
                    <LockKey
                      size={18}
                      color={themeColors.purple}
                      weight="fill"
                      style={{
                        marginLeft: 6,
                        marginBottom: -2,
                        alignSelf: "center",
                      }}
                    />
                  )}
                </View>
                {item.description !== "" && (
                  <Text
                    style={{
                      color: themeColors.black,
                      fontSize: 15,
                      fontFamily: "CarosSoft",
                      marginBottom: 4,
                    }}
                  >
                    {item.description}
                  </Text>
                )}
                {item.isPrivate && (
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontSize: 13,
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {Array.isArray(item.memberUids) && allUsers.length > 0
                      ? (() => {
                          const you = "You";
                          const others = item.memberUids
                            .filter((uid) => uid !== user.uid)
                            .map((uid) => {
                              const u = allUsers.find(
                                (user) => user.uid === uid
                              );
                              if (!u) return "User";
                              const first = u.firstName || "";
                              const lastInitial = u.lastName
                                ? ` ${u.lastName.charAt(0)}`
                                : "";
                              return `${first}${lastInitial}`.trim();
                            });
                          const allNames = [you, ...others];
                          if (allNames.length > 5) {
                            return (
                              allNames.slice(0, 5).join(", ") + ", ...more"
                            );
                          }
                          return allNames.join(", ");
                        })()
                      : ""}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          setIsScrolled(offsetY > 2);
        }}
        scrollEventThrottle={16}
      />
      {sortedGroups.length > 0 && (
        <LinearGradient
          colors={[themeColors.white + "00", themeColors.white + "FF"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 24,
            zIndex: 2,
            pointerEvents: "none",
          }}
          pointerEvents="none"
        />
      )}
    </View>
  );
}
