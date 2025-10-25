// VendorProfile.js
import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, StyleSheet, ActivityIndicator, Pressable, Alert,
    ScrollView, RefreshControl, Linking, Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// import Clipboard from "@react-native-clipboard/clipboard";
import { base_url } from "../../../App";
import { useNavigation, CommonActions } from "@react-navigation/native";

const COLORS = {
    bg: "#F6F7FB",
    card: "#FFFFFF",
    text: "#0F172A",
    sub: "#475569",
    border: "#E5E7EB",
    primary: "#10B981",
    primaryDark: "#0EA371",
    danger: "#EF4444",
    chip: "#ECFDF5",
    chipText: "#065F46",
    pill: "#EEF2FF",
    pillText: "#4338CA",
};

export default function VendorProfile() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");
    const [showLogout, setShowLogout] = useState(false); // <— modal flag

    const fetchProfile = async () => {
        const access_token = await AsyncStorage.getItem("storeAccesstoken");
        try {
            setError("");
            const res = await fetch(`${base_url}api/get-vendor-details`, {
                headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error(`GET failed (${res.status})`);
            const json = await res.json();
            setProfile(json?.data || null);
        } catch (e) {
            setError(e.message || "Failed to load profile.");
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchProfile().finally(() => setLoading(false));
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchProfile().finally(() => setRefreshing(false));
    }, []);

    const initials = (name = "") =>
        name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

    // const copy = (text) => {
    //     Clipboard.setString(String(text || ""));
    //     Alert.alert("Copied", "Vendor ID copied.");
    // };

    const dial = (phone) => phone && Linking.openURL(`tel:${phone}`);
    const emailTo = (email) => email && Linking.openURL(`mailto:${email}`);

    // ---- Logout handlers ----
    const confirmLogout = async () => {
        try {
            await AsyncStorage.multiRemove(["storeAccesstoken"]);
        } catch { }
        setShowLogout(false);
        // Reset stack to Login so back button can't return to Home
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: "Login" }], // ⬅️ change this if your route name differs
            })
        );
    };

    return (
        <View style={styles.safe}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.subtle}>Loading profile…</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={[styles.subtle, { color: COLORS.danger }]}>{error}</Text>
                    <Pressable onPress={fetchProfile} style={styles.secondaryBtn}>
                        <Text style={styles.secondaryBtnText}>Retry</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {/* Hero */}
                    <View style={styles.hero}>
                        <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials(profile?.vendor_name)}</Text></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{profile?.vendor_name || "—"}</Text>
                            <View style={styles.rowWrap}>
                                <View style={styles.chip}><Text style={styles.chipTxt}>{profile?.vendor_category || "—"}</Text></View>
                                <View style={styles.pill}><Text style={styles.pillTxt}>{profile?.status || "—"}</Text></View>
                            </View>
                            {/* <Pressable onPress={() => copy(profile?.vendor_id)} style={styles.idRow}>
                                <Text style={styles.idLabel}>Vendor ID</Text>
                                <Text style={styles.idValue}>{profile?.vendor_id}</Text>
                                <Text style={styles.copy}>⧉</Text>
                            </Pressable> */}
                        </View>
                    </View>

                    {/* Quick actions */}
                    <View style={styles.actionsRow}>
                        <Action label="Call" icon="📞" onPress={() => dial(profile?.phone_no)} />
                        <Action label="Email" icon="✉️" onPress={() => emailTo(profile?.email_id)} />
                        <Action label="Payment" icon="💳" disabled text={profile?.payment_type || "—"} />
                    </View>

                    {/* Details */}
                    <View style={styles.card}>
                        <Field k="Phone" v={profile?.phone_no} onPress={() => dial(profile?.phone_no)} />
                        <Field k="Email" v={profile?.email_id} onPress={() => emailTo(profile?.email_id)} />
                        <Field k="Address" v={profile?.vendor_address} />
                        {/* <Field k="GST" v={profile?.vendor_gst || "—"} />
                        <Field k="Joined" v={profile?.date_of_joining || "—"} /> */}
                    </View>

                    {/* Price sections (empty state shown) */}
                    <Text style={styles.sectionTitle}>Current Monthly Prices</Text>
                    <View style={styles.empty}><Text style={styles.emptyTxt}>No current month pricing yet.</Text></View>

                    <Text style={styles.sectionTitle}>All Monthly Prices</Text>
                    <View style={styles.empty}><Text style={styles.emptyTxt}>No historical pricing data.</Text></View>

                    {/* Logout button opens modal */}
                    <Pressable onPress={() => setShowLogout(true)} style={styles.logout}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </Pressable>
                </ScrollView>
            )}

            {/* Confirmation Modal */}
            <Modal transparent visible={showLogout} animationType="fade" onRequestClose={() => setShowLogout(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Logout</Text>
                        <Text style={styles.modalMsg}>Are you sure you want to log out?</Text>
                        <View style={styles.modalRow}>
                            <Pressable onPress={() => setShowLogout(false)} style={[styles.modalBtn, styles.modalCancel]}>
                                <Text style={[styles.modalBtnText, { color: COLORS.text }]}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={confirmLogout} style={[styles.modalBtn, styles.modalDanger]}>
                                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Logout</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function Action({ label, icon, onPress, disabled, text }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.action,
                pressed && { transform: [{ scale: 0.98 }] },
                disabled && { opacity: 0.6 },
            ]}
        >
            <Text style={styles.actionIcon}>{icon}</Text>
            <Text style={styles.actionLabel}>{text || label}</Text>
        </Pressable>
    );
}

function Field({ k, v, onPress }) {
    return (
        <Pressable onPress={onPress} disabled={!onPress} style={styles.field}>
            <Text style={styles.fieldK}>{k}</Text>
            <Text style={styles.fieldV} numberOfLines={2}>{v || "—"}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
    subtle: { color: COLORS.sub },

    hero: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, elevation: 2 },
    avatar: { width: 64, height: 64, borderRadius: 999, backgroundColor: "#DEF7EC", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#C7F0E3" },
    avatarTxt: { color: COLORS.primaryDark, fontWeight: "900", fontSize: 20 },
    name: { color: COLORS.text, fontWeight: "900", fontSize: 18 },
    rowWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
    chip: { backgroundColor: COLORS.chip, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: "#A7F3D0" },
    chipTxt: { color: COLORS.chipText, fontWeight: "800", fontSize: 12 },
    pill: { backgroundColor: COLORS.pill, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border },
    pillTxt: { color: COLORS.pillText, fontWeight: "800", fontSize: 12 },
    idRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
    idLabel: { color: COLORS.sub, fontWeight: "700" },
    idValue: { color: COLORS.text, fontWeight: "900" },
    copy: { marginLeft: "auto", color: COLORS.sub, fontWeight: "900" },

    actionsRow: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 6 },
    action: { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", gap: 6, elevation: 1 },
    actionIcon: { fontSize: 16 },
    actionLabel: { color: COLORS.text, fontWeight: "800" },

    card: { backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, marginTop: 10 },
    field: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    fieldK: { color: COLORS.sub, marginBottom: 4, fontWeight: "700" },
    fieldV: { color: COLORS.text, fontWeight: "900" },

    sectionTitle: { color: COLORS.sub, fontWeight: "900", marginTop: 14, marginBottom: 8 },
    empty: { backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: COLORS.border, padding: 14, borderRadius: 14, marginTop: 6 },
    emptyTxt: { color: COLORS.sub, fontWeight: "700" },

    logout: { marginTop: 16, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center", elevation: 2 },
    logoutText: { color: "#FFFFFF", fontWeight: "900" },
    secondaryBtn: { marginTop: 8, backgroundColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
    secondaryBtnText: { color: COLORS.text, fontWeight: "800" },

    // Modal styles
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 24 },
    modalCard: { backgroundColor: "#fff", width: "100%", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
    modalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
    modalMsg: { color: COLORS.sub, marginTop: 6 },
    modalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
    modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
    modalCancel: { backgroundColor: "#F8FAFC" },
    modalDanger: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
    modalBtnText: { fontWeight: "800" },
});