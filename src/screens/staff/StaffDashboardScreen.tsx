// src/screens/staff/StaffDashboardScreen.tsx
import React, { FC, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../../store';
import { getTours, getRooms, getFoods, getSpaServices } from '../../app/api/api';
import ROUTES from '../../utils';
import { COLORS, FONTS, SHADOW } from '../../theme';

const STAFF_ACCENT = COLORS.primary;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceStat {
  label:     string;
  icon:      string;
  count:     number;
  available: number;
  color:     string;
  action:    string;
}

interface QuickAction {
  icon:  string;
  label: string;
  color: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ServiceCard: FC<{ item: ServiceStat }> = ({ item }) => (
  <View style={[styles.statCard, { borderTopColor: item.color }]}>
    <View style={styles.statCardTop}>
      <View style={[styles.statIconBox, { backgroundColor: item.color }]}>
        <Icon name={item.icon} size={18} color="#fff" />
      </View>
      <View style={styles.activeBadge}>
        <View style={[styles.activeDot, { backgroundColor: COLORS.success }]} />
        <Text style={styles.activeBadgeText}>Active</Text>
      </View>
    </View>
    <Text style={[styles.statCount, { color: item.color }]}>{item.count}</Text>
    <Text style={styles.statCardLabel}>{item.label}</Text>
    <View style={styles.availRow}>
      <View style={[styles.availDot, { backgroundColor: item.color }]} />
      <Text style={styles.availText}>
        Available: <Text style={styles.availNumber}>{item.available}</Text>
      </Text>
    </View>
    <View style={styles.statCardFooter}>
      <Text style={[styles.statFooterLink, { color: item.color }]}>View {item.action}</Text>
      <Icon name="arrow-right" size={11} color={item.color} />
    </View>
  </View>
);

const ActionCard: FC<{ item: QuickAction }> = ({ item }) => (
  <TouchableOpacity style={styles.actionCard} activeOpacity={0.75}>
    <View style={[styles.actionIconBox, { backgroundColor: item.color + '1A' }]}>
      <Icon name={item.icon} size={17} color={item.color} />
    </View>
    <Text style={styles.actionLabel}>{item.label}</Text>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const StaffDashboardScreen: FC = () => {
  const navigation = useNavigation<any>();
  const { data, token } = useSelector((state: RootState) => state.auth);
  const unreadCount = useSelector((state: RootState) =>
    state.notifications.items.filter(n => !n.read).length,
  );

  const [stats, setStats] = useState<ServiceStat[]>([
    { label: 'Total Tours',  icon: 'compass',         count: 0, available: 0, color: '#c24a16', action: 'Tours' },
    { label: 'Total Rooms',  icon: 'bed',             count: 0, available: 0, color: '#2563eb', action: 'Rooms' },
    { label: 'Total Foods',  icon: 'food-fork-drink', count: 0, available: 0, color: '#059669', action: 'Foods' },
    { label: 'Spa & Wellness', icon: 'spa',           count: 0, available: 0, color: '#db2777', action: 'Spa' },
  ]);

  const [time, setTime]         = useState(new Date());
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchStats = useCallback(async () => {
    try {
      const [toursRes, roomsRes, foodsRes, spaRes] = await Promise.all([
        getTours(token), getRooms(token), getFoods(token), getSpaServices(token),
      ]);
      setStats(prev => prev.map(s => {
        if (s.action === 'Tours') return { ...s, count: toursRes.total ?? 0, available: toursRes.showing ?? 0 };
        if (s.action === 'Rooms') return { ...s, count: roomsRes.total ?? 0, available: roomsRes.showing ?? 0 };
        if (s.action === 'Foods') return { ...s, count: foodsRes.total ?? 0, available: foodsRes.showing ?? 0 };
        if (s.action === 'Spa') {
          const members = spaRes?.['hydra:member'] ?? spaRes?.data ?? [];
          return { ...s, count: members.length, available: members.filter((m: any) => m.status === 'Available').length };
        }
        return s;
      }));
    } catch (e) {
      console.error('[StaffDashboard]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const quickActions: QuickAction[] = [
    { icon: 'calendar',        label: 'Reservations', color: STAFF_ACCENT },
    { icon: 'bed',             label: 'View Rooms',   color: '#2563eb' },
    { icon: 'compass',         label: 'View Tours',   color: COLORS.primary },
    { icon: 'food-fork-drink', label: 'View Foods',   color: '#059669' },
  ];

  const initials = (data?.fullName || data?.username || 'S')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={STAFF_ACCENT} />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: STAFF_ACCENT }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerGreeting}>{greeting()}</Text>
          <Text style={styles.headerName} numberOfLines={1}>
            {data?.fullName || data?.username || 'Staff Member'}
          </Text>
          <View style={[styles.rolePill, { backgroundColor: '#fff' }]}>
            <Icon name="account-tie" size={10} color={STAFF_ACCENT} />
            <Text style={[styles.rolePillText, { color: STAFF_ACCENT }]}>Staff Member</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.clockBox}>
            <Text style={styles.clockTime}>
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.clockDate}>
              {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => navigation.navigate(ROUTES.NOTIFICATIONS)}
            >
              <Icon name="bell-outline" size={22} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={[styles.avatar, { borderColor: 'rgba(255,255,255,0.5)' }]}>
              <Text style={[styles.avatarText, { color: STAFF_ACCENT }]}>{initials}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={STAFF_ACCENT} />}
      >
        {/* ── Services Overview ── */}
        <View style={styles.sectionRow}>
          <Icon name="chart-pie" size={13} color={COLORS.textDark} />
          <Text style={styles.sectionTitle}>Services Overview</Text>
        </View>
        {loading
          ? <ActivityIndicator color={STAFF_ACCENT} style={{ marginVertical: 28 }} />
          : <View style={styles.grid2}>
              {stats.map(s => <ServiceCard key={s.label} item={s} />)}
            </View>
        }

        {/* ── Quick Actions ── */}
        <View style={styles.sectionRow}>
          <Icon name="lightning-bolt" size={13} color={COLORS.textDark} />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.grid2}>
          {quickActions.map(a => <ActionCard key={a.label} item={a} />)}
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f4f0' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20,
    paddingBottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerLeft:    { flex: 1, marginRight: 12 },
  headerGreeting:{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: FONTS.body, marginBottom: 2 },
  headerName:    { color: '#fff', fontSize: 20, fontFamily: FONTS.display, fontWeight: '700', marginBottom: 8 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  rolePillText:  { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bold },
  headerRight:   { alignItems: 'flex-end', gap: 8 },
  headerIcons:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn:       { position: 'relative', padding: 4 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#ef4444', borderRadius: 8,
    minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 2,
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', fontFamily: FONTS.bold },
  clockBox: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignItems: 'flex-end',
  },
  clockTime: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONTS.body },
  clockDate: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: FONTS.body },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
  },
  avatarText: { fontSize: 15, fontWeight: '800', fontFamily: FONTS.bold },

  body: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginBottom: 12, marginTop: 20,
  },
  sectionTitle: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, letterSpacing: 0.2 },

  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  statCard: {
    width: '47.5%', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, borderTopWidth: 4, ...SHADOW.sm,
  },
  statCardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statIconBox:    { width: 46, height: 46, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  activeBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e8f5e9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  activeDot:      { width: 5, height: 5, borderRadius: 3 },
  activeBadgeText:{ fontSize: 9, color: COLORS.success, fontWeight: '700', fontFamily: FONTS.body },
  statCount:      { fontSize: 28, fontWeight: '800', fontFamily: FONTS.bold, lineHeight: 32 },
  statCardLabel:  { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2, marginBottom: 8 },
  availRow:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  availDot:       { width: 7, height: 7, borderRadius: 4 },
  availText:      { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body },
  availNumber:    { fontWeight: '700', color: COLORS.textDark },
  statCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  statFooterLink: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bold },

  actionCard: {
    width: '47.5%', flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ebebeb',
    borderRadius: 14, padding: 14, ...SHADOW.sm,
  },
  actionIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionLabel:   { fontSize: 12, fontWeight: '600', color: COLORS.textDark, fontFamily: FONTS.medium, flexShrink: 1 },
});

export default StaffDashboardScreen;
