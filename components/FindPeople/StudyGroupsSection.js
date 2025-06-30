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

  // Group detail modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

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

  // Group details: fetch members and messages
  useEffect(() => {
    if (!activeGroup) return;
    // Fetch member info
    (async () => {
      const members = [];
      for (let uid of activeGroup.memberUids) {
        const uDoc = await getDoc(doc(db, "users", uid));
        if (uDoc.exists()) {
          members.push({
            uid,
            name:
              `${uDoc.data().firstName || ""} ${
                uDoc.data().lastName || ""
              }`.trim() || uDoc.data().email,
            email: uDoc.data().email,
          });
        }
      }
      setGroupMembers(members);
    })();
    // Listen to messages
    const msgsCol = collection(db, "studyGroups", activeGroup.id, "messages");
    const q = query(msgsCol, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });
    return () => unsub();
  }, [activeGroup]);

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

  // Send message handler
  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeGroup) return;
    setSendingMsg(true);
    try {
      await addDoc(collection(db, "studyGroups", activeGroup.id, "messages"), {
        senderUid: user.uid,
        text: messageText.trim(),
        createdAt: serverTimestamp(),
      });
      setMessageText("");
    } catch {}
    setSendingMsg(false);
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
            <ScrollView style={{ width: "100%", maxHeight: 120 }}>
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
      {/* Group Details Modal */}
      <Modal
        visible={showGroupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPressOut={() => setShowGroupModal(false)}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 24,
              width: "90%",
              maxHeight: "90%",
              alignItems: "center",
            }}
            onStartShouldSetResponder={() => true}
          >
            {activeGroup && (
              <>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: themeColors.purple,
                    marginBottom: 6,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {activeGroup.name}
                </Text>
                <Text
                  style={{
                    color: themeColors.darkGray,
                    marginBottom: 8,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {activeGroup.description}
                </Text>
                <Text
                  style={{
                    fontWeight: "bold",
                    color: themeColors.purple,
                    marginBottom: 4,
                    fontFamily: "CarosSoft",
                  }}
                >
                  Members
                </Text>
                <View style={{ marginBottom: 10, width: "100%" }}>
                  {groupMembers.map((m) => (
                    <Text
                      key={m.uid}
                      style={{
                        color: themeColors.black,
                        fontFamily: "CarosSoft",
                        marginBottom: 2,
                      }}
                    >
                      {m.name} ({m.email})
                    </Text>
                  ))}
                </View>
                {/* Simple group chat */}
                <View
                  style={{
                    width: "100%",
                    backgroundColor: themeColors.gray,
                    borderRadius: 8,
                    padding: 8,
                    minHeight: 80,
                    maxHeight: 180,
                    marginBottom: 8,
                  }}
                >
                  <ScrollView
                    style={{ width: "100%" }}
                    contentContainerStyle={{ paddingBottom: 8 }}
                  >
                    {messages.length === 0 ? (
                      <Text
                        style={{
                          color: themeColors.darkGray,
                          fontFamily: "CarosSoft",
                        }}
                      >
                        No messages yet.
                      </Text>
                    ) : (
                      messages.map((msg) => {
                        const sender =
                          groupMembers.find((m) => m.uid === msg.senderUid) ||
                          {};
                        return (
                          <View
                            key={msg.id}
                            style={{
                              marginBottom: 6,
                              alignSelf:
                                msg.senderUid === user.uid
                                  ? "flex-end"
                                  : "flex-start",
                              backgroundColor:
                                msg.senderUid === user.uid
                                  ? themeColors.purple
                                  : themeColors.white,
                              borderRadius: 6,
                              padding: 6,
                              maxWidth: "80%",
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  msg.senderUid === user.uid
                                    ? themeColors.white
                                    : themeColors.black,
                                fontFamily: "CarosSoft",
                                fontWeight: "bold",
                              }}
                            >
                              {msg.senderUid === user.uid
                                ? "You"
                                : sender.name || sender.email || "Unknown"}
                            </Text>
                            <Text
                              style={{
                                color:
                                  msg.senderUid === user.uid
                                    ? themeColors.white
                                    : themeColors.black,
                                fontFamily: "CarosSoft",
                              }}
                            >
                              {msg.text}
                            </Text>
                            <Text
                              style={{
                                color:
                                  msg.senderUid === user.uid
                                    ? themeColors.white
                                    : themeColors.darkGray,
                                fontSize: 11,
                                fontFamily: "CarosSoft",
                                alignSelf: "flex-end",
                              }}
                            >
                              {msg.createdAt && msg.createdAt.seconds
                                ? new Date(
                                    msg.createdAt.seconds * 1000
                                  ).toLocaleTimeString()
                                : ""}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
                {/* Message input */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <TextInput
                    placeholder="Type a message..."
                    value={messageText}
                    onChangeText={setMessageText}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: themeColors.darkGray,
                      borderRadius: 8,
                      padding: 8,
                      color: themeColors.black,
                      fontFamily: "CarosSoft",
                      backgroundColor: themeColors.white,
                    }}
                    placeholderTextColor={themeColors.darkGray}
                  />
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={sendingMsg || !messageText.trim()}
                    style={{
                      marginLeft: 8,
                      backgroundColor: themeColors.purple,
                      borderRadius: 8,
                      padding: 10,
                      opacity: sendingMsg || !messageText.trim() ? 0.7 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: themeColors.white,
                        fontWeight: "bold",
                        fontFamily: "CarosSoft",
                      }}
                    >
                      Send
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => setShowGroupModal(false)}
                  style={{
                    marginTop: 16,
                    backgroundColor: themeColors.purple,
                    borderRadius: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 24,
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
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Main group list */}
      <View style={{ width: "100%", marginBottom: 12 }}>
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
          <FlatList
            data={groups}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setActiveGroup(item);
                  setShowGroupModal(true);
                }}
                style={{
                  backgroundColor: themeColors.lightGray,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                  alignItems: "flex-start",
                }}
              >
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    fontSize: 16,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    color: themeColors.black,
                    fontSize: 14,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {item.description}
                </Text>
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 13,
                    fontFamily: "CarosSoft",
                  }}
                >
                  Members: {item.memberUids.length}
                </Text>
              </TouchableOpacity>
            )}
            style={{ minHeight: 60 }}
          />
        )}
      </View>
    </View>
  );
}
