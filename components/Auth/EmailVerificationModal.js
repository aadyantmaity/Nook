import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  AppState,
} from "react-native";
import {
  Check,
  X,
  Warning,
  Flag,
  ArrowCounterClockwise,
} from "phosphor-react-native"; // <-- import ArrowCounterClockwise icon
import { colors } from "../../constants/colors";
import { db, auth } from "../../firebaseConfig";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { FONTS } from "../../constants/fonts";

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

  // --- State to track if verification has been attempted and failed ---
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);

  // --- State for resend email cooldown ---
  const [isResendCooldown, setIsResendCooldown] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);
  const [cooldownEndTime, setCooldownEndTime] = useState(null);
  const [resendError, setResendError] = useState("");

  // --- Custom handler for verification check ---
  const handleVerificationCheck = async () => {
    try {
      await onCheckVerification();
      // If no error is thrown, verification was successful
      setHasAttemptedVerification(false);
    } catch (error) {
      // If there's an error, mark that verification was attempted
      setHasAttemptedVerification(true);
    }
  };

  // --- Custom handler for resend email with cooldown ---
  const handleResendEmail = async () => {
    if (isResendCooldown) return;
    
    setResendError(""); // Clear any previous errors
    
    try {
      await onResendEmail();
      // Start cooldown after successful send
      const endTime = Date.now() + 30000; // 30 seconds from now
      setCooldownEndTime(endTime);
      setIsResendCooldown(true);
      setResendError(""); // Clear any errors on success
    } catch (error) {
      // Handle Firebase cooldown error
      if (error.code === 'auth/too-many-requests') {
        setResendError("Please wait a moment before requesting another email.");
        // Start a shorter cooldown for UI feedback
        const endTime = Date.now() + 30000; // 30 seconds from now
        setCooldownEndTime(endTime);
        setIsResendCooldown(true);
      } else {
        setResendError("Failed to send email. Please try again.");
      }
    }
  };

  // --- Effect to track error messages (indicating failed verification attempts) ---
  useEffect(() => {
    if (errorMessage) {
      setHasAttemptedVerification(true);
    }
  }, [errorMessage]);

  // --- Reset state when modal becomes visible ---
  useEffect(() => {
    if (isVisible) {
      setHasAttemptedVerification(false);
      setIsResendCooldown(false);
      setCooldownTimeLeft(0);
      setCooldownEndTime(null);
      setResendError("");
    }
  }, [isVisible]);

  // --- Function to calculate remaining cooldown time ---
  const calculateRemainingTime = () => {
    if (!cooldownEndTime) return 0;
    const remaining = Math.max(0, Math.ceil((cooldownEndTime - Date.now()) / 1000));
    return remaining;
  };

  // --- Cooldown timer effect with background support ---
  useEffect(() => {
    let interval;
    
    const updateTimer = () => {
      if (isResendCooldown && cooldownEndTime) {
        const remaining = calculateRemainingTime();
        setCooldownTimeLeft(remaining);
        
        if (remaining <= 0) {
          setIsResendCooldown(false);
          setCooldownEndTime(null);
        }
      }
    };

    if (isResendCooldown && cooldownEndTime) {
      // Update immediately
      updateTimer();
      
      // Then update every second
      interval = setInterval(updateTimer, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isResendCooldown, cooldownEndTime]);

  // --- App state change handler for background/foreground ---
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && isResendCooldown && cooldownEndTime) {
        // App came to foreground, recalculate remaining time
        const remaining = calculateRemainingTime();
        setCooldownTimeLeft(remaining);
        
        if (remaining <= 0) {
          setIsResendCooldown(false);
          setCooldownEndTime(null);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [isResendCooldown, cooldownEndTime]);

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
            {/* --- Row for Resend Email and Flag --- */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                paddingHorizontal: 16,
                paddingTop: 16,
                marginBottom: 2,
              }}
            >
              <TouchableOpacity
                onPress={handleResendEmail}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 6,
                  borderRadius: 16,
                  opacity: isResendCooldown ? 0.5 : 1,
                  shadowColor: "#000",

                  shadowOffset: {
                    width: 0,
                    height: 2
                  },

                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={isResendCooldown ? 1 : 0.7}
                disabled={isResendCooldown}
                accessibilityLabel={isResendCooldown ? `Resend Email (${cooldownTimeLeft}s)` : "Resend Email"}
              >
                <ArrowCounterClockwise size={22} color={colors.purple} />
                <Text
                  style={{
                    marginLeft: 4,
                    color: colors.purple,
                    fontFamily: FONTS.PRIMARY,
                    fontSize: 13,
                    fontWeight: "bold",
                  }}
                >
                  {isResendCooldown ? `Resend (${cooldownTimeLeft}s)` : "Resend Email"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowReport(true)}
                style={{
                  padding: 6,
                  borderRadius: 16,
                  shadowColor: "#000",

                  shadowOffset: {
                    width: 0,
                    height: 2
                  },

                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
                accessibilityLabel="Report an Issue"
              >
                <Flag size={22} color={colors.purple} />
              </TouchableOpacity>
            </View>

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
                    fontFamily: FONTS.PRIMARY,
                    fontWeight: "700",
                    fontSize: 20,
                    color: colors.purple,
                    marginBottom: 2,
                    textAlign: "center",
                  }}
                >
                  Almost there!
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: FONTS.PRIMARY,
                    textAlign: "center",
                    color: colors.purple,
                    marginVertical: 2,
                    lineHeight: 19,
                  }}
                >
                  Please verify your email address to continue.
                </Text>
                {/* Add spam folder reminder with more emphasis */}
                <View
                  style={{
                    backgroundColor: colors.red + "15", // Light red background
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    marginTop: 8,
                    marginBottom: 4,
                    borderLeftWidth: 3,
                    borderLeftColor: colors.red,
                    borderRightWidth: 3,
                    borderRightColor: colors.red,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: FONTS.PRIMARY,
                      textAlign: "center",
                      color: colors.red,
                      fontWeight: "600",
                      lineHeight: 18,
                    }}
                  >
                    ⚠️ Check your spam/junk folder!
                  </Text>
                </View>
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
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,

                      backgroundColor: privacyChecked
                        ? colors.purple
                        : colors.white,

                      shadowColor: "#000",

                      shadowOffset: {
                        width: 0,
                        height: 2
                      },

                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: privacyChecked }}
                  >
                    {privacyChecked && <Check size={16} color={colors.white} />}
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontFamily: FONTS.PRIMARY,
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
                      fontFamily: FONTS.PRIMARY,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {errorMessage}
                  </Text>
                )}
                {resendError && (
                  <Text
                    style={{
                      color: colors.red,
                      marginBottom: 2,
                      textAlign: "center",
                      fontFamily: FONTS.PRIMARY,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {resendError}
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
                      shadowColor: colors.black,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                    onPress={handleVerificationCheck}
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
                          fontFamily: FONTS.PRIMARY,
                          fontSize: 15,
                          fontWeight: "500",
                          marginLeft: 4,
                          color: !privacyChecked
                            ? colors.darkGray
                            : colors.white,
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
                      shadowColor: colors.black,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4,
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
                          fontFamily: FONTS.PRIMARY,
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
                  fontFamily: FONTS.PRIMARY,
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
                  fontFamily: FONTS.PRIMARY,
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
                    shadowColor: "#000",

                    shadowOffset: {
                      width: 0,
                      height: 2
                    },

                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4
                  }}
                >
                  <Text
                    style={{
                      color: colors.purple,
                      fontWeight: "bold",
                      fontFamily: FONTS.PRIMARY,
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
                    shadowColor: "#000",

                    shadowOffset: {
                      width: 0,
                      height: 2
                    },

                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={{
                      color: colors.white,
                      fontWeight: "bold",
                      fontFamily: FONTS.PRIMARY,
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
