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
  Image,
  Switch,
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
  updateDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ThemeContext } from "../../App";
import { colors } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import * as PhosphorIcons from "phosphor-react-native";
import { LockKey, Plus, FadersHorizontal } from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import useFavorites from "../../hooks/useFavorites";
import GroupFiltersModal from "./GroupFiltersModal";

function getMutualFriends(users, currentUser) {
  // Show all friends: users who are both in my followers and following
  if (!currentUser) return [];
  const me = users.find((u) => u.uid === currentUser.uid);
  if (!me) return [];
  if (!Array.isArray(me.followers) || !Array.isArray(me.following)) return [];
  // Friends: users who are both in followers and following
  const friendUids = me.followers.filter((uid) => me.following.includes(uid));
  return users.filter(
    (u) => u.uid !== currentUser.uid && friendUids.includes(u.uid)
  );
}

// List of icon names from phosphor-react-native (pick your favorites)
const GROUP_ICONS = [
  "UsersThree",
  "ChatsCircle",
  "Books",
  "Student",
  "Globe",
  "Lightbulb",
  "Notebook",
  "Atom",
  "PuzzlePiece",
  "Brain",
  "Code",
  "Flask",
  "PenNib",
  "BookOpen",
  "Rocket",
];

export default function StudyGroupsSection({ navigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const user = auth.currentUser;
  const { favoriteGroups, toggleFavoriteGroup } = useFavorites();

  // Groups state
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  // --- Add group search state ---
  const [groupSearch, setGroupSearch] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState([]);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [mutualFriends, setMutualFriends] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [groupProfilePic, setGroupProfilePic] = useState(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false); // <-- add state

  // Add state for group view mode
  const [showAllGroups, setShowAllGroups] = useState(false);

  // Store all groups (for "All Groups" view)
  const [allGroups, setAllGroups] = useState([]);

  // --- Filter modal state ---
  const FILTERS = [
    { key: "default", label: "All" },
    { key: "my", label: "My Groups" },
    { key: "small", label: "Small (<10)" },
    { key: "big", label: "Big (>10)" },
    { key: "public", label: "Public" },
    { key: "private", label: "Private" }, // <-- add private filter
  ];
  const [selectedFilter, setSelectedFilter] = useState("default");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  // Add a temp filter state for the modal
  const [pendingFilter, setPendingFilter] = useState(selectedFilter);

  // Fetch groups: public for all, private only if user is a member
  useEffect(() => {
    if (!user) return;
    setLoadingGroups(true);

    // Helper to merge and deduplicate groups by id
    const mergeGroups = (arr1, arr2) => {
      const map = {};
      [...arr1, ...arr2].forEach((g) => {
        map[g.id] = g;
      });
      return Object.values(map);
    };

    // Use onSnapshot for both queries and merge results
    let unsubMember = null;
    let unsubPublic = null;

    // Groups where user is a member
    const memberQ = query(
      collection(db, "studyGroups"),
      where("memberUids", "array-contains", user.uid)
    );
    // Public groups (isPrivate === false)
    const publicQ = query(
      collection(db, "studyGroups"),
      where("isPrivate", "==", false)
    );

    unsubMember = onSnapshot(memberQ, (snapMember) => {
      const memberGroups = snapMember.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      unsubPublic = onSnapshot(publicQ, (snapPublic) => {
        const publicGroups = snapPublic.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setGroups(mergeGroups(memberGroups, publicGroups));
        setLoadingGroups(false);
      });
    });

    return () => {
      if (unsubMember) unsubMember();
      if (unsubPublic) unsubPublic();
    };
  }, [user]);

  // Fetch all users for mutual friends and group member display
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
  }, [user]);

  // Fetch all groups for "All Groups" view
  useEffect(() => {
    if (!user) return;
    // Fetch all public groups and all private groups where user is a member
    const publicQ = query(
      collection(db, "studyGroups"),
      where("isPrivate", "==", false)
    );
    const privateQ = query(
      collection(db, "studyGroups"),
      where("isPrivate", "==", true),
      where("memberUids", "array-contains", user.uid)
    );
    // Listen to both queries and merge results
    let unsubPublic = null;
    let unsubPrivate = null;
    unsubPublic = onSnapshot(publicQ, (snapPublic) => {
      const publicGroups = snapPublic.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      unsubPrivate = onSnapshot(privateQ, (snapPrivate) => {
        const privateGroups = snapPrivate.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        // Merge and deduplicate by id
        const map = {};
        [...publicGroups, ...privateGroups].forEach((g) => {
          map[g.id] = g;
        });
        setAllGroups(Object.values(map));
      });
    });
    return () => {
      if (unsubPublic) unsubPublic();
      if (unsubPrivate) unsubPrivate();
    };
  }, [user]);

  // Helper to pick image
  const handlePickGroupProfilePic = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || result.cancelled) return;
      const asset = result.assets ? result.assets[0] : result;
      setGroupProfilePic(asset.uri);
    } catch {}
  };

  // Create group handler
  const handleCreateGroup = async () => {
    // Only require members for private groups
    if (!groupName.trim() || (isPrivate && selectedMembers.length === 0)) {
      Alert.alert(
        isPrivate
          ? "Please enter a group name and select members."
          : "Please enter a group name."
      );
      return;
    }
    setCreating(true);
    let uploadedPicUrl = null;
    try {
      // Upload group profile pic if selected
      if (groupProfilePic) {
        setUploadingPic(true);
        const storage = getStorage();
        const response = await fetch(groupProfilePic);
        const blob = await response.blob();
        const filename = `group_${user.uid}_${Date.now()}.jpg`;
        const fileRef = storageRef(storage, `group_pictures/${filename}`);
        await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
        uploadedPicUrl = await getDownloadURL(fileRef);
        setUploadingPic(false);
      }
      // Pick a random icon for the group (as fallback)
      const randomIcon =
        GROUP_ICONS[Math.floor(Math.random() * GROUP_ICONS.length)];
      await addDoc(collection(db, "studyGroups"), {
        name: groupName.trim(),
        description: groupDesc.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        memberUids: [user.uid, ...selectedMembers],
        icon: randomIcon,
        profilePic: uploadedPicUrl || null,
        isPrivate, // <-- store privacy flag
      });
      setShowCreateModal(false);
      setGroupName("");
      setGroupDesc("");
      setSelectedMembers([]);
      setGroupProfilePic(null);
      setIsPrivate(false); // reset
    } catch (e) {
      Alert.alert("Error", "Failed to create group.");
    }
    setCreating(false);
    setUploadingPic(false);
  };

  // --- Filter groups based on selected filter ---
  const filterGroups = (groupsArr) => {
    switch (selectedFilter) {
      case "my":
        return groupsArr.filter(
          (g) => Array.isArray(g.memberUids) && g.memberUids.includes(user.uid)
        );
      case "small":
        return groupsArr.filter(
          (g) => Array.isArray(g.memberUids) && g.memberUids.length < 10
        );
      case "big":
        return groupsArr.filter(
          (g) => Array.isArray(g.memberUids) && g.memberUids.length > 10
        );
      case "public":
        return groupsArr.filter((g) => !(g.isPrivate ?? false));
      case "private":
        return groupsArr.filter((g) => g.isPrivate === true); // <-- filter private groups only
      case "default":
      default:
        // All public groups + private groups where user is a member
        return groupsArr.filter(
          (g) =>
            !(g.isPrivate ?? false) ||
            (Array.isArray(g.memberUids) && g.memberUids.includes(user.uid))
        );
    }
  };

  // --- Filter groups by search (fuzzy: name or description, case-insensitive) ---
  useEffect(() => {
    // Always use allGroups for filtering, since it contains all public groups
    const sourceGroups = allGroups.length > 0 ? allGroups : groups;
    let filtered = filterGroups(sourceGroups);
    if (!groupSearch.trim()) {
      setGroupSearchResults(filtered);
      return;
    }
    const s = groupSearch.trim().toLowerCase();
    setGroupSearchResults(
      filtered.filter(
        (g) =>
          (g.name && g.name.toLowerCase().includes(s)) ||
          (g.description && g.description.toLowerCase().includes(s))
      )
    );
  }, [groupSearch, groups, allGroups, selectedFilter]);

  // --- Sort groups: favorite groups first for current user ---
  const sortedGroups = [
    ...(groupSearch
      ? groupSearchResults
      : filterGroups(allGroups.length > 0 ? allGroups : groups)),
  ].sort((a, b) => {
    const aFav = favoriteGroups.includes(a.id) ? 1 : 0;
    const bFav = favoriteGroups.includes(b.id) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav; // favorite first
    // fallback: alphabetical
    return (a.name || "").localeCompare(b.name || "");
  });

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
      {/* --- Search and Filters Row --- */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, marginRight: 8 }}>
          <TextInput
            placeholder="Search for a group..."
            value={groupSearch}
            onChangeText={setGroupSearch}
            style={{
              borderWidth: 1,
              borderColor: themeColors.darkGray,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: 16,
              color: themeColors.black,
              fontFamily: "CarosSoft",
              backgroundColor: themeColors.white,
            }}
            placeholderTextColor={themeColors.darkGray}
          />
        </View>
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 25,
            paddingVertical: 10,
            paddingLeft: 14,
            alignItems: "center",
            flexDirection: "row",
          }}
          accessibilityLabel="Open Filters"
        >
          <Text
            style={{
              color: themeColors.purple,
              fontWeight: "bold",
              fontSize: 14,
              marginRight: 8,
              fontFamily: "CarosSoft",
            }}
          >
            Filters
          </Text>
          <FadersHorizontal
            size={22}
            color={themeColors.purple}
            weight="bold"
          />
        </TouchableOpacity>
      </View>
      {/* --- Filters Modal --- */}
      <GroupFiltersModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        FILTERS={FILTERS}
        pendingFilter={pendingFilter}
        setPendingFilter={setPendingFilter}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
        themeColors={themeColors}
      />
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
            {/* Group Profile Pic Picker */}
            <TouchableOpacity
              onPress={handlePickGroupProfilePic}
              style={{
                marginBottom: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
              disabled={uploadingPic}
            >
              {groupProfilePic ? (
                <View
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: 32,
                    overflow: "hidden",
                    backgroundColor: themeColors.purple + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 4,
                  }}
                >
                  <Image
                    source={{ uri: groupProfilePic }}
                    style={{ width: 128, height: 128, borderRadius: 32 }}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: themeColors.purple + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 4,
                  }}
                >
                  <PhosphorIcons.UsersThree
                    size={36}
                    color={themeColors.purple}
                    weight="fill"
                  />
                </View>
              )}
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                  fontSize: 14,
                  marginTop: 2,
                }}
              >
                {groupProfilePic ? "Change Group Picture" : "Add Group Picture"}
              </Text>
            </TouchableOpacity>

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
                maxLength: 50, // Limit group name length
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
                maxLength: 50, // Limit description length
              }}
              placeholderTextColor={themeColors.darkGray}
            />
            {/* Public/Private Toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
                marginTop: 2,
                alignSelf: "center",
              }}
            >
              <TouchableOpacity
                onPress={() => setIsPrivate(false)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 18,
                }}
                accessibilityLabel="Set group as public"
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: isPrivate
                      ? themeColors.gray
                      : themeColors.purple,
                    backgroundColor: !isPrivate
                      ? themeColors.purple
                      : themeColors.white,
                    marginRight: 6,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {!isPrivate && (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: themeColors.white,
                      }}
                    />
                  )}
                </View>
                <Text
                  style={{
                    color: !isPrivate
                      ? themeColors.purple
                      : themeColors.darkGray,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsPrivate(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
                accessibilityLabel="Set group as private"
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: isPrivate
                      ? themeColors.purple
                      : themeColors.gray,
                    backgroundColor: isPrivate
                      ? themeColors.purple
                      : themeColors.white,
                    marginRight: 6,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isPrivate && (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: themeColors.white,
                      }}
                    />
                  )}
                </View>
                <Text
                  style={{
                    color: isPrivate
                      ? themeColors.purple
                      : themeColors.darkGray,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  Private
                </Text>
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 6,
                marginTop: 10,
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
        <View
          style={{
            position: "absolute",
            bottom: 40, // <-- move up to avoid tab bar overlap (was 25)
            right: 0,
            zIndex: 20,
          }}
        >
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: themeColors.purple,
              borderRadius: 50,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.85}
          >
            <Plus size={24} color={themeColors.white} />
            <Text
              style={{
                color: themeColors.white,
                fontWeight: "bold",
                fontSize: 14,
                marginLeft: 8,
                fontFamily: "CarosSoft",
              }}
            >
              Add Group
            </Text>
          </TouchableOpacity>
        </View>
        {loadingGroups ? (
          <ActivityIndicator color={themeColors.purple} />
        ) : (
            groupSearch
              ? groupSearchResults.length === 0
              : sortedGroups.length === 0
          ) ? (
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
              data={sortedGroups}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                // Get the icon component from PhosphorIcons
                const IconComponent =
                  item.icon && PhosphorIcons[item.icon]
                    ? PhosphorIcons[item.icon]
                    : PhosphorIcons.UsersThree;
                // --- Add join logic for public groups ---
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
                              // Add user to memberUids
                              const groupRef = doc(db, "studyGroups", item.id);
                              await getDoc(groupRef).then(async (snap) => {
                                if (snap.exists()) {
                                  const data = snap.data();
                                  const memberUids = Array.isArray(
                                    data.memberUids
                                  )
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
                                            ? " " +
                                              userDoc.data().lastName.charAt(0)
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
                              // Navigate after joining
                              navigation.navigate("GroupDetail", {
                                groupId: item.id,
                              });
                            } catch (e) {
                              Alert.alert("Error", "Failed to join group.");
                              console.error("Join group error:", e);
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
                      borderColor: themeColors.black,
                      borderWidth: 0.5,
                      position: "relative",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    {/* Group Profile Pic or Icon */}
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
                            // marginBottom: 4, // moved to parent View
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
                      {/* --- Show member names (first name + last initial) --- */}
                      {item.isPrivate && (
                        <Text
                          style={{
                            color: themeColors.darkGray,
                            fontSize: 13,
                            fontFamily: "CarosSoft",
                          }}
                        >
                          Members:{" "}
                          {Array.isArray(item.memberUids) && allUsers.length > 0
                            ? (() => {
                                // "You" first, then others
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
                                    allNames.slice(0, 5).join(", ") +
                                    ", ...more"
                                  );
                                }
                                return allNames.join(", ");
                              })()
                            : item.memberUids.length}
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
