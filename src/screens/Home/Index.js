// Home.js
import React, { useMemo, useState, useEffect, useRef } from "react";
import { View, StyleSheet, BackHandler, ToastAndroid, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeader from "../../component/AppHeader";
import BottomTabs from "../../component/BottomTabs";

import TodayOrders from "../TodayOrder/Index";
import History from "../History/Index";
import VendorProfile from "../VendorProfile/Index";

const COLORS = { bg: "#F6F7FB" };

export default function Home() {
  
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [tab, setTab] = useState("today");

  const { title, subtitle } = useMemo(() => {
    switch (tab) {
      case "history":
        return { title: "Order History", subtitle: "All completed & past pickups" };
      case "profile":
        return { title: "Profile", subtitle: "Account details & settings" };
      default:
        return { title: "Today’s Orders", subtitle: "Pickups scheduled for today" };
    }
  }, [tab]);

  const Content = useMemo(() => {
    if (tab === "history") return <History />;
    if (tab === "profile") return <VendorProfile />;
    return <TodayOrders />;
  }, [tab]);

  // Handle Android hardware back press
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    const onBackPress = () => {
      // If not on 'today', switch to 'today' instead of leaving screen
      if (tab !== "today") {
        setTab("today");
        return true; // consume event
      }

      // On 'today' tab: show "press again to exit" toast; exit if pressed again within 2s
      if (Platform.OS === "android") {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPressRef.current = now;
        ToastAndroid.show("Press again to exit", ToastAndroid.SHORT);
        return true; // consume event
      }

      // iOS doesn't have a hardware back, but return false just in case
      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [tab]);

  // space for floating bar:
  const bottomPad = 16 + (insets.bottom > 0 ? insets.bottom : 10) + 64; // bar height approx

  return (
    <View style={[styles.safe, { paddingBottom: bottomPad }]}>
      <AppHeader title={title} subtitle={subtitle} />
      <View style={styles.content}>{Content}</View>
      <BottomTabs active={tab} onChange={setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, paddingTop: 12 },
});