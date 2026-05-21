// src/screens/admin/AdminUsersScreen.tsx
import React, { FC, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Platform, StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getUsers, deleteUser } from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS, getRoleColor, getRoleLabel } from '../../theme';
import ROUTES from '../../utils';

const AdminUsersScreen: FC = () => {
  const navigation = useNavigation<any>();
  const { token }  = useSelector((state: RootState) => state.auth);

  const [list, setList]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await getUsers(token);
      setList(res['hydra:member'] ?? res.data ?? res ?? []);
    } catch (e) { console.error('[AdminUsers]', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleDelete = (user: any) => {
    Alert.alert('Delete User', `Delete "${user.username}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteUser(user.id, token); fetchData(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const filtered = list.filter(u =>
    !search ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => {
    const roles: string[] = item.roles ?? [];
    const primaryRole = roles.find(r => r !== 'ROLE_USER') ?? roles[0] ?? 'ROLE_GUEST';
    const roleColor = getRoleColor(primaryRole);
    const initials = (item.fullName || item.username || '?')
      .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate(ROUTES.ADMIN_USER_DETAIL, { id: item.id, user: item })}
      >
        <View style={[styles.avatar, { backgroundColor: roleColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName}>{item.fullName || item.username}</Text>
          <Text style={styles.cardEmail}>{item.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '1A' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{getRoleLabel(primaryRole)}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn}
            onPress={() => navigation.navigate(ROUTES.ADMIN_USER_FORM, { id: item.id, user: item })}>
            <Icon name="pencil" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Icon name="trash-can" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate(ROUTES.ADMIN_USER_FORM, {})}
        >
          <Icon name="plus" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Icon name="magnify" size={18} color={COLORS.textMuted} />
        <TextInputSearch value={search} onChange={setSearch} />
      </View>

      {loading
        ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        : <FlatList
            data={filtered}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Icon name="account-off-outline" size={44} color={COLORS.border} />
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            }
            renderItem={renderItem}
          />
      }
    </View>
  );
};

// Inline search input to avoid importing TextInput above
import { TextInput } from 'react-native';
const TextInputSearch: FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <TextInput
    style={styles.searchInput}
    placeholder="Search users…"
    placeholderTextColor={COLORS.textMuted}
    value={value}
    onChangeText={onChange}
  />
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontFamily: FONTS.display, fontWeight: '700' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textDark, fontFamily: FONTS.body },

  list: { padding: 14, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 14, marginBottom: 10, ...SHADOW.sm,
  },
  avatar:      { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText:  { color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONTS.bold },
  cardBody:    { flex: 1 },
  cardName:    { fontSize: 14, fontWeight: '700', color: COLORS.textDark, fontFamily: FONTS.bold },
  cardEmail:   { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },
  roleBadge:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, marginTop: 6 },
  roleText:    { fontSize: 10, fontWeight: '700', fontFamily: FONTS.bold },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn:     { width: 34, height: 34, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryFaded, justifyContent: 'center', alignItems: 'center' },
  deleteBtn:   { width: 34, height: 34, borderRadius: RADIUS.sm, backgroundColor: COLORS.errorFaded, justifyContent: 'center', alignItems: 'center' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body },
});

export default AdminUsersScreen;
