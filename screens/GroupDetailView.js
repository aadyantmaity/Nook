import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { db, auth } from "../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";

export default function GroupDetailView({ route, navigation }) {
  const { groupId } = route.params;
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const user = auth.currentUser;

  const [group, setGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch group info
  useEffect(() => {
    let unsub = null;
    (async () => {
      const groupDoc = await getDoc(doc(db, "studyGroups", groupId));
      if (groupDoc.exists()) {
        setGroup({ id: groupDoc.id, ...groupDoc.data() });
      }
      setLoading(false);
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [groupId]);

  // Fetch members
  useEffect(() => {
    if (!group) return;
    (async () => {
      const members = [];
      for (let uid of group.memberUids) {
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
  }, [group]);

  // Listen to messages
  useEffect(() => {
    if (!group) return;
    const msgsCol = collection(db, "studyGroups", group.id, "messages");
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
  }, [group]);

  // Send message handler
  const handleSendMessage = async () => {
    if (!messageText.trim() || !group) return;
    setSendingMsg(true);
    try {
      await addDoc(collection(db, "studyGroups", group.id, "messages"), {
        senderUid: user.uid,
        text: messageText.trim(),
        createdAt: serverTimestamp(),
      });
      setMessageText("");
    } catch {}
    setSendingMsg(false);
  };

  if (loading || !group) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.white,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={themeColors.purple} />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: themeColors.white,
        padding: 24,
        alignItems: "center",
      }}
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{
          alignSelf: "flex-start",
          marginBottom: 12,
          paddingVertical: 6,
          paddingHorizontal: 12,
          backgroundColor: themeColors.purple,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            color: themeColors.white,
            fontWeight: "bold",
            fontFamily: "CarosSoft",
          }}
        >
          Back
        </Text>
      </TouchableOpacity>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
          color: themeColors.purple,
          marginBottom: 6,
          fontFamily: "CarosSoft",
        }}
      >
        {group.name}
      </Text>
      <Text
        style={{
          color: themeColors.darkGray,
          marginBottom: 8,
          fontFamily: "CarosSoft",
        }}
      >
        {group.description}
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
                groupMembers.find((m) => m.uid === msg.senderUid) || {};
              return (
                <View
                  key={msg.id}
                  style={{
                    marginBottom: 6,
                    alignSelf:
                      msg.senderUid === user.uid ? "flex-end" : "flex-start",
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
    </View>
  );
}
