// TodayOrders.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

const onlyDecimal = (s) => String(s ?? "").replace(/[^0-9.]/g, "");
const onlyInt = (s) => String(s ?? "").replace(/[^0-9]/g, "");

const toNum = (s) => {
    const n = parseFloat(String(s ?? "").trim());
    return Number.isFinite(n) ? n : 0;
};

const formatUnit = (n) => {
    if (!Number.isFinite(n)) return "";
    const s = n.toFixed(2);
    return s.replace(/\.?0+$/, "");
};

const seedFromPickup = (pickup) => {
    const units = {};
    const totals = {};
    (pickup?.flower_pickup_items || []).forEach((it) => {
        const qty = toNum(it.quantity);
        const unitStr = it.price !== null && it.price !== undefined ? String(it.price) : "";
        const apiTotal =
            it.total_price !== null && it.total_price !== undefined ? String(Math.round(toNum(it.total_price))) : "";

        const derivedTotal =
            unitStr !== "" ? String(Math.max(0, Math.round(toNum(unitStr) * qty))) : "";

        units[it.id] = unitStr;
        totals[it.id] = apiTotal !== "" ? apiTotal : derivedTotal;
    });
    return { units, totals };
};

const Meta = ({ label, value }) => (
    <View style={styles.metaChip}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaVal}>{value || "—"}</Text>
    </View>
);

const Card = React.memo(function Card({
    pickup,
    index,
    vendorData,
    submitting,
    formatDT,
    formatCurrency,
    submitPrices,
    getDraft,
    setDraft,
}) {
    const a = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(a, {
            toValue: 1,
            duration: 260,
            delay: index * 60,
            useNativeDriver: true,
        }).start();
    }, [a, index]);

    // ✅ keep edits LOCAL (no parent state updates on every keypress)
    const [local, setLocal] = useState(() => getDraft(pickup.pick_up_id) || seedFromPickup(pickup));

    // ✅ on fresh fetch, hydrate once (when pickup changes)
    useEffect(() => {
        const d = getDraft(pickup.pick_up_id);
        setLocal(d || seedFromPickup(pickup));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pickup.pick_up_id]);

    // ✅ silently persist to ref (no re-render)
    const persistTimer = useRef(null);
    const persist = useCallback(
        (nextLocal) => {
            if (persistTimer.current) clearTimeout(persistTimer.current);
            persistTimer.current = setTimeout(() => {
                setDraft(pickup.pick_up_id, nextLocal);
            }, 120);
        },
        [pickup.pick_up_id, setDraft]
    );

    const qtyOf = (it) => toNum(it.quantity);

    const calcTotalFromUnit = (it, unitStr) => {
        const qty = qtyOf(it);
        const unit = toNum(unitStr);
        const t = unit * qty;
        return Number.isFinite(t) ? String(Math.max(0, Math.round(t))) : "";
    };

    const calcUnitFromTotal = (it, totalStr) => {
        const qty = qtyOf(it);
        const total = toNum(totalStr);
        if (qty <= 0) return "";
        return formatUnit(total / qty);
    };

    const onChangeUnit = (it, txtRaw) => {
        const txt = onlyDecimal(txtRaw);

        setLocal((prev) => {
            const nextTotal = txt === "" ? "" : calcTotalFromUnit(it, txt);
            const next = {
                units: { ...prev.units, [it.id]: txt },
                totals: { ...prev.totals, [it.id]: nextTotal },
            };
            persist(next); // ✅ smooth (no parent rerender)
            return next;
        });
    };

    const onChangeTotal = (it, txtRaw) => {
        const txt = onlyInt(txtRaw);

        setLocal((prev) => {
            const nextUnit = txt === "" ? "" : calcUnitFromTotal(it, txt);
            const next = {
                units: { ...prev.units, [it.id]: nextUnit },
                totals: { ...prev.totals, [it.id]: txt },
            };
            persist(next);
            return next;
        });
    };

    const getItemTotalNumber = (it) => {
        const tStr = local.totals[it.id];
        if (tStr !== undefined && String(tStr).trim() !== "") return Math.max(0, Math.round(toNum(tStr)));

        const uStr = local.units[it.id];
        const qty = qtyOf(it);
        const unit = uStr !== undefined && String(uStr).trim() !== "" ? toNum(uStr) : toNum(it.price);
        return Math.max(0, Math.round(unit * qty));
    };

    const calculatedTotal = useMemo(() => {
        const items = pickup.flower_pickup_items || [];
        return items.reduce((acc, it) => acc + getItemTotalNumber(it), 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pickup.pick_up_id, local]);

    const [discount, setDiscount] = useState(() =>
        pickup?.discount !== null && pickup?.discount !== undefined ? String(pickup.discount) : ""
    );

    useEffect(() => {
        setDiscount(pickup?.discount !== null && pickup?.discount !== undefined ? String(pickup.discount) : "");
    }, [pickup?.pick_up_id, pickup?.discount]);

    const discountRounded = Math.round(toNum(discount || "0"));
    const grandTotal = Math.max(0, calculatedTotal - discountRounded);

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
                    <Meta label="Payment" value={pickup.payment_status || "—"} />
                </View>

                {/* items */}
                <View style={styles.itemsWrap}>
                    {(pickup.flower_pickup_items || []).map((it) => {
                        const unitVal = local.units[it.id] ?? "";
                        const totalVal = local.totals[it.id] ?? "";

                        return (
                            <View key={it.id} style={styles.itemCard}>
                                {/* row 1 */}
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

                                {/* row 2: two perfectly aligned fields */}
                                <View style={styles.fieldRow}>
                                    <View style={styles.fieldCol}>
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
                                                autoCorrect={false}
                                                blurOnSubmit={false}
                                                onChangeText={(t) => onChangeUnit(it, t)}
                                                onBlur={() => setDraft(pickup.pick_up_id, local)}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.fieldCol}>
                                        <Text style={styles.labelSmall}>Item Total (₹)</Text>
                                        <View style={styles.inputWrap}>
                                            <View style={styles.prefix}>
                                                <Text style={styles.prefixText}>₹</Text>
                                            </View>
                                            <TextInput
                                                style={styles.input}
                                                value={totalVal}
                                                placeholder="0"
                                                placeholderTextColor="#94A3B8"
                                                keyboardType="number-pad"
                                                autoCorrect={false}
                                                blurOnSubmit={false}
                                                onChangeText={(t) => onChangeTotal(it, t)}
                                                onBlur={() => setDraft(pickup.pick_up_id, local)}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* totals */}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Calculated Total</Text>
                    <Text style={styles.totalValue}>{formatCurrency(calculatedTotal)}</Text>
                </View>

                <View style={styles.discountRow}>
                    <Text style={styles.totalLabel}>Discount</Text>
                    <View style={[styles.inputWrap, { width: 160 }]}>
                        <View style={styles.prefix}>
                            <Text style={styles.prefixText}>₹</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={discount}
                            placeholder="0"
                            placeholderTextColor="#94A3B8"
                            keyboardType="number-pad"
                            autoCorrect={false}
                            onChangeText={(t) => setDiscount(onlyInt(t))}
                        />
                    </View>
                </View>

                <View style={styles.grandRow}>
                    <Text style={styles.totalLabel}>Grand Total</Text>
                    <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
                </View>

                <Pressable
                    onPress={() => submitPrices(pickup, local.units, local.totals, discount)}
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
});

export default function TodayOrders() {

    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [pickups, setPickups] = useState([]);
    const [vendorData, setVendorData] = useState(null);

    // ✅ store drafts in REF (no re-render on typing)
    const draftsRef = useRef({}); // { [pick_up_id]: { units, totals } }

    const getDraft = useCallback((pickUpId) => draftsRef.current?.[pickUpId] || null, []);
    const setDraft = useCallback((pickUpId, local) => {
        draftsRef.current[pickUpId] = local;
    }, []);

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

            // optional: clear drafts when fresh list comes (prevents old ref values)
            // draftsRef.current = {};
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

    const formatDT = (iso) => (!iso ? "—" : new Date(iso).toLocaleDateString());
    const formatCurrency = (n) =>
        Number(n || 0).toLocaleString(undefined, {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });

    const submitPrices = async (pickup, localUnits, localTotals, discount = "") => {
        const access_token = await AsyncStorage.getItem("storeAccesstoken");
        try {
            setSubmitting(true);

            const items = pickup.flower_pickup_items || [];

            const payloadItems = items.map((it) => {
                const qty = toNum(it.quantity);

                const totalStr = localTotals?.[it.id];
                const unitStr = localUnits?.[it.id];

                let total_price = 0;
                let price = 0;

                if (totalStr !== undefined && String(totalStr).trim() !== "") {
                    total_price = Math.max(0, Math.round(toNum(totalStr)));
                    price = qty > 0 ? total_price / qty : 0;
                } else {
                    price =
                        unitStr !== undefined && String(unitStr).trim() !== "" ? toNum(unitStr) : toNum(it.price);
                    total_price = Math.max(0, Math.round(price * qty));
                }

                return {
                    id: it.id,
                    flower_id: it.flower_id,
                    price: Number.isFinite(price) ? price : 0,
                    total_price: Number.isFinite(total_price) ? total_price : 0,
                };
            });

            const total = payloadItems.reduce((s, it) => s + (Number(it.total_price) || 0), 0);
            const discountRounded = Math.round(toNum(discount || "0"));
            const grandTotal = Math.max(0, total - discountRounded);

            const body = {
                total_price: total,
                discount: discountRounded,
                grand_total_price: grandTotal,
                flower_pickup_items: payloadItems,
            };

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
                            renderItem={({ item, index }) => (
                                <Card
                                    pickup={item}
                                    index={index}
                                    vendorData={vendorData}
                                    submitting={submitting}
                                    formatDT={formatDT}
                                    formatCurrency={formatCurrency}
                                    submitPrices={submitPrices}
                                    getDraft={getDraft}
                                    setDraft={setDraft}
                                />
                            )}
                            ListEmptyComponent={
                                <View style={styles.center}>
                                    <Text style={styles.subtle}>No pickups for today.</Text>
                                </View>
                            }
                            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPickups} />}
                            contentContainerStyle={{ paddingBottom: 24 }}
                            keyboardShouldPersistTaps="handled"
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

    fieldRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 10 },
    fieldCol: { flex: 1, paddingHorizontal: 4 },

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
        minHeight: 48,
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
    discountRow: {
        paddingTop: 10,
        marginTop: 4,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    grandRow: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 12,
        marginTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

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