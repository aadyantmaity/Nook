import React, { useState } from "react";
import { FONTS } from "../../constants/fonts";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";

// Helper to format timestamp (expects alert to be { text, createdAt } or fallback)
function formatDate(ts) {
  if (!ts) return "";
  try {
    // Firestore Timestamp or JS Date or millis
    let dateObj;
    if (typeof ts === "object" && ts.toDate) dateObj = ts.toDate();
    else if (typeof ts === "number") dateObj = new Date(ts);
    else if (typeof ts === "string" && !isNaN(Number(ts)))
      dateObj = new Date(Number(ts));
    else dateObj = new Date(ts);
    return dateObj.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function AlertsModal({ visible, onClose, alerts, themeColors }) {
  // Support both array of strings and array of objects { text, createdAt }
  const parsedAlerts = Array.isArray(alerts)
    ? alerts.map((a, i) =>
        typeof a === "string"
          ? { text: a, createdAt: null, index: i }
          : { text: a.text, createdAt: a.createdAt, index: i }
      )
    : [];

  // Filter alerts to only those from today
  const today = new Date();
  const isSameDay = (dateObj) => {
    if (!dateObj) return false;
    const d = new Date(dateObj);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };
  const filteredAlerts = parsedAlerts.filter(
    (a) =>
      a.createdAt &&
      isSameDay(
        typeof a.createdAt === "object" && a.createdAt.toDate
          ? a.createdAt.toDate()
          : a.createdAt
      )
  );

  // State for expand/collapse per alert
  const [expanded, setExpanded] = useState({});

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
            width: "90%",
            maxWidth: 400,
            backgroundColor: themeColors.white,
            borderRadius: 12,
            padding: 18,
            alignItems: "center",
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
              fontSize: 20,
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 8,
              textAlign: "center",
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Location Alerts
          </Text>
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 14,
              marginBottom: 10,
              textAlign: "center",
              fontFamily: FONTS.PRIMARY,
            }}
          >
            {filteredAlerts.length === 1
              ? "1 alert"
              : `${filteredAlerts.length} alerts`}
          </Text>
          <ScrollView
            style={{ maxHeight: 260, width: "100%" }}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {filteredAlerts && filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert, index) => {
                const isLong = alert.text.length > 90;
                const isExpanded = expanded[index];
                const displayText =
                  isLong && !isExpanded
                    ? alert.text.slice(0, 90) + "…"
                    : alert.text;
                // Determine display date: use createdAt if present, else fallback to index order
                let addedLabel = "";

                addedLabel = `${formatDate(alert.createdAt)}`;

                return (
                  <View
                    key={index}
                    style={{
                      marginBottom: 14,
                      backgroundColor: themeColors.orange + "18",
                      borderRadius: 10,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "flex-start",
                      shadowColor: themeColors.orange,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.08,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          color: themeColors.black,
                          marginBottom: 2,
                          fontFamily: FONTS.PRIMARY,
                        }}
                      >
                        {displayText}
                        {isLong && (
                          <Text
                            style={{
                              color: themeColors.purple,
                              fontSize: 14,
                              fontWeight: "bold",
                              fontFamily: FONTS.PRIMARY,
                            }}
                            onPress={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [index]: !isExpanded,
                              }))
                            }
                          >
                            {isExpanded ? " Show less" : " Read more"}
                          </Text>
                        )}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: themeColors.darkGray,
                          marginTop: 2,
                          fontFamily: FONTS.PRIMARY,
                        }}
                      >
                        {addedLabel}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  color: themeColors.darkGray,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                No alerts available.
              </Text>
            )}
          </ScrollView>
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 10,
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: themeColors.white,
              borderRadius: 8,
              alignItems: "center",
              width: "70%",
              borderWidth: 1,
              borderColor: themeColors.purple,
            }}
          >
            <Text
              style={{
                color: themeColors.purple,
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
