// src/screens/ExploreScreen.tsx
import React, { FC, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Platform,
  Image, StatusBar, Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getRooms, getTours, getPackages, getFoods, getSpaServices } from '../app/api/api';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';
import ROUTES from '../utils';

const { width } = Dimensions.get('window');
const API_BASE  = 'http://192.168.254.138:8000';

const resolveImage = (path?: string, seed = 'item'): string => {
  if (!path) return `https://picsum.photos/seed/${seed}/400/240`;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
};

interface ServiceItem {
  id: number;
  name: string;
  description?: string;
  price?: number | string;
  category?: string;
  capacity?: number;
  availableSlots?: number;
  maxGuests?: number;
  availableStock?: number;
  duration?: string;
  location?: string;
  packageType?: string;
  durationDays?: number;
  image?: string;
  mainImage?: string;
  roomType?: string;
  pricePerNight?: string;
  packagePrice?: string;
  status?: string;
}

type FilterTab = 'All' | 'Rooms' | 'Tours' | 'Packages' | 'Dining' | 'Spa';
const TABS: FilterTab[] = ['All', 'Rooms', 'Tours', 'Packages', 'Dining', 'Spa'];

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  room:    { icon: 'bed',                    color: '#1565c0', label: 'Room' },
  tour:    { icon: 'map-marker-path',        color: '#2e7d32', label: 'Tour' },
  package: { icon: 'gift',                   color: '#6a1b9a', label: 'Package' },
  food:    { icon: 'silverware-fork-knife',  color: '#e65100', label: 'Dining' },
  spa:     { icon: 'spa',                    color: '#ad1457', label: 'Spa' },
};

// ─── Card ─────────────────────────────────────────────────────────────────────

const ItemCard: FC<{ item: ServiceItem; type: string; onPress: () => void }> = ({ item, type, onPress }) => {
  const meta  = TYPE_META[type] ?? TYPE_META.room;
  const price = type === 'room'    ? item.pricePerNight || item.price
              : type === 'package' ? item.packagePrice  || item.price
              : item.price;
  const sub   = type === 'tour'    ? item.location
              : type === 'room'    ? item.roomType || item.category
              : type === 'package' ? item.packageType
              : type === 'spa'     ? item.duration || item.category
              : item.category;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <Image
        source={{ uri: resolveImage(item.image || item.mainImage, `${type}${item.id}`) }}
        style={styles.cardImage}
      />
      <View style={[styles.typeBadge, { backgroundColor: meta.color }]}>
        <Icon name={meta.icon} size={10} color="#fff" />
        <Text style={styles.typeBadgeText}>{meta.label}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        {sub ? <Text style={styles.cardSub} numberOfLines={1}>{sub}</Text> : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>
            ₱{Number(price || 0).toLocaleString()}
            {type === 'room' ? '/night' : ''}
          </Text>
          {item.duration ? <Text style={styles.cardMeta}>{item.duration}</Text> : null}
          {item.capacity ? <Text style={styles.cardMeta}>{item.capacity} pax</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ExploreScreen: FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const navigation = useNavigation<any>();

  const [query,      setQuery]      = useState('');
  const [tab,        setTab]        = useState<FilterTab>('All');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [rooms,    setRooms]    = useState<ServiceItem[]>([]);
  const [tours,    setTours]    = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<ServiceItem[]>([]);
  const [foods,    setFoods]    = useState<ServiceItem[]>([]);
  const [spas,     setSpas]     = useState<ServiceItem[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [r, t, p, f, s] = await Promise.all([
        getRooms(token).catch(() => ({ data: [] })),
        getTours(token).catch(() => ({ data: [] })),
        getPackages(token).catch(() => ({ data: [] })),
        getFoods(token).catch(() => ({ data: [] })),
        getSpaServices(token).catch(() => ({ data: [] })),
      ]);
      setRooms(r?.data ?? r?.['hydra:member'] ?? []);
      setTours(t?.data ?? t?.['hydra:member'] ?? []);
      setPackages(p?.data ?? p?.['hydra:member'] ?? []);
      setFoods(f?.data ?? f?.['hydra:member'] ?? []);
      setSpas(s?.data ?? s?.['hydra:member'] ?? []);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const combined: { item: ServiceItem; type: string }[] = [
    ...rooms.map(i => ({ item: i, type: 'room' })),
    ...tours.map(i => ({ item: i, type: 'tour' })),
    ...packages.map(i => ({ item: i, type: 'package' })),
    ...foods.map(i => ({ item: i, type: 'food' })),
    ...spas.map(i => ({ item: i, type: 'spa' })),
  ];

  const filtered = combined.filter(({ item, type }) => {
    const matchesTab =
      tab === 'All'      ? true :
      tab === 'Rooms'    ? type === 'room' :
      tab === 'Tours'    ? type === 'tour' :
      tab === 'Packages' ? type === 'package' :
      tab === 'Spa'      ? type === 'spa' : type === 'food';
    const q = query.toLowerCase().trim();
    return matchesTab && (!q ||
      item.name?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q));
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>Discover rooms, tours & more</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filtered.length}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search anything..."
            placeholderTextColor={COLORS.textMuted}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Icon name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={({ item, type }) => `${type}-${item.id}`}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="magnify-remove-outline" size={56} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>Try a different keyword or category</Text>
            </View>
          }
          renderItem={({ item: { item, type } }) => (
            <ItemCard
              item={item}
              type={type}
              onPress={() => navigation.navigate(ROUTES.SERVICE_DETAIL, { item, type })}
            />
          )}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_W = (width - SPACING.md * 2 - SPACING.sm) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  title:    { fontSize: 26, fontFamily: FONTS.display, color: COLORS.textDark, fontWeight: '700' },
  subtitle: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },
  countBadge: { backgroundColor: COLORS.primaryFaded, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  countText:  { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },

  searchRow: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: COLORS.surface },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark },

  tabsRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt },
  tabActive:    { backgroundColor: COLORS.primary },
  tabText:      { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textMuted },
  tabTextActive:{ color: '#fff' },

  list: { padding: SPACING.md, paddingBottom: 100 },
  row:  { gap: SPACING.sm, marginBottom: SPACING.sm },

  card: { width: CARD_W, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.sm },
  cardImage: { width: '100%', height: 120 },
  typeBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '700', fontFamily: FONTS.bold, color: '#fff' },
  cardBody:   { padding: 10 },
  cardName:   { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  cardSub:    { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginBottom: 6 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  cardPrice:  { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  cardMeta:   { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body, backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },

  empty:      { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  emptyText:  { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.body },
});

export default ExploreScreen;
