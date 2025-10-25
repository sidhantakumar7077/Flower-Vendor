// History.js
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator, LayoutAnimation, Platform, Pressable, RefreshControl,
    SectionList, StyleSheet, Text, UIManager, View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { base_url } from "../../../App";
import { useNavigation } from "@react-navigation/native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
    bg: "#F6F7FB",
    card: "#FFFFFF",
    text: "#0F172A",
    sub: "#475569",
    border: "#E5E7EB",
    chip: "#EEF2FF",
    chipText: "#4338CA",
    primary: "#10B981",
    danger: "#EF4444",
};

const formatDate = (iso) => {
    if (!iso) return "Unknown";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};
const formatTime = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
const cur = (n) => Number(n || 0).toLocaleString(undefined, { style: "currency", currency: "INR" });

export default function History() {
    const navigation = useNavigation(); // requested
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [rows, setRows] = useState([]);
    const [collapsed, setCollapsed] = useState({}); // date -> boolean

    const fetchHistory = async () => {
        const access_token = await AsyncStorage.getItem("storeAccesstoken");
        try {
            setLoading(true);
            setError("");
            // NEW history endpoint (per your Postman): /api/get-all-pickups
            const res = await fetch(`${base_url}api/get-all-pickups`, {
                headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error(`GET failed (${res.status})`);
            const json = await res.json();
            const list = Array.isArray(json?.data) ? json.data : [];
            setRows(list);
        } catch (e) {
            setError(e.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // group by pickup_date (date only)
    const sections = useMemo(() => {
        const map = new Map();
        rows.forEach((p) => {
            const key = formatDate(p.pickup_date || p.created_at);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(p);
        });
        return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
    }, [rows]);

    const toggle = (title) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCollapsed((s) => ({ ...s, [title]: !s[title] }));
    };

    const Item = ({ item }) => {
        const total = item?.flower_pickup_items?.reduce((s, it) => s + Number(it?.price || 0), 0) || 0;
        return (
            <View style={styles.card}>
                <View style={styles.rowBetween}>
                    <View>
                        <Text style={styles.id}>{item.pick_up_id}</Text>
                        <Text style={styles.muted}>Rider: {item?.rider?.rider_name || "—"}</Text>
                        <Text style={styles.muted}>Status: {item?.status || "—"}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.muted}>{formatDate(item.delivery_date)}</Text>
                        <Text style={styles.time}>{formatTime(item.delivery_date)}</Text>
                        <Text style={styles.total}>{cur(total)}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {(item.flower_pickup_items || []).map((it) => (
                    <View key={it.id} style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{it?.flower?.item_name || it?.flower?.name || it.flower_id}</Text>
                            <Text style={styles.muted}>Qty: {it.quantity} {it?.unit?.unit_name || ""}</Text>
                            <Text style={styles.subtle}>Flower ID: {it.flower_id}</Text>
                        </View>
                        <View style={{ width: 120, alignItems: "flex-end" }}>
                            <Text style={styles.muted}>Item Total</Text>
                            <Text style={styles.price}>{cur(it.price || 0)}</Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.title}>History</Text>

                {loading ? (
                    <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.subtle}>Fetching history…</Text></View>
                ) : error ? (
                    <View style={styles.center}><Text style={[styles.subtle, { color: COLORS.danger }]}>{error}</Text><Pressable onPress={fetchHistory} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>Retry</Text></Pressable></View>
                ) : (
                    <SectionList
                        sections={sections}
                        keyExtractor={(p) => String(p.id)}
                        stickySectionHeadersEnabled
                        renderSectionHeader={({ section: { title } }) => (
                            <Pressable onPress={() => toggle(title)} style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>{title}</Text>
                                <Text style={styles.sectionAction}>{collapsed[title] ? "Show" : "Hide"}</Text>
                            </Pressable>
                        )}
                        renderItem={({ item, section }) =>
                            collapsed[section.title] ? null : <Item item={item} />
                        }
                        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchHistory} />}
                        ListEmptyComponent={<View style={styles.center}><Text style={styles.subtle}>No history yet.</Text></View>}
                        contentContainerStyle={{ paddingBottom: 24 }}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    container: { flex: 1, padding: 16 },
    title: { color: COLORS.text, fontSize: 24, fontWeight: "800", marginBottom: 12 },

    center: { paddingVertical: 40, alignItems: "center" },
    subtle: { color: COLORS.sub },

    sectionHeader: {
        backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border,
        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginTop: 8,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    sectionTitle: { fontWeight: "800", color: COLORS.text },
    sectionAction: { color: COLORS.primary, fontWeight: "800" },

    card: {
        backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginTop: 8,
        borderWidth: 1, borderColor: COLORS.border, elevation: 2,
    },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    id: { fontWeight: "800", color: COLORS.text, marginBottom: 4 },
    muted: { color: COLORS.sub },
    time: { color: COLORS.text, fontWeight: "700", marginTop: 2 },
    total: { color: COLORS.text, fontWeight: "900", marginTop: 4 },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },

    itemRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
    itemName: { color: COLORS.text, fontWeight: "800" },
    price: { color: COLORS.text, fontWeight: "900", marginTop: 2 },
    secondaryBtn: { marginTop: 8, backgroundColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
    secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
});