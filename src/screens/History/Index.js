import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
    ActivityIndicator,
    LayoutAnimation,
    Platform,
    Pressable,
    RefreshControl,
    FlatList,
    StyleSheet,
    Text,
    UIManager,
    View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { base_url } from "../../../App";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
    bg: "#F6F7FB",
    card: "#FFFFFF",
    text: "#0F172A",
    sub: "#475569",
    border: "#E5E7EB",
    primary: "#10B981",
    danger: "#EF4444",
};

const PAGE_SIZE = 10;

const num = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const formatDate = (iso) => {
    if (!iso) return "Unknown";
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

// Rounded currency (no decimals)
const cur0 = (n) =>
    Number(n || 0).toLocaleString(undefined, {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    const paddingToBottom = 280;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
};

const HeaderRow = React.memo(function HeaderRow({ title, count, collapsed, onToggle }) {
    return (
        <Pressable onPress={() => onToggle(title)} style={styles.sectionHeader}>
            <View>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionSub}>{count} pickups</Text>
            </View>
            <Text style={styles.sectionAction}>{collapsed ? "Show" : "Hide"}</Text>
        </Pressable>
    );
});

const PickupRow = React.memo(function PickupRow({ pickup, isExpanded, onToggleExpanded }) {
    const items = pickup?.flower_pickup_items || [];

    const computedTotalFromItems = useMemo(() => {
        return items.reduce((s, it) => s + num(it?.item_total_price), 0);
    }, [items]);

    // Prefer grand_total_price if backend sends it; else total_price; else sum(items)
    const total = useMemo(() => {
        const g = pickup?.grand_total_price;
        if (g !== null && g !== undefined && g !== "") return num(g);
        const t = pickup?.total_price;
        if (t !== null && t !== undefined && t !== "") return num(t);
        return computedTotalFromItems;
    }, [pickup?.grand_total_price, pickup?.total_price, computedTotalFromItems]);

    const itemCount = items.length;

    return (
        <View style={styles.card}>
            <Pressable onPress={() => onToggleExpanded(String(pickup.id))} style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.id}>{pickup?.pick_up_id || "—"}</Text>
                    <Text style={styles.muted}>Pickup: {formatDate(pickup?.pickup_date)}</Text>
                    <Text style={styles.muted}>Rider: {pickup?.rider?.rider_name || "—"}</Text>
                    <Text style={styles.muted}>Status: {pickup?.status || "—"}</Text>
                    <Text style={styles.muted}>Items: {itemCount}</Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.total}>{cur0(total)}</Text>
                </View>
            </Pressable>

            <>
                <View style={styles.divider} />
                {items.map((it) => (
                    <View key={String(it.id)} style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>
                                {it?.flower?.item_name || it?.flower?.name || String(it?.flower_id || "—")}
                            </Text>
                            <Text style={styles.muted}>
                                Qty: {num(it?.quantity)} {it?.unit?.unit_name || ""}
                            </Text>
                            <Text style={styles.muted}>
                                Unit Price: {cur0(num(it?.price))}
                            </Text>
                        </View>

                        <View style={{ width: 140, alignItems: "flex-end" }}>
                            <Text style={styles.muted}>Item Total</Text>
                            {/* IMPORTANT: your API uses item_total_price */}
                            <Text style={styles.price}>{cur0(num(it?.item_total_price))}</Text>
                        </View>
                    </View>
                ))}
            </>
        </View>
    );
});

export default function History() {
    const [rows, setRows] = useState([]);

    // dateTitle => boolean (true = collapsed)
    const [collapsed, setCollapsed] = useState({});
    // pickupId => boolean
    const [expandedPickup, setExpandedPickup] = useState({});

    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // hard locks
    const isFetchingRef = useRef(false);
    const lastRequestedPageRef = useRef(0);
    const lastLoadMoreAtRef = useRef(0);

    const fetchHistory = useCallback(
        async (pageToLoad = 1, { append = false } = {}) => {
            if (isFetchingRef.current) return;
            if (pageToLoad === lastRequestedPageRef.current) return;

            isFetchingRef.current = true;
            lastRequestedPageRef.current = pageToLoad;

            const access_token = await AsyncStorage.getItem("storeAccesstoken");

            try {
                setError("");
                if (pageToLoad === 1 && !append) setLoading(true);
                else setLoadingMore(true);

                const url = `${base_url}api/get-all-pickups?page=${pageToLoad}&per_page=${PAGE_SIZE}`;
                const res = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!res.ok) throw new Error(`GET failed (${res.status})`);

                const json = await res.json();
                const list = Array.isArray(json?.data) ? json.data : [];

                // meta-based pagination (your response provides this)
                const lp = num(json?.meta?.last_page) || pageToLoad;
                const cp = num(json?.meta?.current_page) || pageToLoad;

                setLastPage(lp);
                setPage(cp);
                setHasMore(cp < lp);

                setRows((prev) => {
                    if (!append || pageToLoad === 1) return list;

                    // de-dup by id
                    const seen = new Set(prev.map((x) => String(x.id)));
                    const next = list.filter((x) => !seen.has(String(x.id)));
                    return [...prev, ...next];
                });
            } catch (e) {
                setError(e?.message || "Something went wrong.");
            } finally {
                isFetchingRef.current = false;
                setLoading(false);
                setLoadingMore(false);
                setRefreshing(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchHistory(1, { append: false });
    }, [fetchHistory]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setCollapsed({});
        setExpandedPickup({});
        lastRequestedPageRef.current = 0;
        fetchHistory(1, { append: false });
    }, [fetchHistory]);

    const loadMore = useCallback(() => {
        if (loading || refreshing || loadingMore || !hasMore) return;
        if (page >= lastPage) return;
        fetchHistory(page + 1, { append: true });
    }, [fetchHistory, hasMore, lastPage, loading, loadingMore, page, refreshing]);

    const handleScroll = useCallback(
        (e) => {
            if (!hasMore || loadingMore || loading || refreshing) return;
            if (!isCloseToBottom(e.nativeEvent)) return;

            const now = Date.now();
            if (now - lastLoadMoreAtRef.current < 900) return; // debounce
            lastLoadMoreAtRef.current = now;

            loadMore();
        },
        [hasMore, loadingMore, loading, refreshing, loadMore]
    );

    // Group by pickup_date (fallback created_at)
    const grouped = useMemo(() => {
        const map = new Map();
        for (const p of rows) {
            const key = formatDate(p?.pickup_date || p?.created_at);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(p);
        }
        return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
    }, [rows]);

    // Default collapse: only first date open
    useEffect(() => {
        if (!grouped.length) return;

        setCollapsed((prev) => {
            let changed = false;
            const next = { ...prev };

            grouped.forEach((g, idx) => {
                if (next[g.title] === undefined) {
                    next[g.title] = idx !== 0; // first open, others collapsed
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [grouped]);

    // Default expanded pickup: first pickup of first (open) date only
    useEffect(() => {
        if (!grouped.length) return;
        const firstGroup = grouped[0];
        const firstPickup = firstGroup?.data?.[0];
        if (!firstPickup) return;

        setExpandedPickup((prev) => {
            // only set once
            if (Object.keys(prev).length > 0) return prev;
            return { [String(firstPickup.id)]: true };
        });
    }, [grouped]);

    // Build FlatList data with headers + pickups (only include pickups if section open)
    const flatData = useMemo(() => {
        const out = [];
        for (const g of grouped) {
            out.push({
                type: "header",
                key: `h-${g.title}`,
                title: g.title,
                count: g.data.length,
            });

            const isCollapsed = !!collapsed[g.title];
            if (!isCollapsed) {
                for (const p of g.data) {
                    out.push({ type: "pickup", key: `p-${p.id}`, pickup: p });
                }
            }
        }
        return out;
    }, [grouped, collapsed]);

    const toggleSection = useCallback((title) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCollapsed((s) => ({ ...s, [title]: !s[title] }));
    }, []);

    const togglePickup = useCallback((pickupId) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedPickup((s) => ({ ...s, [pickupId]: !s[pickupId] }));
    }, []);

    const renderItem = useCallback(
        ({ item }) => {
            if (item.type === "header") {
                return (
                    <HeaderRow
                        title={item.title}
                        count={item.count}
                        collapsed={!!collapsed[item.title]}
                        onToggle={toggleSection}
                    />
                );
            }

            const p = item.pickup;
            const pid = String(p.id);

            return (
                <PickupRow
                    pickup={p}
                    isExpanded={!!expandedPickup[pid]}
                    onToggleExpanded={togglePickup}
                />
            );
        },
        [collapsed, expandedPickup, togglePickup, toggleSection]
    );

    const showFullScreenLoader = loading && rows.length === 0;
    const showFullScreenError = !!error && rows.length === 0 && !loading;

    return (
        <View style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.title}>History</Text>

                {showFullScreenLoader ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.subtle}>Fetching history…</Text>
                    </View>
                ) : showFullScreenError ? (
                    <View style={styles.center}>
                        <Text style={[styles.subtle, { color: COLORS.danger }]}>{error}</Text>
                        <Pressable
                            onPress={() => {
                                lastRequestedPageRef.current = 0;
                                fetchHistory(1, { append: false });
                            }}
                            style={styles.secondaryBtn}
                        >
                            <Text style={styles.secondaryBtnText}>Retry</Text>
                        </Pressable>
                    </View>
                ) : (
                    <FlatList
                        data={flatData}
                        keyExtractor={(x) => x.key}
                        renderItem={renderItem}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}

                        // performance tuning
                        initialNumToRender={12}
                        maxToRenderPerBatch={10}
                        windowSize={9}
                        updateCellsBatchingPeriod={50}

                        // IMPORTANT: keep false because row heights change (expand/collapse). Helps prevent jump-to-top.
                        removeClippedSubviews={false}

                        ListEmptyComponent={
                            !loadingMore && !refreshing ? (
                                <View style={styles.center}>
                                    <Text style={styles.subtle}>No history yet.</Text>
                                </View>
                            ) : null
                        }
                        ListFooterComponent={
                            loadingMore ? (
                                <View style={styles.footerLoader}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                    <Text style={[styles.subtle, { marginTop: 6 }]}>Loading more…</Text>
                                </View>
                            ) : null
                        }
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
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    sectionTitle: { fontWeight: "900", color: COLORS.text },
    sectionSub: { color: COLORS.sub, marginTop: 2 },
    sectionAction: { color: COLORS.primary, fontWeight: "900" },

    card: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 14,
        marginTop: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
    },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    id: { fontWeight: "900", color: COLORS.text, marginBottom: 4 },
    muted: { color: COLORS.sub },
    expandHint: { color: COLORS.primary, marginTop: 4, fontWeight: "800" },

    total: { color: COLORS.text, fontWeight: "900", marginTop: 2 },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },

    itemRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
    itemName: { color: COLORS.text, fontWeight: "800" },
    price: { color: COLORS.text, fontWeight: "900", marginTop: 2 },

    secondaryBtn: {
        marginTop: 8,
        backgroundColor: "#E2E8F0",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    secondaryBtnText: { color: COLORS.text, fontWeight: "900" },

    footerLoader: { paddingVertical: 16, alignItems: "center" },
});