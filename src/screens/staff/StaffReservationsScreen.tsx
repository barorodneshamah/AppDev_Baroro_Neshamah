// src/screens/staff/StaffReservationsScreen.tsx
import React, { FC, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { getReservations } from '../../app/api/api';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reservation {
  id: number;
  reservationCode?: string;
  serviceType: string;
  status: string;
  paymentStatus: string;
  totalAmount?: number;
  checkInDate?: string;
  checkOutDate?: string;
  tourDate?: string;
  numberOfGuests?: number;
  tourParticipants?: number;
  contactPhone?: string;
  specialRequests?: string;
  createdAt?: string;
  guest?: { username?: string; email?: string };
}

type StatusFilter = 'All' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  PENDING:   COLORS.warning,
  CONFIRMED: COLORS.success,
  COMPLETED: COLORS.info,
  CANCELLED: COLORS.error,
};

const PAYMENT_COLOR: Record<string, string> = {
  PAID:    COLORS.success,
  PARTIAL: COLORS.warning,
  UNPAID:  COLORS.error,
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const serviceIcon = (type: string) =>
  type === 'room' ? '🛏️' : type === 'tour' ? '🗺️' : type === 'package' ? '🎁' : '🍽️';

// ─── Card ─────────────────────────────────────────────────────────────────────

const ReservationCard: FC<{ item: Reservation }> = ({ item }) => {
  const sc = STATUS_COLOR[item.status?.toUpperCase()] ?? COLORS.textMuted;
  const pc = PAYMENT_COLOR[item.paymentStatus?.toUpperCase()] ?? COLORS.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.serviceRow}>
          <Text style={styles.serviceIcon}>{serviceIcon(item.serviceType)}</Text>
          <Text style={styles.serviceType}>{item.serviceType?.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc + '22' }]}>
          <View style={[styles.dot, { backgroundColor: sc }]} />
          <Text style={[styles.statusText, { color: sc }]}>{item.status}</Text>
        </View>
      </View>

      {item.reservationCode ? (
        <Text style={styles.code}>#{item.reservationCode}</Text>
      ) : null}

      {item.guest?.username ? (
        <Text style={styles.guest}>👤 {item.guest.username}</Text>
      ) : null}

      <View style={styles.row}>
        <Text style={styles.label}>
          {item.serviceType === 'tour' ? 'Tour date' : 'Check-in'}
        </Text>
        <Text style={styles.value}>
          {formatDate(item.serviceType === 'tour' ? item.tourDate : item.checkInDate)}
        </Text>
      </View>

      {item.serviceType !== 'tour' && item.checkOutDate ? (
        <View style={styles.row}>
          <Text style={styles.label}>Check-out</Text>
          <Text style={styles.value}>{formatDate(item.checkOutDate)}</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Text style={styles.label}>Guests</Text>
        <Text style={styles.value}>
          {item.serviceType === 'tour' ? item.tourParticipants : item.numberOfGuests} pax
        </Text>
      </View>

      {item.contactPhone ? (
        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{item.contactPhone}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={[styles.payBadge, { backgroundColor: pc + '22' }]}>
          <Text style={[styles.payText, { color: pc }]}>{item.paymentStatus}</Text>
        </View>
        {item.totalAmount ? (
          <Text style={styles.amount}>₱{Number(item.totalAmount).toLocaleString()}</Text>
        ) : null}
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const FILTERS: StatusFilter[] = ['All', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

const StaffReservationsScreen: FC = () => {
  const { token } = useSelector((state: any) => state.auth);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [filter, setFilter]             = useState<StatusFilter>('All');

  const fetch = useCallback(async () => {
    try {
      const res = await getReservations(token);
      const list = res?.['hydra:member'] ?? res?.member ?? res?.data ?? [];
      setReservations(list);
    } catch {
      setReservations([]);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetch().finally(() => setLoading(false));
  }, [fetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  const filtered = filter === 'All'
    ? reservations
    : reservations.filter((r) => r.status?.toUpperCase() === filter);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reservations</Text>
        <Text style={styles.subtitle}>{reservations.length} total</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm }}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'All' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Count */}
      <Text style={styles.countText}>{filtered.length} reservation{filtered.length !== 1 ? 's' : ''}</Text>

      {/* List */}
      {loading ? (
        <ActivityIndicator color="#1565c0" style={{ marginTop: 60 }} size="large" />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No {filter === 'All' ? '' : filter.toLowerCase() + ' '}reservations</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565c0" />}
          renderItem={({ item }) => <ReservationCard item={item} />}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const STAFF = '#1565c0';
const STAFF_FADED = 'rgba(21,101,192,0.12)';

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },

  header:      { paddingHorizontal: SPACING.md, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: SPACING.sm, backgroundColor: COLORS.surface, ...SHADOW.sm },
  title:       { fontSize: 24, fontFamily: FONTS.display, color: COLORS.textDark, fontWeight: '700' },
  subtitle:    { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },

  filterWrap:  { paddingVertical: SPACING.sm, backgroundColor: COLORS.surface },
  filterTab:   { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt },
  filterTabActive: { backgroundColor: STAFF },
  filterText:  { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted, fontWeight: '700' },
  filterTextActive: { color: COLORS.textLight },

  countText:   { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.body },

  list:        { padding: SPACING.md, paddingBottom: 100 },

  card:        { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  serviceRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceIcon: { fontSize: 16 },
  serviceType: { fontSize: 11, fontFamily: FONTS.bold, color: STAFF, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  dot:         { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText:  { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700' },
  code:        { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  guest:       { fontSize: 13, color: STAFF, fontFamily: FONTS.medium, fontWeight: '600', marginBottom: 6 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label:       { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.body },
  value:       { fontSize: 12, color: COLORS.textDark, fontFamily: FONTS.medium, fontWeight: '600' },
  footer:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  payBadge:    { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  payText:     { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700' },
  amount:      { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textDark, fontWeight: '700' },

  empty:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText:   { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body },
});

export default StaffReservationsScreen;
