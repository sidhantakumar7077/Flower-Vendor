// TodayOrders.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    UIManager,
    View,
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
    primaryDark: "#0EA371",
    danger: "#EF4444",
    mutedCard: "#F8FAFC",
};

export default function TodayOrders() {
    
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [pickups, setPickups] = useState([]);
    const [vendorData, setVendorData] = useState(null);

    // unit prices only; totals are derived
    const [unitDrafts, setUnitDrafts] = useState({}); // { [pick_up_id]: { [itemId]: "unitPrice" } }

    const fetchPickups = async () => {
        const access_token = await AsyncStorage.getItem("storeAccesstoken");
        try {
            setLoading(true);
            setError("");
            const res = await fetch(`${base_url}api/vendor-pickups`, {
                headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error(`GET failed (${res.status})`);
            const json = await res.json();
            const list = Array.isArray(json?.data) ? json.data : [];
            setPickups(list);
            setVendorData(json?.vendor || null);

            // seed drafts
            const seeded = {};
            list.forEach((p) => {
                const m = {};
                (p.flower_pickup_items || []).forEach((it) => {
                    m[it.id] = it.price !== null && it.price !== undefined ? String(it.price) : "";
                });
                seeded[p.pick_up_id] = m;
            });
            setUnitDrafts(seeded);
        } catch (e) {
            setError(e.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPickups();
    }, []);

    const isToday = (iso) => {
        if (!iso) return false;
        const d = new Date(iso);
        const n = new Date();
        return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
    };

    const todaysPickups = useMemo(
        () => pickups.filter((p) => isToday(p.pickup_date) || (!p.pickup_date && isToday(p.created_at))),
        [pickups]
    );

    const formatDT = (iso) => (!iso ? "—" : new Date(iso).toLocaleString().replace(",", " ·"));
    const formatCurrency = (n) =>
        Number(n || 0).toLocaleString(undefined, { style: "currency", currency: "INR" });

    // submit using { price (per-unit), total_price } for each item
    const submitPrices = async (pickup, localUnits) => {
        const access_token = await AsyncStorage.getItem("storeAccesstoken");
        try {
            setSubmitting(true);
            const items = pickup.flower_pickup_items || [];

            const payloadItems = items.map((it) => {
                const qty = parseFloat(it.quantity ?? "0") || 0;
                const unit =
                    localUnits[it.id] !== undefined && localUnits[it.id] !== ""
                        ? Number(localUnits[it.id])
                        : Number(it.price || 0);
                const itemTotal = Number.isFinite(unit * qty) ? Number((unit * qty).toFixed(2)) : 0;
                return {
                    id: it.id,
                    flower_id: it.flower_id,
                    price: Number.isFinite(unit) ? unit : 0,
                    total_price: itemTotal,
                };
            });

            const total = payloadItems.reduce((s, it) => s + (Number(it.total_price) || 0), 0);
            const body = { total_price: Number(total.toFixed(2)), flower_pickup_items: payloadItems };

            const res = await fetch(`${base_url}api/update-flower-prices/${pickup.pick_up_id}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const t = await res.text();
                throw new Error(`POST failed (${res.status}): ${t}`);
            }
            Alert.alert("Success", "Prices updated successfully.");
            fetchPickups();
        } catch (e) {
            Alert.alert("Error", e.message || "Failed to update prices.");
        } finally {
            setSubmitting(false);
        }
    };

    const Meta = ({ label, value }) => (
        <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>{label}</Text>
            <Text style={styles.metaVal}>{value || "—"}</Text>
        </View>
    );

    const Card = ({ pickup, index }) => {
        const a = useRef(new Animated.Value(0)).current;
        useEffect(() => {
            Animated.timing(a, { toValue: 1, duration: 260, delay: index * 60, useNativeDriver: true }).start();
        }, [a, index]);

        const [localUnits, setLocalUnits] = useState(() => unitDrafts[pickup.pick_up_id] || {});
        useEffect(() => {
            if (!Object.keys(localUnits).length && unitDrafts[pickup.pick_up_id]) {
                setLocalUnits(unitDrafts[pickup.pick_up_id]);
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [unitDrafts, pickup.pick_up_id]);

        const computeItemTotal = (it) => {
            const qty = parseFloat(it.quantity ?? "0") || 0;
            const unit =
                localUnits[it.id] !== undefined && localUnits[it.id] !== ""
                    ? parseFloat(localUnits[it.id])
                    : parseFloat(it.price ?? "0") || 0;
            const tot = unit * qty;
            return Number.isFinite(tot) ? tot : 0;
        };

        const computeCardTotal = () => {
            const items = pickup.flower_pickup_items || [];
            return items.reduce((acc, it) => acc + computeItemTotal(it), 0);
        };

        return (
            <Animated.View
                style={{
                    opacity: a,
                    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                }}
            >
                <View style={styles.card}>
                    {/* header */}
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.vendorName}>{vendorData?.vendor_name || "—"}</Text>
                            <Text style={styles.metaText}>
                                Rider: <Text style={styles.metaStrong}>{pickup?.rider?.rider_name || "—"}</Text>
                            </Text>
                        </View>
                        <View style={styles.statusPill}>
                            <Text style={styles.statusText}>{pickup.status || "—"}</Text>
                        </View>
                    </View>

                    {/* chips */}
                    <View style={styles.chipsRow}>
                        <Meta label="Pickup" value={formatDT(pickup.pickup_date)} />
                        {/* <Meta label="Delivery" value={formatDT(pickup.delivery_date)} /> */}
                        <Meta label="Payment" value={pickup.payment_status || "—"} />
                    </View>

                    {/* items */}
                    <View style={styles.itemsWrap}>
                        {(pickup.flower_pickup_items || []).map((it) => {
                            const unitVal = localUnits[it.id] ?? "";
                            const itemTotal = computeItemTotal(it);
                            return (
                                <View key={it.id} style={styles.itemCard}>
                                    {/* row 1: name + qty */}
                                    <View style={styles.itemTopRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemName}>
                                                {it?.flower?.item_name || it?.flower?.name || it.flower_id}
                                            </Text>
                                            <Text style={styles.itemMeta}>
                                                Qty: {it.quantity} {it?.unit?.unit_name || ""}
                                            </Text>
                                        </View>
                                        <Text style={styles.itemIdText}>#{it.flower_id}</Text>
                                    </View>

                                    {/* row 2: 2-column (unit input | total) */}
                                    <View style={styles.itemBottomRow}>
                                        {/* left: unit input */}
                                        <View style={[styles.col, { marginRight: 8 }]}>
                                            <Text style={styles.labelSmall}>Price / Unit (₹)</Text>
                                            <View style={styles.inputWrap}>
                                                <View style={styles.prefix}>
                                                    <Text style={styles.prefixText}>₹</Text>
                                                </View>
                                                <TextInput
                                                    style={styles.input}
                                                    value={unitVal}
                                                    placeholder="0.00"
                                                    placeholderTextColor="#94A3B8"
                                                    keyboardType="decimal-pad"
                                                    blurOnSubmit={false}
                                                    onChangeText={(txt) => setLocalUnits((prev) => ({ ...prev, [it.id]: txt }))}
                                                />
                                            </View>
                                        </View>

                                        {/* right: total */}
                                        <View style={[styles.col, { alignItems: "flex-end", marginLeft: 8 }]}>
                                            <Text style={styles.labelSmall}>Item Total</Text>
                                            <Text style={styles.priceValue}>{formatCurrency(itemTotal)}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* footer total + action */}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Calculated Total</Text>
                        <Text style={styles.totalValue}>{formatCurrency(computeCardTotal())}</Text>
                    </View>

                    <Pressable
                        onPress={() => submitPrices(pickup, localUnits)}
                        disabled={submitting}
                        style={({ pressed }) => [
                            styles.primaryBtn,
                            pressed && { transform: [{ scale: 0.995 }] },
                            submitting && { opacity: 0.6 },
                        ]}
                    >
                        <Text style={styles.primaryBtnText}>{submitting ? "Submitting..." : "Update Flower Prices"}</Text>
                    </Pressable>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.safe}>
            <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
                <View style={styles.container}>
                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.subtle}>Fetching pickups…</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.center}>
                            <Text style={[styles.subtle, { color: COLORS.danger }]}>{error}</Text>
                            <Pressable onPress={fetchPickups} style={styles.secondaryBtn}>
                                <Text style={styles.secondaryBtnText}>Retry</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <FlatList
                            data={todaysPickups}
                            keyExtractor={(p) => String(p.id)}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item, index }) => <Card pickup={item} index={index} />}
                            ListEmptyComponent={
                                <View style={styles.center}>
                                    <Text style={styles.subtle}>No pickups for today.</Text>
                                </View>
                            }
                            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPickups} />}
                            contentContainerStyle={{ paddingBottom: 24 }}
                            keyboardShouldPersistTaps="always"
                            removeClippedSubviews={false}
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    container: { flex: 1, padding: 16 },
    center: { paddingVertical: 40, alignItems: "center" },
    subtle: { color: COLORS.sub },

    /* Card */
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
    },

    /* Header */
    headerRow: { flexDirection: "row", alignItems: "center" },
    vendorName: { color: COLORS.text, fontWeight: "900", fontSize: 18 },
    metaText: { color: COLORS.sub, marginTop: 2 },
    metaStrong: { color: COLORS.text, fontWeight: "700" },
    statusPill: {
        backgroundColor: COLORS.chip,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginLeft: 10,
    },
    statusText: { color: COLORS.chipText, fontWeight: "700", fontSize: 12 },

    /* Meta chips row */
    chipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10,
    },
    metaChip: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    metaLabel: { color: COLORS.sub, fontSize: 12 },
    metaVal: { color: COLORS.text, fontWeight: "800", marginTop: 2 },

    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },

    /* Items */
    itemsWrap: { marginTop: 12 },
    itemCard: {
        backgroundColor: COLORS.mutedCard,
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
    },
    itemTopRow: { flexDirection: "row", alignItems: "flex-start" },
    itemName: { color: COLORS.text, fontWeight: "800" },
    itemMeta: { color: COLORS.text, opacity: 0.8, marginTop: 2 },
    itemIdText: { color: COLORS.sub, fontSize: 12, marginLeft: 8 },

    itemBottomRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginTop: 10,
    },
    col: { flex: 1 },

    labelSmall: { color: COLORS.sub, fontSize: 12, marginBottom: 4 },
    inputWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderColor: COLORS.border,
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        elevation: 1,
    },
    prefix: {
        backgroundColor: "#ECFEF5",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 6,
        borderWidth: 1,
        borderColor: "#CFFAEA",
    },
    prefixText: { color: COLORS.primaryDark, fontWeight: "900" },
    input: {
        flex: 1,
        color: COLORS.text,
        fontWeight: "800",
        paddingVertical: 4,
        fontSize: 16,
        textAlign: "right",
    },

    priceValue: { color: COLORS.text, fontWeight: "900", fontSize: 16, marginTop: 2 },

    /* Footer */
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 12,
        marginTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: { color: COLORS.sub, fontWeight: "700" },
    totalValue: { color: COLORS.text, fontWeight: "900", fontSize: 18 },

    primaryBtn: {
        marginTop: 12,
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    primaryBtnText: { color: "#FFFFFF", fontWeight: "900", letterSpacing: 0.3 },

    secondaryBtn: {
        marginTop: 8,
        backgroundColor: "#E2E8F0",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
});