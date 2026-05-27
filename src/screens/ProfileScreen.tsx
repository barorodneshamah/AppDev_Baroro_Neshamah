// src/screens/ProfileScreen.tsx
import React, { FC, useState }  from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar, Modal, TextInput, ActivityIndicator,
  Alert, Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector }  from 'react-redux';
import { userLogout }                from '../app/reducers/auth';
import { apiFetch, changePassword }  from '../app/api/api';
import { RootState }                 from '../store';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING, getRoleLabel, getRoleColor } from '../theme';
import { SuccessModal, SuccessModalConfig, ConfirmModal, ConfirmModalConfig } from '../components/AppModals';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModalField {
  label:         string;
  key:           string;
  secure?:       boolean;
  keyboardType?: any;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionCard: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const InfoRow: FC<{ label: string; value?: string; last?: boolean }> = ({ label, value, last }) => (
  <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value || '—'}</Text>
  </View>
);

const ActionRow: FC<{ label: string; onPress: () => void; last?: boolean; danger?: boolean }> = ({
  label, onPress, last, danger,
}) => (
  <TouchableOpacity
    style={[styles.infoRow, !last && styles.infoRowBorder]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.infoLabel, danger && { color: COLORS.error }]}>{label}</Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  visible:  boolean;
  title:    string;
  fields:   ModalField[];
  values:   Record<string, string>;
  onChange: (key: string, val: string) => void;
  onCancel: () => void;
  onSave:   () => void;
  loading:  boolean;
}

const EditModal: FC<EditModalProps> = ({
  visible, title, fields, values, onChange, onCancel, onSave, loading,
}) => {
  const [visibleSecure, setVisibleSecure] = useState<Record<string, boolean>>({});

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>

          {fields.map(f => {
            const canReveal = !!f.secure;
            const revealed = !!visibleSecure[f.key];

            return (
              <View key={f.key} style={styles.modalField}>
                <Text style={styles.modalLabel}>{f.label}</Text>
                <View style={[styles.modalInputWrap, canReveal && styles.modalInputWithIcon]}>
                  <TextInput
                    style={styles.modalInput}
                    value={values[f.key] || ''}
                    onChangeText={v => onChange(f.key, v)}
                    secureTextEntry={canReveal && !revealed}
                    keyboardType={f.keyboardType || 'default'}
                    autoCapitalize="none"
                    placeholderTextColor={COLORS.textMuted}
                    placeholder={`Enter ${f.label.toLowerCase()}`}
                  />
                  {canReveal && (
                    <TouchableOpacity
                      onPress={() => setVisibleSecure(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                      style={styles.modalEyeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.7}
                    >
                      <Icon name={revealed ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={onCancel}>
              <Icon name="close" size={15} color={COLORS.textMuted} />
              <Text style={styles.modalBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnSave} onPress={onSave} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Icon name="check" size={15} color="#fff" />
                    <Text style={styles.modalBtnSaveText}>Save Changes</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ProfileScreen: FC = () => {
  const dispatch             = useDispatch();
  const { data, token }      = useSelector((state: RootState) => state.auth);

  const [editModal,     setEditModal]     = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [successConfig, setSuccessConfig] = useState<SuccessModalConfig | null>(null);
  const [logoutConfig,  setLogoutConfig]  = useState<ConfirmModalConfig | null>(null);

  const [profileForm, setProfileForm] = useState({
    fullName: data?.fullName || '',
    username: data?.username || '',
    email:    data?.email    || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword:     '',
    confirmPassword: '',
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const userId    = data?.id;
  const avatarUri = `https://ui-avatars.com/api/?name=${
    encodeURIComponent(data?.fullName || data?.username || 'User')
  }&background=c24a16&color=fff&size=128&bold=true`;
  const primaryRole = data?.roles?.find((r: string) => r !== 'ROLE_USER') || 'ROLE_GUEST';

  // ── Actions ──────────────────────────────────────────────────────────────────

  const openEditModal = () => {
    setProfileForm({
      fullName: data?.fullName || '',
      username: data?.username || '',
      email:    data?.email    || '',
    });
    setEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.username || !profileForm.email) {
      Alert.alert('Validation', 'Username and email are required.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/users/${userId}`, token, {
        method: 'PUT',
        body:   JSON.stringify(profileForm),
      });
      setEditModal(false);
      setSuccessConfig({
        icon:         'account-check',
        iconBg:       '#e8f5e9',
        iconColor:    '#2e7d32',
        title:        'Profile Updated!',
        message:      'Your profile information has been saved successfully.',
        primaryLabel: 'Done',
        onPrimary:    () => setSuccessConfig(null),
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Validation', 'Please fill in all password fields.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Validation', 'New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(passwordForm, token);
      setPasswordModal(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setSuccessConfig({
        icon:         'lock-check',
        iconBg:       '#e3f2fd',
        iconColor:    '#1565c0',
        title:        'Password Changed!',
        message:      'Your password has been updated. Keep it safe!',
        primaryLabel: 'Done',
        onPrimary:    () => setSuccessConfig(null),
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  // Logout — dispatch to Redux, wipes token + data in one shot, no AsyncStorage
  const handleLogout = () => setLogoutConfig({
    icon:         'logout-variant',
    iconBg:       '#fce4ec',
    iconColor:    '#c62828',
    title:        'Sign Out?',
    message:      'Are you sure you want to sign out of your account? You can always log back in.',
    confirmLabel: 'Sign Out',
    cancelLabel:  'Stay',
    dangerous:    true,
    onCancel:     () => setLogoutConfig(null),
    onConfirm:    () => { setLogoutConfig(null); dispatch(userLogout()); },
  });

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          </View>
          <Text style={styles.name}>{data?.fullName || data?.username || 'User'}</Text>
          <Text style={styles.username}>@{data?.username}</Text>

          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(primaryRole) + '22' }]}>
            <View style={[styles.roleDot, { backgroundColor: getRoleColor(primaryRole) }]} />
            <Text style={[styles.roleText, { color: getRoleColor(primaryRole) }]}>
              {getRoleLabel(primaryRole)}
            </Text>
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Account Details */}
        <SectionCard title="Account Details">
          <InfoRow label="Full Name" value={data?.fullName} />
          <InfoRow label="Username"  value={data?.username} />
          <InfoRow label="Email"     value={data?.email} />
          <InfoRow label="Role"      value={getRoleLabel(primaryRole)} last />
        </SectionCard>

        {/* Settings */}
        <SectionCard title="Settings">
          <ActionRow label="Change Password"  onPress={() => setPasswordModal(true)} />
          <ActionRow label="Privacy Settings" onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon.')} last />
        </SectionCard>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>v1.0.0 · La Casa Gaudencia</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditModal
        visible={editModal}
        title="Edit Profile"
        fields={[
          { label: 'Full Name', key: 'fullName' },
          { label: 'Username',  key: 'username' },
          { label: 'Email',     key: 'email', keyboardType: 'email-address' },
        ]}
        values={profileForm}
        onChange={(k, v) => setProfileForm(p => ({ ...p, [k]: v }))}
        onCancel={() => setEditModal(false)}
        onSave={handleSaveProfile}
        loading={saving}
      />

      {/* Change Password Modal */}
      <EditModal
        visible={passwordModal}
        title="Change Password"
        fields={[
          { label: 'New Password',     key: 'newPassword',     secure: true },
          { label: 'Confirm Password', key: 'confirmPassword', secure: true },
        ]}
        values={passwordForm}
        onChange={(k, v) => setPasswordForm(p => ({ ...p, [k]: v }))}
        onCancel={() => setPasswordModal(false)}
        onSave={handleChangePassword}
        loading={saving}
      />

      {/* Logout Confirmation */}
      <ConfirmModal config={logoutConfig} />

      {/* Success feedback */}
      <SuccessModal config={successConfig} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll:    { paddingBottom: SPACING.xxl },

  header: {
    backgroundColor:      COLORS.primary,
    alignItems:           'center',
    paddingTop:           Platform.OS === 'ios' ? 64 : 48,
    paddingBottom:        SPACING.xl,
    borderBottomLeftRadius:  RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...SHADOW.brand,
  },
  avatarWrapper: {
    borderRadius:  RADIUS.full,
    borderWidth:   3,
    borderColor:   'rgba(255,255,255,0.6)',
    marginBottom:  SPACING.md,
    ...SHADOW.md,
  },
  avatar:   { width: 96, height: 96, borderRadius: RADIUS.full },
  name:     { color: COLORS.textLight, fontSize: 22, fontFamily: FONTS.display, fontWeight: '700', letterSpacing: 0.3 },
  username: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontFamily: FONTS.body, marginTop: 2 },
  roleBadge: {
    flexDirection:    'row',
    alignItems:       'center',
    borderRadius:     RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical:  SPACING.xs,
    marginTop:        SPACING.sm,
    gap:              6,
  },
  roleDot:  { width: 7, height: 7, borderRadius: RADIUS.full },
  roleText: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: 0.5 },
  editBtn: {
    marginTop:        SPACING.md,
    backgroundColor:  'rgba(255,255,255,0.18)',
    borderWidth:      1.5,
    borderColor:      'rgba(255,255,255,0.45)',
    borderRadius:     RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical:  SPACING.sm,
  },
  editBtnText: { color: COLORS.textLight, fontSize: 13, fontFamily: FONTS.bold, fontWeight: '600' },

  card: {
    backgroundColor:   COLORS.surface,
    marginHorizontal:  SPACING.md,
    marginTop:         SPACING.lg,
    borderRadius:      RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingTop:        SPACING.md,
    paddingBottom:     SPACING.sm,
    ...SHADOW.sm,
  },
  cardTitle: {
    fontSize:      13,
    fontFamily:    FONTS.bold,
    fontWeight:    '700',
    color:         COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:  SPACING.sm,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel:     { fontSize: 15, fontFamily: FONTS.medium, color: COLORS.textDark },
  infoValue:     { fontSize: 14, fontFamily: FONTS.body, color: COLORS.textMuted, maxWidth: '55%', textAlign: 'right' },
  chevron:       { fontSize: 20, color: COLORS.textMuted, lineHeight: 22 },

  logoutBtn: {
    marginHorizontal: SPACING.md,
    marginTop:        SPACING.xl,
    height:           50,
    borderRadius:     RADIUS.md,
    borderWidth:      1.5,
    borderColor:      COLORS.primary,
    justifyContent:   'center',
    alignItems:       'center',
  },
  logoutText: { color: COLORS.primary, fontSize: 15, fontFamily: FONTS.bold, fontWeight: '600' },
  version:    { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.body, marginTop: SPACING.lg },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor:     COLORS.surface,
    borderTopLeftRadius:  RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal:   SPACING.lg,
    paddingBottom:       Platform.OS === 'ios' ? 40 : SPACING.xl,
    paddingTop:          SPACING.md,
    ...SHADOW.lg,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: RADIUS.full, alignSelf: 'center', marginBottom: SPACING.md },
  modalTitle:  { fontSize: 18, fontFamily: FONTS.display, fontWeight: '700', color: COLORS.textDark, marginBottom: SPACING.lg },
  modalField:  { marginBottom: SPACING.md },
  modalLabel: {
    fontSize:      12,
    fontFamily:    FONTS.bold,
    fontWeight:    '600',
    color:         COLORS.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom:  SPACING.xs,
  },
  modalInputWrap: {
    backgroundColor:   COLORS.surfaceAlt,
    borderRadius:      RADIUS.md,
    paddingHorizontal: SPACING.md,
    height:            48,
    borderWidth:       1,
    borderColor:       COLORS.border,
    flexDirection:     'row',
    alignItems:        'center',
  },
  modalInputWithIcon: { paddingRight: SPACING.sm },
  modalInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.textDark,
  },
  modalEyeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  modalActions:       { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  modalBtnCancel:     { flex: 1, height: 52, flexDirection: 'row', gap: 6, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  modalBtnCancelText: { color: COLORS.textMuted, fontSize: 14, fontFamily: FONTS.bold, fontWeight: '600' },
  modalBtnSave:       { flex: 1, height: 52, flexDirection: 'row', gap: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOW.brand },
  modalBtnSaveText:   { color: '#fff', fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700' },
});

export default ProfileScreen;
