// AppHeader.js
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
    primary: "#10B981",
    primaryDark: "#0EA371",
    textOn: "#ffffff",
    chip: "rgba(255,255,255,0.14)",
};

export default function AppHeader({ title, subtitle, right, left }) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
            <View style={styles.row}>
                <View style={styles.side}>{left}</View>
                <View style={styles.center}>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
                </View>
                <View style={styles.side}>{right}</View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        backgroundColor: "#10B981",
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: "#10B981",
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    row: { flexDirection: "row", alignItems: "center" },
    side: { width: 48, alignItems: "center", justifyContent: "center" },
    center: { flex: 1, alignItems: "center" },
    title: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 0.3 },
    sub: { color: "rgba(255,255,255,0.85)", marginTop: 4, fontWeight: "600" },
});