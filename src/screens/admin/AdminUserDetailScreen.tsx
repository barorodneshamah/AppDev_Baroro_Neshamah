// src/screens/admin/AdminUserDetailScreen.tsx
import React, { FC } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW, getRoleColor, getRoleLabel } from '../../theme';
import ROUTES from '../../utils';

const Row: FC<{ label: string; value?: any; icon: string }> = ({ label, value, icon }) => (
  value !== undefined && value !== null && value !== '' ? (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={COLORS.textMuted} />
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{String(value)}</Text>
      </View>
    </View>
  ) : null
);

const AdminUserDetailScreen: FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const user = route.params?.user ?? {};
  const roles: string[] = user.roles ?? [];
  const primaryRole = roles.find(role => role !== 'ROLE_USER') ?? roles[0] ?? 'ROLE_GUEST';
  const roleColor = getRoleColor(primaryRole);
  const initials = (user.fullName || user.username || '?')
    .split(' ')
    .map((word: string) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.ADMIN_USER_FORM, { id: user.id, user })}
          style={styles.editHeaderBtn}
        >
          <Icon name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user.fullName || user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '1A' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{getRoleLabel(primaryRole)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Row icon="identifier" label="User ID" value={user.id} />
          <Row icon="account" label="Username" value={user.username} />
          <Row icon="email-outline" label="Email" value={user.email} />
          <Row icon="account-card-outline" label="Full Name" value={user.fullName} />
          <Row icon="shield-account-outline" label="Roles" value={roles.join(', ')} />
          <Row icon="check-decagram-outline" label="Verified" value={user.isVerified === undefined ? undefined : user.isVerified ? 'Yes' : 'No'} />
          <Row icon="calendar-plus" label="Created" value={user.createdAt?.slice?.(0, 10)} />
          <Row icon="calendar-edit" label="Updated" value={user.updatedAt?.slice?.(0, 10)} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  editHeaderBtn: { padding: 4, marginLeft: 'auto' },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: FONTS.display, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 100 },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    ...SHADOW.sm,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800', fontFamily: FONTS.bold },
  name: { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  email: { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted, marginTop: 3 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, marginTop: 10 },
  roleText: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700' },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, ...SHADOW.sm },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted },
  rowValue: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textDark, marginTop: 2 },
});

export default AdminUserDetailScreen;
