// BottomTabs.js
import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
    card: "#ffffff",
    text: "#0F172A",
    sub: "#64748B",
    border: "#E2E8F0",
    primary: "#10B981",
};

export default function BottomTabs({ active, onChange }) {
    const insets = useSafeAreaInsets();
    const Item = ({ id, label, icon }) => {
        const isActive = active === id;
        return (
            <Pressable
                onPress={() => onChange(id)}
                style={({ pressed }) => [
                    styles.item,
                    isActive && styles.itemActive,
                    pressed && { opacity: 0.9 },
                ]}
            >
                <Text style={[styles.icon, isActive && styles.iconActive]}>{icon}</Text>
                <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
            </Pressable>
        );
    };

    return (
        <View
            style={[
                styles.bar,
                {
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
                },
            ]}
        >
            <Item id="today" label="Today" icon="📦" />
            <Item id="history" label="History" icon="🕘" />
            <Item id="profile" label="Profile" icon="👤" />
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 16,
        backgroundColor: "#ffffff",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingTop: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
    },
    item: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 6,
    },
    itemActive: {
        backgroundColor: "rgba(16,185,129,0.12)",
    },
    icon: { fontSize: 18, color: "#64748B" },
    iconActive: { color: "#10B981" },
    label: { color: "#64748B", fontWeight: "800" },
    labelActive: { color: "#10B981" },
});