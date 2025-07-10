import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { Check, X, Warning, Flag } from "phosphor-react-native"; // <-- import Flag icon
import { colors } from "../../constants/colors";
import { db, auth } from "../../firebaseConfig";
import { addDoc, collection, Timestamp } from "firebase/firestore";

export default function EmailVerificationModal({
  isVisible,
  onResendEmail,
  onCheckVerification,
  errorMessage,
  onBackToLogin,
}) {
  // --- Add state for report modal ---
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // --- Privacy Policy checkbox state ---
  const [privacyChecked, setPrivacyChecked] = useState(false);

  // --- Handler for submitting report ---
  const handleSubmitReport = async () => {
    if (!reportText.trim()) {
      Alert.alert("Please describe your issue.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "reports"), {
        spotId: null,
        spotName: null,
        report: `[Email Verification Issue] ${reportText}`,
        user: auth.currentUser?.uid || "Anonymous",
        createdAt: Timestamp.now(),
      });
      Alert.alert("Thank you!", "Your issue has been reported.");
      setReportText("");
      setShowReport(false);
    } catch (e) {
      Alert.alert("Error", "Failed to submit report.");
    }
    setSubmitting(false);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={() => {}}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* --- Main Modal --- */}
        <View
          style={{
            width: "100%",
            paddingHorizontal: 16,
            maxWidth: 420,
            alignSelf: "center",
          }}
        >
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 16,
              paddingTop: 0,
              paddingHorizontal: 0,
              paddingBottom: 18,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 12,
              elevation: 7,
              width: "100%",
              maxWidth: 400,
              overflow: "hidden",
            }}
          >
            {/* --- Flag icon button at top right --- */}
            <TouchableOpacity
              onPress={() => setShowReport(true)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 10,
                padding: 6,
                borderRadius: 16,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              accessibilityLabel="Report an Issue"
            >
              <Flag size={22} color={colors.purple} />
            </TouchableOpacity>
            {/* Add extra top padding to prevent cut-off */}
            <View style={{ height: 24, width: "100%" }} />

            <View
              style={{
                paddingHorizontal: 12,
                paddingTop: 6,
                width: "100%",
              }}
            >
              <View style={{ marginBottom: 2, width: "100%" }}>
                <Text
                  style={{
                    fontFamily: "CarosSoft",
                    fontWeight: "700",
                    fontSize: 20,
                    color: colors.purple,
                    marginBottom: 2,
                    textAlign: "center",
                  }}
                >
                  Secure your account
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "CarosSoft",
                    textAlign: "center",
                    color: colors.purple,
                    marginVertical: 2,
                    lineHeight: 19,
                  }}
                >
                  Please verify your email address to continue.
                </Text>
                {/* Add spam folder reminder */}
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "CarosSoft",
                    textAlign: "center",
                    color: colors.darkGray,
                    marginTop: 4,
                    marginBottom: 2,
                  }}
                >
                  Make sure to check your spam/junk folder.
                </Text>
              </View>
              {/* --- Privacy Policy Checkbox --- */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                  marginTop: 16,
                  width: "100%",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setPrivacyChecked((v) => !v)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      borderWidth: 1.5,
                      borderColor: colors.purple,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                      backgroundColor: privacyChecked
                        ? colors.purple
                        : colors.white,
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: privacyChecked }}
                  >
                    {privacyChecked && <Check size={16} color={colors.white} />}
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontFamily: "CarosSoft",
                      fontSize: 13,
                      color: colors.black,
                      flexShrink: 1,
                      flexWrap: "wrap",
                      textAlign: "left",
                    }}
                  >
                    I agree to the{" "}
                    <Text
                      style={{
                        color: colors.purple,
                        textDecorationLine: "underline",
                      }}
                      onPress={() =>
                        Linking.openURL(
                          "https://www.privacypolicies.com/live/35744bc7-0942-485b-bd9d-d9880ae92163"
                        )
                      }
                    >
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                </View>
              </View>
              {/* --- End Privacy Policy Checkbox --- */}
              <View style={{ marginBottom: 4 }}>
                {errorMessage && (
                  <Text
                    style={{
                      color: colors.red,
                      marginBottom: 2,
                      textAlign: "center",
                      fontFamily: "CarosSoft",
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {errorMessage}
                  </Text>
                )}
              </View>
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.lightGray,
                  width: "100%",
                  marginVertical: 8,
                  borderRadius: 1,
                }}
              />
              <View style={{ width: "100%" }}>
                <View
                  style={{
                    flexDirection: "row",
                    width: "100%",
                    marginBottom: 0,
                    gap: 8, // add some gap between buttons
                  }}
                >
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.purple,
                      height: 38,
                      borderRadius: 19,
                      justifyContent: "center",
                      alignItems: "center",
                      alignSelf: "center",
                      marginBottom: 0,
                      flex: 1,
                      opacity: privacyChecked ? 1 : 0.5,
                    }}
                    onPress={onCheckVerification}
                    activeOpacity={privacyChecked ? 0.85 : 1}
                    disabled={!privacyChecked}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: -4,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "CarosSoft",
                          fontSize: 15,
                          fontWeight: "500",
                          marginLeft: 4,
                          color: colors.white,
                        }}
                      >
                        I've Verified
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onBackToLogin}
                    style={{
                      backgroundColor: colors.red,
                      height: 38,
                      borderRadius: 19,
                      justifyContent: "center",
                      alignItems: "center",
                      alignSelf: "center",
                      marginBottom: 0,
                      flex: 1,
                    }}
                    activeOpacity={0.85}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "CarosSoft",
                          fontSize: 15,
                          fontWeight: "500",
                          marginLeft: 4,
                          color: colors.white,
                        }}
                      >
                        Back to Sign Up
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
                {/* --- Remove the old Report an Issue button from here --- */}
              </View>
            </View>
          </View>
        </View>
        {/* --- Report Modal --- */}
        {showReport && (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 100,
            }}
          >
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: 16,
                padding: 24,
                width: "85%",
                maxWidth: 400,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.black,
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  marginBottom: 12,
                  color: colors.black,
                  fontFamily: "CarosSoft",
                  textAlign: "center",
                }}
              >
                Report an Issue
              </Text>
              <TextInput
                placeholder="Describe your issue with email verification"
                placeholderTextColor={colors.darkGray}
                value={reportText}
                onChangeText={setReportText}
                style={{
                  borderWidth: 1,
                  borderColor: colors.darkGray,
                  borderRadius: 8,
                  padding: 12,
                  width: "100%",
                  marginBottom: 16,
                  color: colors.black,
                  backgroundColor: colors.white,
                  fontFamily: "CarosSoft",
                  minHeight: 60,
                  textAlignVertical: "top",
                }}
                multiline
                editable={!submitting}
              />
              <View
                style={{
                  flexDirection: "row",
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setShowReport(false);
                    setReportText("");
                  }}
                  disabled={submitting}
                  style={{
                    backgroundColor: colors.white,
                    borderRadius: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    alignItems: "center",
                    flex: 1,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: colors.purple,
                  }}
                >
                  <Text
                    style={{
                      color: colors.purple,
                      fontWeight: "bold",
                      fontFamily: "CarosSoft",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmitReport}
                  disabled={submitting}
                  style={{
                    backgroundColor: colors.purple,
                    borderRadius: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    alignItems: "center",
                    flex: 1,
                    marginLeft: 8,
                    opacity: submitting ? 0.7 : 1,
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={{
                      color: colors.white,
                      fontWeight: "bold",
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
