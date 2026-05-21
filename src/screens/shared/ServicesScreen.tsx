// src/screens/shared/ServicesScreen.tsx
import React, { FC, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, StatusBar, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../../store';
import {
  getRooms, getTours, getFoods, getPackages,
  deleteRoom, deleteTour, deleteFood, deletePackage,
} from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';
import ROUTES from '../../utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceType = 'Rooms' | 'Tours' | 'Food' | 'Packages';

interface Props { canEdit: boolean; accentColor: string; }

const TABS: { key: ServiceType; icon: string }[] = [
  { key: 'Rooms',    icon: 'bed' },
  { key: 'Tours',    icon: 'compass' },
  { key: 'Food',     icon: 'food-fork-drink' },
  { key: 'Packages', icon: 'gift' },
];

const STATUS_COLOR: Record<string, string> = {
  available:   COLORS.success,
  active:      COLORS.success,
  unavailable: COLORS.error,
  inactive:    COLORS.error,
  maintenance: COLORS.warning,
  booked:      COLORS.warning,
};

// ─── Item Card ────────────────────────────────────────────────────────────────

const ItemCard: FC<{
  item: any; type: ServiceType; canEdit: boolean; accentColor: string;
  onPress: () => void; onEdit: () => void; onDelete: () => void;
}> = ({ item, type, canEdit, accentColor, onPress, onEdit, onDelete }) => {
  const label = item.name || item.roomNumber || `#${item.id}`;
  const sub =
    type === 'Rooms'    ? `${item.roomType ?? ''} · ₱${item.pricePerNight ?? 0}/night` :
    type === 'Tours'    ? `${item.location ?? ''} · ₱${item.price ?? 0}` :
    type === 'Food'     ? `${item.category ?? ''} · ₱${item.price ?? 0}` :
    `₱${item.packagePrice ?? 0}  (${item.discountPercentage ?? 0}% off)`;

  const statusKey = (item.status ?? '').toLowerCase();
  const statusColor = STATUS_COLOR[statusKey] ?? COLORS.textMuted;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{label}</Text>
          {item.status ? (
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '1A' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cardSub} numberOfLines={1}>{sub}</Text>
        {canEdit && (
          <View style={styles.cardActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: accentColor + '18' }]} onPress={onEdit}>
              <Icon name="pencil" size={14} color={accentColor} />
              <Text style={[styles.actionBtnText, { color: accentColor }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.errorFaded }]} onPress={onDelete}>
              <Icon name="trash-can" size={14} color={COLORS.error} />
              <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Icon name="chevron-right" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ServicesScreen: FC<Props> = ({ canEdit, accentColor }) => {
  const navigation = useNavigation<any>();
  const { token } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<ServiceType>('Rooms');
  const [data, setData] = useState<Record<ServiceType, any[]>>({
    Rooms: [], Tours: [], Food: [], Packages: [],
  });
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [r, t, f, p] = await Promise.all([
        getRooms(token), getTours(token), getFoods(token), getPackages(token),
      ]);
      setData({
        Rooms:    r.data ?? [],
        Tours:    t.data ?? [],
        Food:     f.data ?? [],
        Packages: p.data ?? [],
      });
    } catch (e) {
      console.error('[ServicesScreen]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const routeFor = (action: 'detail' | 'form', type: ServiceType) => {
    const map: Record<ServiceType, Record<string, string>> = {
      Rooms:    { detail: ROUTES.ROOM_DETAIL,    form: ROUTES.ROOM_FORM },
      Tours:    { detail: ROUTES.TOUR_DETAIL,    form: ROUTES.TOUR_FORM },
      Food:     { detail: ROUTES.FOOD_DETAIL,    form: ROUTES.FOOD_FORM },
      Packages: { detail: ROUTES.PACKAGE_DETAIL, form: ROUTES.PACKAGE_FORM },
    };
    return map[type][action];
  };

  const handleDelete = (item: any, type: ServiceType) => {
    Alert.alert(
      'Delete',
      `Delete "${item.name || item.roomNumber}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'Rooms')    await deleteRoom(item.id, token);
              if (type === 'Tours')    await deleteTour(item.id, token);
              if (type === 'Food')     await deleteFood(item.id, token);
              if (type === 'Packages') await deletePackage(item.id, token);
              fetchAll();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  const items = data[activeTab];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={styles.headerTitle}>Services</Text>
        {canEdit && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate(routeFor('form', activeTab), { type: activeTab })}
          >
            <Icon name="plus" size={20} color={accentColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: accentColor, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Icon name={tab.icon} size={16} color={activeTab === tab.key ? accentColor : COLORS.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === tab.key ? accentColor : COLORS.textMuted }]}>
              {tab.key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading
        ? <ActivityIndicator color={accentColor} style={{ marginTop: 40 }} />
        : <FlatList
            data={items}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Icon name="inbox-outline" size={44} color={COLORS.border} />
                <Text style={styles.emptyText}>No {activeTab} found</Text>
              </View>
            }
            renderItem={({ item }) => (
              <ItemCard
                item={item}
                type={activeTab}
                canEdit={canEdit}
                accentColor={accentColor}
                onPress={() => navigation.navigate(routeFor('detail', activeTab), { id: item.id, type: activeTab })}
                onEdit={() => navigation.navigate(routeFor('form', activeTab), { id: item.id, type: activeTab, item })}
                onDelete={() => handleDelete(item, activeTab)}
              />
            )}
          />
      }
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontFamily: FONTS.display, fontWeight: '700' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12,
  },
  tabText: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700' },

  list: { padding: 14, paddingBottom: 100 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    marginBottom: 10, overflow: 'hidden', ...SHADOW.sm,
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody:   { flex: 1, padding: 14 },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle:  { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, flex: 1, marginRight: 8 },
  cardSub:    { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.body, marginBottom: 8 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot:   { width: 5, height: 5, borderRadius: 3 },
  statusText:  { fontSize: 10, fontWeight: '700', fontFamily: FONTS.body },

  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  actionBtnText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bold },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body },
});

export default ServicesScreen;
