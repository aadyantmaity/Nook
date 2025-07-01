import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ThemeContext } from "../../App";
import { colors } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";

function getMutualFriends(users, currentUser) {
  // Mutual: I follow them AND they follow me
  if (!currentUser) return [];
  const me = users.find((u) => u.uid === currentUser.uid);
  if (!me) return [];
  return users.filter(
    (u) =>
      u.uid !== currentUser.uid &&
      Array.isArray(me.following) &&
      Array.isArray(u.followers) &&
      me.following.includes(u.uid) &&
      u.followers.includes(currentUser.uid)
  );
}

export default function StudyGroupsSection({ navigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const user = auth.currentUser;

  // Groups state
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [mutualFriends, setMutualFriends] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Fetch groups where user is a member
  useEffect(() => {
    if (!user) return;
    setLoadingGroups(true);
    const q = query(
      collection(db, "studyGroups"),
      where("memberUids", "array-contains", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setGroups(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
      setLoadingGroups(false);
    });
    return () => unsub();
  }, [user]);

  // Fetch all users for mutual friends
  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDocs(collection(db, "users"));
      const users = snap.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      }));
      setAllUsers(users);
      setMutualFriends(getMutualFriends(users, user));
    })();
  }, [user, showCreateModal]);

  // Create group handler
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      Alert.alert("Please enter a group name and select members.");
      return;
    }
    setCreating(true);
    try {
      const groupDoc = await addDoc(collection(db, "studyGroups"), {
        name: groupName.trim(),
        description: groupDesc.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        memberUids: [user.uid, ...selectedMembers],
      });
      setShowCreateModal(false);
      setGroupName("");
      setGroupDesc("");
      setSelectedMembers([]);
    } catch (e) {
      Alert.alert("Error", "Failed to create group.");
    }
    setCreating(false);
  };

  return (
    <View
      style={{
        backgroundColor: themeColors.white,
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 0,
        width: "100%",
        marginTop: -8,
        alignItems: "center",
        flex: 1,
      }}
    >
      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPressOut={() => setShowCreateModal(false)}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 24,
              width: "85%",
              maxHeight: "80%",
              alignItems: "center",
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 10,
                textAlign: "center",
                fontFamily: "CarosSoft",
              }}
            >
              Create Study Group
            </Text>
            <TextInput
              placeholder="Group Name"
              value={groupName}
              onChangeText={setGroupName}
              style={{
                borderWidth: 1,
                borderColor: themeColors.darkGray,
                borderRadius: 8,
                padding: 10,
                width: "100%",
                marginBottom: 10,
                color: themeColors.black,
                fontFamily: "CarosSoft",
              }}
              placeholderTextColor={themeColors.darkGray}
            />
            <TextInput
              placeholder="Description (optional)"
              value={groupDesc}
              onChangeText={setGroupDesc}
              style={{
                borderWidth: 1,
                borderColor: themeColors.darkGray,
                borderRadius: 8,
                padding: 10,
                width: "100%",
                marginBottom: 10,
                color: themeColors.black,
                fontFamily: "CarosSoft",
              }}
              placeholderTextColor={themeColors.darkGray}
            />
            <Text
              style={{
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 6,
                fontFamily: "CarosSoft",
              }}
            >
              Add Friends
            </Text>
            <ScrollView
              style={{ width: "100%", maxHeight: 120 }}
              showsVerticalScrollIndicator={false}
            >
              {mutualFriends.length === 0 ? (
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontFamily: "CarosSoft",
                  }}
                >
                  No mutual friends found.
                </Text>
              ) : (
                mutualFriends.map((u) => (
                  <TouchableOpacity
                    key={u.uid}
                    onPress={() => {
                      setSelectedMembers((prev) =>
                        prev.includes(u.uid)
                          ? prev.filter((id) => id !== u.uid)
                          : [...prev, u.uid]
                      );
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 1,
                        borderColor: themeColors.purple,
                        backgroundColor: selectedMembers.includes(u.uid)
                          ? themeColors.purple
                          : themeColors.white,
                        marginRight: 12,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selectedMembers.includes(u.uid) && (
                        <Text
                          style={{
                            color: themeColors.white,
                            fontWeight: "bold",
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text
                      style={{
                        color: themeColors.black,
                        fontFamily: "CarosSoft",
                      }}
                    >
                      {u.firstName} {u.lastName} ({u.email})
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <View
              style={{ flexDirection: "row", marginTop: 16, width: "100%" }}
            >
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.white,
                  borderColor: themeColors.purple,
                  borderWidth: 1,
                  borderRadius: 8,
                  alignItems: "center",
                  paddingVertical: 10,
                  marginRight: 8,
                }}
              >
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateGroup}
                disabled={creating}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.purple,
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: "center",
                  marginLeft: 8,
                  opacity: creating ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    color: themeColors.white,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  {creating ? "Creating..." : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Main group list */}
      <View style={{ width: "100%", marginBottom: 12, flex: 1 }}>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          style={{
            backgroundColor: themeColors.purple,
            borderRadius: 8,
            paddingVertical: 10,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: themeColors.white,
              fontWeight: "bold",
              fontFamily: "CarosSoft",
            }}
          >
            + Create Study Group
          </Text>
        </TouchableOpacity>
        {loadingGroups ? (
          <ActivityIndicator color={themeColors.purple} />
        ) : groups.length === 0 ? (
          <Text
            style={{
              color: themeColors.darkGray,
              fontFamily: "CarosSoft",
              textAlign: "center",
              marginTop: 12,
            }}
          >
            You are not a member of any study groups yet.
          </Text>
        ) : (
          <View style={{ flex: 1, position: "relative" }}>
            {/* Top gradient */}
            {groups.length > 0 && isScrolled && (
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
              data={groups}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    // Navigate to the new group detail page
                    navigation.navigate("GroupDetail", { groupId: item.id });
                  }}
                  style={{
                    // --- Match StudySpotCard UI ---
                    backgroundColor: themeColors.white,
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                    borderColor: themeColors.black,
                    borderWidth: 0.5,
                    position: "relative",
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 18,
                      fontFamily: "CarosSoft",
                      marginBottom: 4,
                    }}
                  >
                    {item.name}
                  </Text>
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
                  {/* --- Show member names (first name + last initial) --- */}
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontSize: 13,
                      fontFamily: "CarosSoft",
                    }}
                  >
                    Members:{" "}
                    {Array.isArray(item.memberUids) && allUsers.length > 0
                      ? item.memberUids
                          .map((uid) => {
                            if (uid === user.uid) return "You";
                            const u = allUsers.find((user) => user.uid === uid);
                            if (!u) return "User";
                            const first = u.firstName || "";
                            const lastInitial = u.lastName
                              ? ` ${u.lastName.charAt(0)}`
                              : "";
                            return `${first}${lastInitial}`.trim();
                          })
                          .join(", ")
                      : item.memberUids.length}
                  </Text>
                </TouchableOpacity>
              )}
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              onScroll={(e) => {
                const offsetY = e.nativeEvent.contentOffset.y;
                setIsScrolled(offsetY > 2);
              }}
              scrollEventThrottle={16}
            />
            {/* Bottom gradient */}
            {groups.length > 0 && (
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
        )}
      </View>
    </View>
  );
}
