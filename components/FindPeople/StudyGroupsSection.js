import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  FlatList,
  Image,
  Alert, // <-- add Alert import
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
import {
  FadersHorizontal,
  Plus,
  Minus,
  MagnifyingGlass,
} from "phosphor-react-native";
import useFavorites from "../../hooks/useFavorites";
import GroupFiltersModal from "./GroupFiltersModal";
import GroupList from "./StudyGroups/GroupList";
import CreateGroupModal from "./StudyGroups/CreateGroupModal";
import ProfilePicture from "../Profile/ProfilePicture";
import SuggestedPeopleAndGroups from "./SuggestedPeopleAndGroups";

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
  "MusicNotes",
  "Camera",
  "PaintBrush",
  "GameController",
  "Tree",
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

  // Icon selection state
  const [selectedIcon, setSelectedIcon] = useState(null); // <-- icon state
  const [showIconModal, setShowIconModal] = useState(false); // <-- icon modal state

  // --- Friend search and suggested users state ---
  const [friendSearch, setFriendSearch] = useState("");
  const [friendResults, setFriendResults] = useState([]);
  const [friendLoading, setFriendLoading] = useState(false);
  const [suggested, setSuggested] = useState([]);
  const [suggestedGroups, setSuggestedGroups] = useState([]); // <-- add this
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [suggestedGroupsLoading, setSuggestedGroupsLoading] = useState(true); // <-- add this
  const [followingIds, setFollowingIds] = useState([]);
  const [followLoading, setFollowLoading] = useState({});
  const [suggestedExpanded, setSuggestedExpanded] = useState(false);
  const [suggestedWithPics, setSuggestedWithPics] = useState([]);
  const debounceTimer = useRef(null);

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
      // --- Upload group profile pic to Cloudinary if selected ---
      if (groupProfilePic) {
        setUploadingPic(true);
        // Prepare form data for Cloudinary unsigned upload
        const formData = new FormData();
        formData.append("file", {
          uri: groupProfilePic,
          type: "image/jpeg",
          name: `group_${user.uid}_${Date.now()}.jpg`,
        });
        formData.append("upload_preset", "groupProfilePictures");
        formData.append("folder", "groupPictures");
        // Cloudinary unsigned upload endpoint
        const cloudinaryUrl =
          "https://api.cloudinary.com/v1_1/dxnd4aryf/image/upload";
        const response = await fetch(cloudinaryUrl, {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (data.secure_url) {
          // Optimize URL: resize to 256x256, auto format, quality auto
          // Example: https://res.cloudinary.com/dxnd4aryf/image/upload/w_256,h_256,c_fill,f_auto,q_auto/...
          const parts = data.secure_url.split("/upload/");
          if (parts.length === 2) {
            uploadedPicUrl = `${parts[0]}/upload/w_256,h_256,c_fill,f_auto,q_auto/${parts[1]}`;
          } else {
            uploadedPicUrl = data.secure_url;
          }
        }
        setUploadingPic(false);
      }
      // Pick a random icon if none selected and no picture
      let iconToUse = selectedIcon;
      if (!iconToUse && !groupProfilePic) {
        iconToUse = GROUP_ICONS[Math.floor(Math.random() * GROUP_ICONS.length)];
      }
      await addDoc(collection(db, "studyGroups"), {
        name: groupName.trim(),
        description: groupDesc.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        memberUids: [user.uid, ...selectedMembers],
        icon: iconToUse || null,
        profilePic: uploadedPicUrl || null,
        isPrivate, // <-- store privacy flag
      });
      setShowCreateModal(false);
      setGroupName("");
      setGroupDesc("");
      setSelectedMembers([]);
      setGroupProfilePic(null);
      setIsPrivate(false); // reset
      setSelectedIcon(null); // reset icon
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

  // --- Filter groups and friends by search (fuzzy: name or description, case-insensitive) ---
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  useEffect(() => {
    // Always use allGroups for filtering, since it contains all public groups
    const sourceGroups = allGroups.length > 0 ? allGroups : groups;
    let filteredGroups = filterGroups(sourceGroups);
    let filteredFriends = [];
    if (!groupSearch.trim()) {
      setGroupSearchResults(filteredGroups);
      setFriendSearchResults([]);
      return;
    }
    const s = groupSearch.trim().toLowerCase();
    setGroupSearchResults(
      filteredGroups.filter(
        (g) =>
          (g.name && g.name.toLowerCase().includes(s)) ||
          (g.description && g.description.toLowerCase().includes(s))
      )
    );
    // --- Friend search: search mutual friends by name or email ---
    filteredFriends = mutualFriends.filter(
      (u) =>
        (u.email && u.email.toLowerCase().includes(s)) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(s)
    );
    setFriendSearchResults(filteredFriends);
  }, [groupSearch, groups, allGroups, selectedFilter, mutualFriends]);

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

  // --- Suggested users and groups logic ---
  const refreshSuggested = React.useCallback(async () => {
    setSuggestedLoading(true);
    setSuggestedGroupsLoading(true);
    try {
      // --- Suggested users ---
      const q = collection(db, "users");
      const snap = await getDocs(q);
      // Exclude current user and users already followed
      const users = snap.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter(
          (u) =>
            u.uid !== user?.uid &&
            !(Array.isArray(followingIds) && followingIds.includes(u.uid))
        );
      // Shuffle and pick up to 8 users
      for (let i = users.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [users[i], users[j]] = [users[j], users[i]];
      }
      const picked = users.slice(0, 8);
      // --- Preload profile pictures ---
      const withPics = await Promise.all(
        picked.map(async (u) => {
          if (!u.profilePic) return { ...u, _profilePicLoaded: true };
          try {
            await Image.prefetch(u.profilePic);
            return { ...u, _profilePicLoaded: true };
          } catch {
            return { ...u, _profilePicLoaded: false };
          }
        })
      );
      setSuggestedWithPics(withPics);
      setSuggested(picked);
      setSuggestedLoading(false);

      // --- Suggested groups: public groups user is NOT a member of ---
      const groupsSnap = await getDocs(
        query(collection(db, "studyGroups"), where("isPrivate", "==", false))
      );
      const notInGroups = groupsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (g) =>
            Array.isArray(g.memberUids) && !g.memberUids.includes(user?.uid)
        );
      // Shuffle and pick up to 8 groups
      for (let i = notInGroups.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [notInGroups[i], notInGroups[j]] = [notInGroups[j], notInGroups[i]];
      }
      setSuggestedGroups(notInGroups.slice(0, 8));
      setSuggestedGroupsLoading(false);
    } catch {
      setSuggested([]);
      setSuggestedWithPics([]);
      setSuggestedGroups([]);
      setSuggestedLoading(false);
      setSuggestedGroupsLoading(false);
    }
  }, [followingIds, user?.uid]);

  // Fetch current user's following list for suggested users
  const fetchFollowing = React.useCallback(async () => {
    try {
      const q = collection(db, "users");
      const snap = await getDocs(q);
      const me = snap.docs.find((d) => d.id === user?.uid);
      if (me) {
        setFollowingIds(me.data().following || []);
      }
    } catch {
      setFollowingIds([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  // --- Listen to followingIds in real-time ---
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = require("firebase/firestore").onSnapshot(
      require("firebase/firestore").doc(db, "users", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setFollowingIds(docSnap.data().following || []);
        } else {
          setFollowingIds([]);
        }
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const [joiningGroups, setJoiningGroups] = useState({});

  return (
    <View
      style={{
        backgroundColor: themeColors.white,
        borderRadius: 16,
        paddingBottom: 24,
        paddingTop: 16,
        paddingHorizontal: 16,
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
        <View style={{ flex: 1 }}>
          <TextInput
            placeholder="Search for a group or person..."
            value={groupSearch}
            onChangeText={setGroupSearch}
            style={{
              borderWidth: 1,
              borderColor: themeColors.darkGray,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              width: "100%",
              fontSize: 16,
              color: themeColors.black,
              height: 44,
              fontFamily: "CarosSoft",
              backgroundColor: themeColors.white,
            }}
            placeholderTextColor={themeColors.darkGray}
          />
        </View>
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={{
            paddingVertical: 10,
            paddingLeft: 14,
            alignItems: "center",
            flexDirection: "row",
          }}
          accessibilityLabel="Open Filters"
        >
          <FadersHorizontal size={25} color={themeColors.purple} />
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
      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        groupName={groupName}
        setGroupName={setGroupName}
        groupDesc={groupDesc}
        setGroupDesc={setGroupDesc}
        mutualFriends={mutualFriends}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
        creating={creating}
        setCreating={setCreating}
        groupProfilePic={groupProfilePic}
        setGroupProfilePic={setGroupProfilePic}
        uploadingPic={uploadingPic}
        setUploadingPic={setUploadingPic}
        isPrivate={isPrivate}
        setIsPrivate={setIsPrivate}
        selectedIcon={selectedIcon}
        setSelectedIcon={setSelectedIcon}
        showIconModal={showIconModal}
        setShowIconModal={setShowIconModal}
        handleCreateGroup={handleCreateGroup}
        themeColors={themeColors}
      />
      {/* --- Friend Search Results (above group list) --- */}
      {groupSearch.length > 0 && friendSearchResults.length > 0 && (
        <View style={{ width: "100%", marginBottom: 8 }}>
          <Text
            style={{
              color: themeColors.purple,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
              marginBottom: 4,
            }}
          >
            Friends
          </Text>
          <FlatList
            data={friendSearchResults}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate("Profile", { uid: item.uid });
                }}
                style={{
                  backgroundColor: themeColors.white,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 1,
                  borderWidth: 0.5,
                  borderColor: themeColors.darkGray,
                }}
              >
                <Text
                  style={{
                    color: themeColors.black,
                    fontSize: 17,
                    fontWeight: "600",
                    fontFamily: "CarosSoft",
                  }}
                >
                  {item.firstName} {item.lastName}
                </Text>
                <Text
                  style={{
                    color: themeColors.darkGray,
                    marginTop: 4,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {item.email}
                </Text>
              </TouchableOpacity>
            )}
            style={{ width: "100%" }}
            ListEmptyComponent={null}
            scrollEnabled={false}
          />
        </View>
      )}
      {/* --- Suggested Users and Groups Dropdown --- */}
      {groupSearch.length === 0 && (
        <SuggestedPeopleAndGroups
          suggestedExpanded={suggestedExpanded}
          setSuggestedExpanded={setSuggestedExpanded}
          fetchFollowing={fetchFollowing}
          refreshSuggested={refreshSuggested}
          suggestedWithPics={suggestedWithPics}
          suggestedGroups={suggestedGroups}
          suggestedLoading={suggestedLoading}
          suggestedGroupsLoading={suggestedGroupsLoading}
          followingIds={followingIds}
          navigation={navigation}
          themeColors={themeColors}
          joiningGroups={joiningGroups}
          setJoiningGroups={setJoiningGroups}
          user={user}
        />
      )}
      {/* --- Main group list */}
      <GroupList
        loadingGroups={loadingGroups}
        groupSearch={groupSearch}
        groupSearchResults={groupSearchResults}
        sortedGroups={sortedGroups}
        favoriteGroups={favoriteGroups}
        allUsers={allUsers}
        user={user}
        navigation={navigation}
        themeColors={themeColors}
      />
      {/* Add Group Button */}
      <View
        style={{
          position: "absolute",
          bottom: 75,
          right: 22,
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
              color: showCreateModal ? themeColors.darkGray : themeColors.white,
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
    </View>
  );
}
