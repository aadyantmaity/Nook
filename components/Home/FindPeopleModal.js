import React, { useState, useContext, useEffect, useRef } from "react";
import {
  Modal,
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { db, auth } from "../firebaseConfig";
import { collection, getDocs, query } from "firebase/firestore";
import { colors } from "../constants/colors";
import { ThemeContext } from "../App";
import { MagnifyingGlass, X } from "phosphor-react-native";
import { useNavigation } from "@react-navigation/native";

export default function FindPeopleModal({
  visible,
  onClose,
  themeColors: propColors,
  closeOnBackgroundPress = false,
  asScreen = false, // <-- new prop
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const themeCtx = useContext(ThemeContext);
  const themeColors = propColors ?? themeCtx?.themeColors ?? colors;
  const navigation = useNavigation();

  // --- Debounce logic ---
  const debounceTimer = useRef(null);

  // Debounced search effect
  useEffect(() => {
    if (!visible) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!search.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceTimer.current = setTimeout(() => {
      handleSearch();
    }, 2000);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line
  }, [search, visible]);

  // Reset state when modal is opened
  useEffect(() => {
    if (visible) {
      setSearch("");
      setResults([]);
      setLoading(false);
    }
  }, [visible]);

  // Only triggers on submit (for keyboard search button)
  const handleSearch = async () => {
    const s = search.trim().toLowerCase();
    if (!s) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, "users"));
      const snap = await getDocs(q);
      const filtered = snap.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter(
          (u) =>
            (u.email && u.email.toLowerCase().includes(s)) ||
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(s)
        )
        .filter((u) => u.uid !== auth.currentUser?.uid);
      setResults(filtered);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Render as full screen if asScreen is true ---
  if (asScreen) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.white,
          paddingTop: 24,
          alignItems: "center",
        }}
      >
        {/* Copy the content of the modal here, but without Modal/KeyboardAvoidingView */}
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 16,
            padding: 24,
            width: "92%",
            maxWidth: 600,
            alignItems: "center",
            marginTop: 8, // reduced from 24 to 8
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            Find People
          </Text>
          <View style={{ width: "100%", marginBottom: 12, marginTop: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: themeColors.gray,
                borderRadius: 12,
                paddingHorizontal: 12,
                backgroundColor: themeColors.lightGray || "#f7f7f7",
                marginBottom: 8,
              }}
            >
              <TextInput
                placeholder="Search by name or email"
                value={search}
                onChangeText={setSearch}
                style={{
                  flex: 1,
                  height: 44,
                  fontSize: 16,
                  color: themeColors.black,
                }}
                returnKeyType="search"
                placeholderTextColor={themeColors.darkGray}
              />
              <TouchableOpacity
                onPress={() => {
                  if (debounceTimer.current)
                    clearTimeout(debounceTimer.current);
                  handleSearch();
                }}
              >
                <MagnifyingGlass size={24} color={themeColors.purple} />
              </TouchableOpacity>
            </View>
          </View>
          {loading && (
            <ActivityIndicator
              size="large"
              color={themeColors.purple}
              style={{ marginTop: 8 }}
            />
          )}
          {!loading && results.length === 0 && search.length > 0 && (
            <Text
              style={{
                textAlign: "center",
                marginTop: 12,
                fontSize: 16,
                color: themeColors.gray,
              }}
            >
              No users found.
            </Text>
          )}
          <FlatList
            data={results}
            contentContainerStyle={{ paddingBottom: 8 }}
            keyExtractor={(item) => item.uid}
            style={{ width: "100%" }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onClose && onClose();
                  setTimeout(
                    () => navigation.navigate("Profile", { uid: item.uid }),
                    200
                  );
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
                  borderColor: themeColors.lightGray,
                }}
              >
                <Text
                  style={{
                    color: themeColors.black,
                    fontSize: 17,
                    fontWeight: "600",
                  }}
                >
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={{ color: themeColors.darkGray, marginTop: 4 }}>
                  {item.email}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Use Pressable for background if closeOnBackgroundPress is true */}
        {closeOnBackgroundPress ? (
          <Pressable
            style={{
              flex: 1,
              width: "100%",
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={onClose}
          >
            <Pressable
              style={{
                backgroundColor: themeColors.white,
                borderRadius: 16,
                padding: 24,
                width: "92%",
                maxHeight: "90%",
                alignItems: "center",
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ width: "100%", alignItems: "flex-end" }}>
                <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                  <X size={22} color={themeColors.purple} weight="bold" />
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  color: themeColors.purple,
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                Find People
              </Text>
              <View style={{ width: "100%", marginBottom: 12, marginTop: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: themeColors.gray,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: themeColors.lightGray || "#f7f7f7",
                    marginBottom: 8,
                  }}
                >
                  <TextInput
                    placeholder="Search by name or email"
                    value={search}
                    onChangeText={setSearch}
                    style={{
                      flex: 1,
                      height: 44,
                      fontSize: 16,
                      color: themeColors.black,
                    }}
                    // Remove onSubmitEditing, search is now debounced
                    returnKeyType="search"
                    placeholderTextColor={themeColors.darkGray}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (debounceTimer.current)
                        clearTimeout(debounceTimer.current);
                      handleSearch();
                    }}
                  >
                    <MagnifyingGlass size={24} color={themeColors.purple} />
                  </TouchableOpacity>
                </View>
              </View>
              {loading && (
                <ActivityIndicator
                  size="large"
                  color={themeColors.purple}
                  style={{ marginTop: 8 }}
                />
              )}
              {!loading && results.length === 0 && search.length > 0 && (
                <Text
                  style={{
                    textAlign: "center",
                    marginTop: 12,
                    fontSize: 16,
                    color: themeColors.gray,
                  }}
                >
                  No users found.
                </Text>
              )}
              <FlatList
                data={results}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyExtractor={(item) => item.uid}
                style={{ width: "100%" }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      setTimeout(
                        () => navigation.navigate("Profile", { uid: item.uid }),
                        200
                      );
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
                      borderColor: themeColors.lightGray,
                    }}
                  >
                    <Text
                      style={{
                        color: themeColors.black,
                        fontSize: 17,
                        fontWeight: "600",
                      }}
                    >
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={{ color: themeColors.darkGray, marginTop: 4 }}>
                      {item.email}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </Pressable>
          </Pressable>
        ) : (
          // fallback to original modal content if not using background close
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 24,
              width: "92%",
              maxHeight: "90%",
              alignItems: "center",
            }}
          >
            <View style={{ width: "100%", alignItems: "flex-end" }}>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X size={22} color={themeColors.purple} weight="bold" />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              Find People
            </Text>
            <View style={{ width: "100%", marginBottom: 12, marginTop: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: themeColors.gray,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  backgroundColor: themeColors.lightGray || "#f7f7f7",
                  marginBottom: 8,
                }}
              >
                <TextInput
                  placeholder="Search by name or email"
                  value={search}
                  onChangeText={setSearch}
                  style={{
                    flex: 1,
                    height: 44,
                    fontSize: 16,
                    color: themeColors.black,
                  }}
                  // Remove onSubmitEditing, search is now debounced
                  returnKeyType="search"
                  placeholderTextColor={themeColors.darkGray}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (debounceTimer.current)
                      clearTimeout(debounceTimer.current);
                    handleSearch();
                  }}
                >
                  <MagnifyingGlass size={24} color={themeColors.purple} />
                </TouchableOpacity>
              </View>
            </View>
            {loading && (
              <ActivityIndicator
                size="large"
                color={themeColors.purple}
                style={{ marginTop: 8 }}
              />
            )}
            {!loading && results.length === 0 && search.length > 0 && (
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 12,
                  fontSize: 16,
                  color: themeColors.gray,
                }}
              >
                No users found.
              </Text>
            )}
            <FlatList
              data={results}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyExtractor={(item) => item.uid}
              style={{ width: "100%" }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    setTimeout(
                      () => navigation.navigate("Profile", { uid: item.uid }),
                      200
                    );
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
                    borderColor: themeColors.lightGray,
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.black,
                      fontSize: 17,
                      fontWeight: "600",
                    }}
                  >
                    {item.firstName} {item.lastName}
                  </Text>
                  <Text style={{ color: themeColors.darkGray, marginTop: 4 }}>
                    {item.email}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
