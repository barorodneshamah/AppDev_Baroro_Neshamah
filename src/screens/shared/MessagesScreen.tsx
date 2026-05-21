// src/screens/shared/MessagesScreen.tsx
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
import { getContactMessages } from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';

interface Props { accentColor: string; detailRoute: string; }

const STATUS_META: Record<string, { color: string; icon: string }> = {
  unread:   { color: COLORS.warning, icon: 'email-outline' },
  read:     { color: COLORS.info,    icon: 'email-open-outline' },
  replied:  { color: COLORS.success, icon: 'reply' },
  archived: { color: COLORS.textMuted,icon:'archive-outline' },
};

const MessagesScreen: FC<Props> = ({ accentColor, detailRoute }) => {
  const navigation = useNavigation<any>();
  const { token }  = useSelector((state: RootState) => state.auth);

  const [list, setList]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]       = useState('ALL');

  const fetchData = useCallback(async () => {
    try {
      const res = await getContactMessages(token);
      setList(res['hydra:member'] ?? res.data ?? res ?? []);
    } catch (e) { console.error('[Messages]', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const FILTERS = ['ALL', 'unread', 'read', 'replied', 'archived'];
  const filtered = filter === 'ALL' ? list : list.filter(m => m.status === filter);
  const unreadCount = list.filter(m => m.status === 'unread').length;

  const renderItem = ({ item }: { item: any }) => {
    const meta = STATUS_META[item.status] ?? { color: COLORS.textMuted, icon: 'email-outline' };
    return (
      <TouchableOpacity
        style={[styles.card, item.status === 'unread' && styles.cardUnread]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate(detailRoute, { id: item.id, message: item })}
      >
        <View style={[styles.cardLeft, { backgroundColor: meta.color }]}>
          <Icon name={meta.icon} size={20} color="#fff" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName}>{item.fullName}</Text>
          <Text style={styles.cardSubject} numberOfLines={1}>{item.subject}</Text>
          <Text style={styles.cardPreview} numberOfLines={1}>{item.message}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.cardStatus, { color: meta.color }]}>{item.status}</Text>
          <Text style={styles.cardDate}>{item.createdAt?.slice(0, 10) ?? '—'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <View>
          <Text style={styles.headerTitle}>Messages</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
        <Text style={styles.headerCount}>{list.length} total</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && { backgroundColor: accentColor }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && { color: '#fff' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color={accentColor} style={{ marginTop: 40 }} />
        : <FlatList
            data={filtered}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={accentColor} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Icon name="email-off-outline" size={44} color={COLORS.border} />
                <Text style={styles.emptyText}>No messages</Text>
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
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontFamily: FONTS.display, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: FONTS.body, marginTop: 2 },
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
    marginBottom: 10, overflow: 'hidden', ...SHADOW.sm,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.warning },
  cardLeft:   { width: 52, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  cardBody:   { flex: 1, padding: 12 },
  cardName:   { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  cardSubject:{ fontSize: 12, color: COLORS.textDark, fontFamily: FONTS.medium, marginTop: 2 },
  cardPreview:{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },
  cardRight:  { padding: 12, alignItems: 'flex-end', gap: 4 },
  cardStatus: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.bold },
  cardDate:   { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body },
});

export default MessagesScreen;
