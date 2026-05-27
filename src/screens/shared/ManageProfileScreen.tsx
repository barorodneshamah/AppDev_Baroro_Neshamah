// src/screens/shared/ManageProfileScreen.tsx
import React, { FC, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateProfile, changePassword } from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS, getRoleLabel } from '../../theme';
import { userLoginCompleted } from '../../app/actions';
import { userLogout } from '../../app/reducers/auth';
import {
  ConfirmModal,
  ConfirmModalConfig,
  SuccessModal,
  SuccessModalConfig,
  ValidationModal,
} from '../../components/AppModals';

interface Props { accentColor: string; }

const ManageProfileScreen: FC<Props> = ({ accentColor }) => {
  const dispatch = useDispatch();
  const { data, token } = useSelector((state: RootState) => state.auth);

  const [fullName,  setFullName]  = useState(data?.fullName  ?? '');
  const [username,  setUsername]  = useState(data?.username  ?? '');
  const [email,     setEmail]     = useState(data?.email     ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd,  setSavingPwd]  = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [successConfig, setSuccessConfig] = useState<SuccessModalConfig | null>(null);
  const [logoutConfig, setLogoutConfig] = useState<ConfirmModalConfig | null>(null);
  const [validationFields, setValidationFields] = useState<string[]>([]);

  const roles: string[]  = data?.roles ?? [];
  const primaryRole      = roles.find(r => r !== 'ROLE_USER') ?? roles[0] ?? '';
  const initials         = (data?.fullName || data?.username || '?')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => setLogoutConfig({
    icon:         'logout-variant',
    iconBg:       '#fce4ec',
    iconColor:    COLORS.error,
    title:        'Log Out?',
    message:      'Are you sure you want to log out of your account?',
    confirmLabel: 'Log Out',
    cancelLabel:  'Cancel',
    dangerous:    true,
    onCancel:     () => setLogoutConfig(null),
    onConfirm:    () => { setLogoutConfig(null); dispatch(userLogout()); },
  });

  const handleSaveProfile = async () => {
    if (!data?.id) return;
    setSavingProfile(true);
    try {
      const updated = await updateProfile(data.id, { fullName, username, email }, token);
      dispatch(userLoginCompleted({ ...data, ...updated }));
      setSuccessConfig({
        icon:         'account-check',
        iconBg:       '#e8f5e9',
        iconColor:    COLORS.success,
        title:        'Profile Updated!',
        message:      'Your profile information has been saved successfully.',
        primaryLabel: 'Done',
        onPrimary:    () => setSuccessConfig(null),
      });
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (!newPwd || newPwd !== confirmPwd) {
      setValidationFields(!newPwd ? ['New Password', 'Confirm Password'] : ['Confirm Password']);
      return;
    }
    setSavingPwd(true);
    try {
      await changePassword({ newPassword: newPwd, confirmPassword: confirmPwd }, token);
      setNewPwd(''); setConfirmPwd('');
      setSuccessConfig({
        icon:         'lock-check',
        iconBg:       '#e3f2fd',
        iconColor:    accentColor,
        title:        'Password Changed!',
        message:      'Your password has been updated successfully.',
        primaryLabel: 'Done',
        onPrimary:    () => setSuccessConfig(null),
      });
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
            { label: 'New Password',     value: newPwd,     set: setNewPwd,     visible: showNewPwd,     toggle: () => setShowNewPwd(v => !v) },
            { label: 'Confirm Password', value: confirmPwd, set: setConfirmPwd, visible: showConfirmPwd, toggle: () => setShowConfirmPwd(v => !v) },
          ].map(f => (
            <View key={f.label} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  value={f.value}
                  onChangeText={f.set}
                  secureTextEntry={!f.visible}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={f.toggle}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Icon name={f.visible ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
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

      <ConfirmModal config={logoutConfig} />
      <SuccessModal config={successConfig} />
      <ValidationModal
        visible={validationFields.length > 0}
        title="Check Password"
        fields={validationFields}
        onClose={() => setValidationFields([])}
      />
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
  passwordInputWrap: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 10,
    fontSize: 14,
    color: COLORS.textDark,
    fontFamily: FONTS.body,
  },
  eyeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  btn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: RADIUS.md, marginTop: 4 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold },

  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 4, marginTop: 24, marginBottom: 8, paddingVertical: 15, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.error },
  logoutText: { color: COLORS.error, fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold },
});

export default ManageProfileScreen;
