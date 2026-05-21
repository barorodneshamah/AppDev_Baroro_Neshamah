// src/screens/shared/PaymentsScreen.tsx
import React, { FC, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getPayments } from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';

type FetchFn = (token?: string | null) => Promise<any>;

interface Props {
  accentColor: string;
  detailRoute: string;
  fetchFn?:   FetchFn;
}

const STATUS_META: Record<string, { color: string; icon: string }> = {
  PENDING:   { color: COLORS.warning,  icon: 'clock-outline' },
  APPROVED:  { color: COLORS.success,  icon: 'check-circle-outline' },
  REJECTED:  { color: COLORS.error,    icon: 'close-circle-outline' },
  REFUNDED:  { color: COLORS.info,     icon: 'cash-refund' },
  CANCELLED: { color: COLORS.textMuted, icon: 'cancel' },
};

const METHOD_ICON: Record<string, string> = {
  CASH: 'cash', GCASH: 'cellphone', MAYA: 'cellphone',
  CREDIT_CARD: 'credit-card', DEBIT_CARD: 'credit-card-outline',
  BANK_TRANSFER: 'bank', PAYPAL: 'paypal',
};

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'];

const PaymentsScreen: FC<Props> = ({ accentColor, detailRoute, fetchFn }) => {
  const navigation = useNavigation<any>();
  const { token }  = useSelector((state: RootState) => state.auth);

  const [list, setList]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('ALL');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const apiFn = fetchFn ?? getPayments;

  const fetchData = useCallback(async () => {
    setFetchError(null);
    try {
      const res = await apiFn(token);
      setList(res['hydra:member'] ?? res.data ?? res ?? []);
    } catch (e: any) {
      console.error('[Payments]', e);
      setFetchError(e.message ?? 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, apiFn]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const filtered     = filter === 'ALL' ? list : list.filter(p => p.status === filter);
  const pendingCount = list.filter(p => p.status === 'PENDING').length;

  const renderItem = ({ item }: { item: any }) => {
    const meta       = STATUS_META[item.status] ?? { color: COLORS.textMuted, icon: 'help-circle-outline' };
    const methodIcon = METHOD_ICON[item.paymentMethod] ?? 'cash';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate(detailRoute, { id: item.id, payment: item })}
      >
        <View style={[styles.cardLeft, { backgroundColor: meta.color }]}>
          <Icon name={meta.icon} size={20} color="#fff" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardRef}>{item.transactionReference ?? `#${item.id}`}</Text>
          <View style={styles.cardMethodRow}>
            <Icon name={methodIcon} size={12} color={COLORS.textMuted} />
            <Text style={styles.cardMethod}>{item.paymentMethod}</Text>
          </View>
          <Text style={styles.cardDate}>{item.createdAt?.slice(0, 10) ?? '—'}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.cardStatus, { color: meta.color }]}>{item.status}</Text>
          <Text style={styles.cardAmount}>₱{item.amount}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <View>
          <Text style={styles.headerTitle}>Payments</Text>
          {pendingCount > 0 && (
            <Text style={styles.headerSub}>{pendingCount} pending approval</Text>
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
              <Icon name="credit-card-off-outline" size={44} color={COLORS.border} />
              <Text style={styles.emptyText}>No payments found</Text>
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
  cardLeft:      { width: 52, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  cardBody:      { flex: 1, padding: 12 },
  cardRef:       { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  cardMethodRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardMethod:    { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body },
  cardDate:      { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },
  cardRight:     { padding: 12, alignItems: 'flex-end', gap: 4 },
  cardStatus:    { fontSize: 10, fontWeight: '700', fontFamily: FONTS.bold },
  cardAmount:    { fontSize: 13, fontWeight: '700', color: COLORS.textDark, fontFamily: FONTS.bold },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body },
});

export default PaymentsScreen;
