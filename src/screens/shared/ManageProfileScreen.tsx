// src/screens/shared/ManageProfileScreen.tsx
import React, { FC, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateProfile, changePassword } from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS, getRoleLabel } from '../../theme';
import { userLoginCompleted } from '../../app/actions';
import { userLogout } from '../../app/reducers/auth';

interface Props { accentColor: string; }

const ManageProfileScreen: FC<Props> = ({ accentColor }) => {
  const dispatch = useDispatch();
  const { data, token } = useSelector((state: RootState) => state.auth);

  const [fullName,  setFullName]  = useState(data?.fullName  ?? '');
  const [username,  setUsername]  = useState(data?.username  ?? '');
  const [email,     setEmail]     = useState(data?.email     ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd,  setSavingPwd]  = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const roles: string[]  = data?.roles ?? [];
  const primaryRole      = roles.find(r => r !== 'ROLE_USER') ?? roles[0] ?? '';
  const initials         = (data?.fullName || data?.username || '?')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => setShowLogout(true);

  const handleSaveProfile = async () => {
    if (!data?.id) return;
    setSavingProfile(true);
    try {
      const updated = await updateProfile(data.id, { fullName, username, email }, token);
      dispatch(userLoginCompleted({ ...data, ...updated }));
      Alert.alert('Success', 'Profile updated.');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (!newPwd || newPwd !== confirmPwd) {
      Alert.alert('Validation', 'New passwords do not match.'); return;
    }
    setSavingPwd(true);
    try {
      await changePassword({ currentPassword: currentPwd, newPassword: newPwd }, token);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      Alert.alert('Success', 'Password changed.');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSavingPwd(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <View style={[styles.avatar, { borderColor: 'rgba(255,255,255,0.5)' }]}>
          <Text style={[styles.avatarText, { color: accentColor }]}>{initials}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{data?.fullName || data?.username}</Text>
          <Text style={styles.headerEmail}>{data?.email}</Text>
          <View style={[styles.rolePill, { backgroundColor: '#fff' }]}>
            <Icon name={primaryRole === 'ROLE_ADMIN' ? 'shield-account' : 'account-tie'} size={10} color={accentColor} />
            <Text style={[styles.rolePillText, { color: accentColor }]}>{getRoleLabel(primaryRole)}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Profile info */}
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <View style={styles.card}>
          {[
            { label: 'Full Name', value: fullName, set: setFullName, placeholder: 'John Doe' },
            { label: 'Username',  value: username, set: setUsername, placeholder: 'johndoe' },
            { label: 'Email',     value: email,    set: setEmail,    placeholder: 'john@example.com' },
          ].map(f => (
            <View key={f.label} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                placeholderTextColor={COLORS.textMuted}
                value={f.value}
                onChangeText={f.set}
                autoCapitalize="none"
              />
            </View>
          ))}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: accentColor }, savingProfile && { opacity: 0.7 }]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Icon name="content-save" size={16} color="#fff" />
                  <Text style={styles.btnText}>Save Profile</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* Change password */}
        <Text style={styles.sectionTitle}>Change Password</Text>
        <View style={styles.card}>
          {[
            { label: 'Current Password', value: currentPwd, set: setCurrentPwd },
            { label: 'New Password',     value: newPwd,     set: setNewPwd },
            { label: 'Confirm Password', value: confirmPwd, set: setConfirmPwd },
          ].map(f => (
            <View key={f.label} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={f.value}
                onChangeText={f.set}
                secureTextEntry
              />
            </View>
          ))}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: accentColor }, savingPwd && { opacity: 0.7 }]}
            onPress={handleChangePassword}
            disabled={savingPwd}
          >
            {savingPwd
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Icon name="lock-reset" size={16} color="#fff" />
                  <Text style={styles.btnText}>Change Password</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutBtn, { borderColor: accentColor }]} onPress={handleLogout} activeOpacity={0.8}>
          <Icon name="logout" size={18} color={accentColor} />
          <Text style={[styles.logoutText, { color: accentColor }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Logout Confirmation Modal ── */}
      <Modal visible={showLogout} transparent animationType="fade" onRequestClose={() => setShowLogout(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Icon name="logout-variant" size={32} color={accentColor} />
            </View>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to log out of your account?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowLogout(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => { setShowLogout(false); dispatch(userLogout()); }}
                activeOpacity={0.8}
              >
                <Icon name="logout" size={15} color="#fff" />
                <Text style={styles.modalConfirmText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20, paddingBottom: 24,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  avatar:     { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarText: { fontSize: 22, fontWeight: '800', fontFamily: FONTS.bold },
  headerInfo: { flex: 1 },
  headerName: { color: '#fff', fontSize: 18, fontFamily: FONTS.display, fontWeight: '700', marginBottom: 2 },
  headerEmail:{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: FONTS.body, marginBottom: 6 },
  rolePill:   { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  rolePillText:{ fontSize: 11, fontWeight: '700', fontFamily: FONTS.bold },

  body: { padding: 16, paddingBottom: 100 },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, fontFamily: FONTS.bold, letterSpacing: 0.5, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, ...SHADOW.sm, marginBottom: 8 },

  field: { marginBottom: 14 },
  label: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.textDark, fontFamily: FONTS.body,
  },

  btn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: RADIUS.md, marginTop: 4 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold },

  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 4, marginTop: 24, marginBottom: 8, padding: 14, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.error },
  logoutText: { color: COLORS.error, fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold },

  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalCard:     { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', ...SHADOW.lg },
  modalIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primaryFaded, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle:    { fontSize: 20, fontWeight: '700', fontFamily: FONTS.display, color: COLORS.textDark, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, fontFamily: FONTS.body, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  modalActions:  { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel:   { flex: 1, paddingVertical: 14, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelText:  { fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold, color: COLORS.textMuted },
  modalConfirm:     { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold, color: '#fff' },
});

export default ManageProfileScreen;
