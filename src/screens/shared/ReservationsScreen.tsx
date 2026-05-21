// src/screens/shared/ReservationsScreen.tsx
import React, { FC, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getReservations } from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';

type FetchFn = (token?: string | null) => Promise<any>;

interface Props {
  accentColor: string;
  detailRoute: string;
  fetchFn?:   FetchFn;
}

const STATUS_META: Record<string, { color: string; icon: string }> = {
  PENDING:   { color: COLORS.warning, icon: 'clock-outline' },
  CONFIRMED: { color: COLORS.success, icon: 'check-circle-outline' },
  CANCELLED: { color: COLORS.error,   icon: 'close-circle-outline' },
  COMPLETED: { color: COLORS.info,    icon: 'flag-checkered' },
};

const FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

const ReservationsScreen: FC<Props> = ({ accentColor, detailRoute, fetchFn }) => {
  const navigation          = useNavigation<any>();
  const { token }           = useSelector((state: RootState) => state.auth);

  const [list, setList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]     = useState<string>('ALL');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const apiFn = fetchFn ?? getReservations;

  const fetchData = useCallback(async () => {
    setFetchError(null);
    try {
      const res = await apiFn(token);
      setList(res['hydra:member'] ?? res.data ?? res ?? []);
    } catch (e: any) {
      console.error('[Reservations]', e);
      setFetchError(e.message ?? 'Failed to load reservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, apiFn]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const filtered = filter === 'ALL' ? list : list.filter(r => r.status === filter);

  const renderItem = ({ item }: { item: any }) => {
    const meta  = STATUS_META[item.status] ?? { color: COLORS.textMuted, icon: 'help-circle-outline' };
    const date  = item.checkInDate || item.tourDate || '—';
    const guest = item.guest?.username || item.guest?.fullName || '—';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate(detailRoute, { id: item.id, reservation: item })}
      >
        <View style={[styles.cardLeft, { backgroundColor: meta.color }]}>
          <Icon name={meta.icon} size={20} color="#fff" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardCode}>{item.reservationCode ?? `#${item.id}`}</Text>
          <Text style={styles.cardType}>{item.serviceType} · {guest}</Text>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.cardStatus, { color: meta.color }]}>{item.status}</Text>
          <Text style={styles.cardAmount}>₱{item.totalAmount ?? '0'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={styles.headerTitle}>Reservations</Text>
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

      {loading ? (
        <ActivityIndicator color={accentColor} style={{ marginTop: 40 }} />
      ) : fetchError ? (
        <View style={styles.empty}>
          <Icon name="alert-circle-outline" size={44} color={COLORS.error} />
          <Text style={[styles.emptyText, { color: COLORS.error }]}>
            {fetchError.includes('403') ? 'Access denied (403)' : fetchError}
          </Text>
          <TouchableOpacity onPress={fetchData} style={{ marginTop: 12 }}>
            <Text style={[styles.emptyText, { color: accentColor }]}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor={accentColor}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="calendar-blank-outline" size={44} color={COLORS.border} />
              <Text style={styles.emptyText}>No reservations</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontFamily: FONTS.display, fontWeight: '700' },
  headerCount: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: FONTS.body, marginTop: 2 },

  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  chip:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt },
  chipText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bold, color: COLORS.textMuted },

  list: { padding: 14, paddingBottom: 100 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    marginBottom: 10, overflow: 'hidden', ...SHADOW.sm,
  },
  cardLeft:  { width: 52, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  cardBody:  { flex: 1, padding: 12 },
  cardCode:  { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  cardType:  { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },
  cardDate:  { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },
  cardRight: { padding: 12, alignItems: 'flex-end', gap: 4 },
  cardStatus:{ fontSize: 10, fontWeight: '700', fontFamily: FONTS.bold },
  cardAmount:{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, fontFamily: FONTS.bold },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body },
});

export default ReservationsScreen;
