import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Easing,
    StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { base_url } from '../../../App';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Helpers ---
const isValidEmail = (email) =>
    /^(?:[a-zA-Z0-9_'^&/+-])+(?:\.(?:[a-zA-Z0-9_'^&/+-])+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(
        String(email).trim()
    );
const isValidPhone = (phone) => /^(\+?\d{10,15})$/.test(String(phone).trim());

// --- Components ---
function TabButton({ label, active, onPress }) {
    return (
        <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
            <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
        </Pressable>
    );
}

function PrimaryButton({ title, onPress, disabled }) {
    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            style={({ pressed }) => [
                styles.primaryBtn,
                disabled && { opacity: 0.6 },
                pressed && { transform: [{ scale: 0.98 }] },
            ]}
        >
            <Text style={styles.primaryBtnText}>{title}</Text>
        </Pressable>
    );
}

function OtpInput({ length = 6, value, onChange, disabled }) {
    const refs = useRef([]);
    const handleChange = (idx, text) => {
        const v = text.replace(/\D/g, '').slice(-1);
        const next = value.split('');
        next[idx] = v;
        const joined = next.join('');
        onChange(joined);
        if (v && idx < length - 1) refs.current[idx + 1]?.focus();
    };
    const handleKeyPress = (idx, e) => {
        if (e.nativeEvent.key === 'Backspace' && !value[idx] && idx > 0) {
            refs.current[idx - 1]?.focus();
        }
    };
    return (
        <View style={styles.otpRow}>
            {Array.from({ length }).map((_, i) => (
                <TextInput
                    key={i}
                    ref={(r) => (refs.current[i] = r)}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={value[i] ?? ''}
                    onChangeText={(t) => handleChange(i, t)}
                    onKeyPress={(e) => handleKeyPress(i, e)}
                    style={[styles.otpCell, value[i] ? styles.otpCellFilled : null]}
                    textAlign="center"
                    editable={!disabled}
                />
            ))}
        </View>
    );
}

export default function Login() {

    const blob1 = useRef(new Animated.Value(0)).current;
    const blob2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = (anim, dur, delay = 0) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: dur,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                        delay,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: dur,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        loop(blob1, 6000);
        loop(blob2, 7500, 800);
    }, [blob1, blob2]);

    const blob1Style = {
        transform: [
            { translateX: blob1.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) },
            { translateY: blob1.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
            { scale: blob1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
        ],
        opacity: blob1.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] }),
    };
    const blob2Style = {
        transform: [
            { translateX: blob2.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
            { translateY: blob2.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) },
            { scale: blob2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
        ],
        opacity: blob2.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] }),
    };

    // States
    const navigation = useNavigation();
    const [tab, setTab] = useState('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [phone, setPhone] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [timer, setTimer] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Hide messages after 10s
    useEffect(() => {
        if (!message) return;
        const timeout = setTimeout(() => setMessage(null), 10000);
        return () => clearTimeout(timeout);
    }, [message]);

    useEffect(() => {
        if (!timer) return;
        const id = setInterval(() => setTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
        return () => clearInterval(id);
    }, [timer]);

    // --- API HANDLERS ---

    const handleEmailLogin = async () => {
        setMessage(null);
        if (!isValidEmail(email)) return setMessage({ type: 'error', text: 'Enter a valid email.' });
        if (password.length < 6)
            return setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });

        try {
            setLoading(true);
            const res = await fetch(`${base_url}api/vendor-email-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: data.message || 'Login successful!' });
                await AsyncStorage.setItem('storeAccesstoken', data.token);
                // console.log('✅ Vendor:', data.vendor);
                // console.log('🔑 Token:', data.token);
                // Navigate to Dashboard or Home screen
                navigation.replace('Home');
            } else {
                setMessage({ type: 'error', text: data.message || 'Invalid credentials.' });
            }
        } catch (err) {
            // console.log(err);
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async () => {
        setMessage(null);
        const fullPhone = `91${phone}`;
        if (!isValidPhone(`+${fullPhone}`))
            return setMessage({ type: 'error', text: 'Enter a valid 10-digit phone number.' });

        try {
            setLoading(true);
            const res = await fetch(`${base_url}api/vendor-send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone }),
            });
            const data = await res.json();
            if (data.success) {
                setOtpSent(true);
                setTimer(45);
                setMessage({ type: 'success', text: data.message || 'OTP sent successfully.' });
                console.log("OTP sent successfully:", data);
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to send OTP.' });
            }
        } catch (err) {
            console.log(err);
            setMessage({ type: 'error', text: 'Network error while sending OTP.' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setMessage(null);
        const fullPhone = `91${phone}`;
        if (otp.length < 6) return setMessage({ type: 'error', text: 'Enter the 6-digit OTP.' });

        try {
            setLoading(true);
            const res = await fetch(`${base_url}api/vendor-verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone, otp }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: data.message || 'OTP verified successfully.' });
                await AsyncStorage.setItem('storeAccesstoken', data.token);
                // Navigate to Dashboard or Home screen
                navigation.replace('Home');
                console.log('✅ Vendor:', data.vendor);
                console.log('🔑 Token:', data.token);
            } else {
                setMessage({ type: 'error', text: data.message || 'OTP verification failed.' });
            }
        } catch (err) {
            // console.log(err);
            setMessage({ type: 'error', text: 'Network error during OTP verification.' });
        } finally {
            setLoading(false);
        }
    };

    // --- UI ---
    return (
        <LinearGradient colors={['#0b0b12', '#0b0b12']} style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" />
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Animated.View style={[styles.blob, styles.blobOne, blob1Style]} />
                <Animated.View style={[styles.blob, styles.blobTwo, blob2Style]} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.container}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in your way</Text>

                    <View style={styles.card}>
                        <View style={styles.tabsWrap}>
                            <TabButton label="Email / Password" active={tab === 'email'} onPress={() => setTab('email')} />
                            <TabButton label="Phone / OTP" active={tab === 'phone'} onPress={() => setTab('phone')} />
                        </View>

                        {!!message && (
                            <View style={[styles.msg, message.type === 'error' ? styles.msgError : styles.msgSuccess]}>
                                <Text style={styles.msgText}>{message.text}</Text>
                            </View>
                        )}

                        {tab === 'email' ? (
                            <View style={{ gap: 14 }}>
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Email</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="you@example.com"
                                        placeholderTextColor="#9aa0a6"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>

                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Password</Text>
                                    <View style={{ position: 'relative' }}>
                                        <TextInput
                                            style={[styles.input, { paddingRight: 44 }]}
                                            placeholder="••••••••"
                                            placeholderTextColor="#9aa0a6"
                                            secureTextEntry={!showPw}
                                            value={password}
                                            onChangeText={setPassword}
                                        />
                                        <Pressable onPress={() => setShowPw((s) => !s)} style={styles.eyeBtn}>
                                            <Text style={styles.eyeBtnText}>{showPw ? '🙈' : '👁️'}</Text>
                                        </Pressable>
                                    </View>
                                </View>

                                <PrimaryButton
                                    title={loading ? 'Signing in…' : 'Sign in'}
                                    onPress={handleEmailLogin}
                                    disabled={loading}
                                />
                            </View>
                        ) : (
                            <View style={{ gap: 14 }}>
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Phone Number</Text>
                                    <View style={styles.phoneRow}>
                                        <Text style={styles.countryCode}>+91</Text>
                                        <TextInput
                                            style={[styles.input, styles.phoneInput]}
                                            placeholder="Enter 10-digit number"
                                            placeholderTextColor="#9aa0a6"
                                            keyboardType="number-pad"
                                            maxLength={10}
                                            value={phone}
                                            onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                                        />
                                    </View>
                                    <Text style={styles.help}>Country code +91 is fixed for all users.</Text>
                                </View>

                                {!otpSent ? (
                                    <PrimaryButton
                                        title={loading ? 'Sending…' : 'Send OTP'}
                                        onPress={handleSendOtp}
                                        disabled={loading}
                                    />
                                ) : (
                                    <View style={{ gap: 12 }}>
                                        <View style={styles.rowBetween}>
                                            <Text style={styles.label}>Enter OTP</Text>
                                            {timer > 0 ? (
                                                <Text style={styles.timer}>Resend in {timer}s</Text>
                                            ) : (
                                                <Pressable onPress={handleSendOtp}>
                                                    <Text style={styles.link}>Resend OTP</Text>
                                                </Pressable>
                                            )}
                                        </View>
                                        <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                                        <PrimaryButton
                                            title={loading ? 'Verifying…' : 'Verify & Sign in'}
                                            onPress={handleVerifyOtp}
                                            disabled={loading || otp.length < 6}
                                        />
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.trustRow}>
                            <Text style={styles.trustItem}>🔐 TLS enforced</Text>
                            <Text style={styles.dot}>•</Text>
                            <Text style={styles.trustItem}>✅ 2FA ready</Text>
                        </View>
                    </View>

                    <Text style={styles.footer}>© {new Date().getFullYear()} 33Crores Pooja Products Pvt Ltd</Text>
                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, gap: 18, justifyContent: 'center' },
    title: { fontSize: 32, color: '#fff', fontWeight: '700' },
    subtitle: { fontSize: 18, color: '#cbd5e1', marginTop: -6 },
    card: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 14,
    },
    tabsWrap: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 4 },
    tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
    tabBtnText: { color: '#aeb5c0', fontWeight: '600' },
    tabBtnTextActive: { color: '#fff' },
    fieldGroup: { gap: 8 },
    label: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
    input: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        color: '#fff',
        paddingHorizontal: 14,
        paddingVertical: Platform.select({ ios: 14, android: 10 }),
        borderRadius: 10,
        fontSize: 16,
    },
    phoneRow: { flexDirection: 'row', alignItems: 'center' },
    countryCode: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 12,
        paddingVertical: Platform.select({ ios: 14, android: 10 }),
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    phoneInput: { flex: 1 },
    eyeBtn: { position: 'absolute', right: 6, top: 6, height: 36, width: 36, alignItems: 'center', justifyContent: 'center' },
    eyeBtnText: { fontSize: 16, color: '#e5e7eb' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    link: { color: '#a5b4fc', fontWeight: '600' },
    primaryBtn: { backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    help: { color: '#94a3b8', fontSize: 12 },
    timer: { color: '#94a3b8', fontSize: 12 },
    otpRow: { flexDirection: 'row', gap: 8 },
    otpCell: {
        flex: 1,
        height: 48,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        color: '#fff',
        fontSize: 18,
    },
    otpCellFilled: { borderColor: '#22c55e' },
    msg: { padding: 10, borderRadius: 10 },
    msgError: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' },
    msgSuccess: { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' },
    msgText: { color: '#e5e7eb' },
    trustRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
    trustItem: { color: '#9ca3af', fontSize: 12 },
    dot: { color: '#9ca3af', marginHorizontal: 6 },
    footer: { textAlign: 'center', color: '#6b7280', marginTop: 12 },
    blob: { position: 'absolute', height: 260, width: 260, borderRadius: 999, backgroundColor: '#7c3aed', opacity: 0.4 },
    blobOne: { top: -40, left: -30, backgroundColor: '#a855f7' },
    blobTwo: { bottom: -50, right: -40, backgroundColor: '#6366f1' },
});