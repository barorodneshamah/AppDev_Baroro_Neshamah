// src/screens/admin/AdminActivityLogsScreen.tsx
import React, { FC, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getActivityLogs } from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS, getRoleColor } from '../../theme';
import ROUTES from '../../utils';

const ACTION_META: Record<string, { color: string; icon: string }> = {
  LOGIN:   { color: COLORS.success, icon: 'login' },
  LOGOUT:  { color: COLORS.textMuted,icon: 'logout' },
  CREATE:  { color: COLORS.info,    icon: 'plus-circle-outline' },
  UPDATE:  { color: COLORS.warning, icon: 'pencil-circle-outline' },
  DELETE:  { color: COLORS.error,   icon: 'delete-circle-outline' },
};

const AdminActivityLogsScreen: FC = () => {
  const navigation = useNavigation<any>();
  const { token }  = useSelector((state: RootState) => state.auth);

  const [list, setList]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]       = useState('ALL');

  const fetchData = useCallback(async () => {
    try {
      const res = await getActivityLogs(token);
      setList(res['hydra:member'] ?? res.data ?? res ?? []);
    } catch (e) { console.error('[ActivityLogs]', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const FILTERS = ['ALL', 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE'];
  const filtered = filter === 'ALL' ? list : list.filter(l => l.action === filter);

  const renderItem = ({ item }: { item: any }) => {
    const meta = ACTION_META[item.action] ?? { color: COLORS.textMuted, icon: 'information-outline' };
    const roleColor = getRoleColor(item.userRole ?? '');

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate(ROUTES.ADMIN_ACTIVITY_LOG_DETAIL, { id: item.id, log: item })}
      >
        <View style={[styles.cardLeft, { backgroundColor: meta.color }]}>
          <Icon name={meta.icon} size={18} color="#fff" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardDesc} numberOfLines={1}>{item.description || `${item.action} ${item.entityType}`}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardUser}>{item.username}</Text>
            <View style={[styles.rolePill, { backgroundColor: roleColor + '1A' }]}>
              <Text style={[styles.rolePillText, { color: roleColor }]}>
                {(item.userRole ?? '').replace('ROLE_', '')}
              </Text>
            </View>
            <View style={[styles.sourcePill, item.source === 'mobile' ? styles.sourceMobile : styles.sourceWeb]}>
              <Icon
                name={item.source === 'mobile' ? 'cellphone' : 'monitor'}
                size={9}
                color={item.source === 'mobile' ? '#7b1fa2' : '#1565c0'}
              />
              <Text style={[styles.sourceText, { color: item.source === 'mobile' ? '#7b1fa2' : '#1565c0' }]}>
                {item.source === 'mobile' ? 'App' : 'Web'}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.cardDate}>{item.createdAt?.slice(0, 10) ?? '—'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity Logs</Text>
        <Text style={styles.headerCount}>{list.length} entries</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && { backgroundColor: COLORS.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && { color: '#fff' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
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
                <Icon name="history" size={44} color={COLORS.border} />
                <Text style={styles.emptyText}>No logs found</Text>
              </View>
            }
            renderItem={renderItem}
          />
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontFamily: FONTS.display, fontWeight: '700' },
  headerCount: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: FONTS.body },

  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  chip:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt },
  chipText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bold, color: COLORS.textMuted },

  list: { padding: 14, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    marginBottom: 8, overflow: 'hidden', ...SHADOW.sm,
  },
  cardLeft:  { width: 48, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  cardBody:  { flex: 1, padding: 12 },
  cardDesc:  { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textDark },
  cardMeta:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  cardUser:  { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body },
  rolePill:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  rolePillText: { fontSize: 9, fontWeight: '700', fontFamily: FONTS.bold },
  cardDate:  { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body, paddingRight: 12 },
  sourcePill:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  sourceMobile: { backgroundColor: 'rgba(123,31,162,0.1)' },
  sourceWeb:    { backgroundColor: 'rgba(21,101,192,0.1)' },
  sourceText:   { fontSize: 9, fontWeight: '700', fontFamily: FONTS.bold },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body },
});

export default AdminActivityLogsScreen;
