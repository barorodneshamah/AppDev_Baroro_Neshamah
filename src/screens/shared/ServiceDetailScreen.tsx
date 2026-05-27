// src/screens/shared/ServiceDetailScreen.tsx
import React, { FC, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar, Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getRoom, getTour, getFood, getPackage, getSpaService, deleteRoom, deleteTour, deleteFood, deletePackage, deleteSpa } from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';
import ROUTES from '../../utils';
import { API_BASE_URL } from '../../config/firebase';
import { ConfirmModal, ConfirmModalConfig } from '../../components/AppModals';

type ServiceType = 'Rooms' | 'Tours' | 'Food' | 'Packages' | 'Spa';

interface Props { canEdit: boolean; accentColor: string; }

const Row: FC<{ label: string; value?: any }> = ({ label, value }) =>
  value !== undefined && value !== null && value !== '' ? (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  ) : null;

const ServiceDetailScreen: FC<Props> = ({ canEdit, accentColor }) => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id, type, item: passedItem } = route.params as { id: number; type: ServiceType; item?: any };
  const { token } = useSelector((state: RootState) => state.auth);

  const [item, setItem]     = useState<any>(passedItem ?? null);
  const [loading, setLoading] = useState(!passedItem);
  const [deleteConfig, setDeleteConfig] = useState<ConfirmModalConfig | null>(null);

  useEffect(() => {
    if (passedItem) return;
    const fetch = async () => {
      try {
        let res: any;
        if (type === 'Rooms')    res = await getRoom(id, token);
        if (type === 'Tours')    res = await getTour(id, token);
        if (type === 'Food')     res = await getFood(id, token);
        if (type === 'Packages') res = await getPackage(id, token);
        if (type === 'Spa')      res = await getSpaService(id, token);
        setItem(res);
      } catch (e) { console.error('[ServiceDetail]', e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, type, token, passedItem]);

  const formRoute = () => {
    const map: Record<ServiceType, string> = {
      Rooms:    ROUTES.ROOM_FORM,
      Tours:    ROUTES.TOUR_FORM,
      Food:     ROUTES.FOOD_FORM,
      Packages: ROUTES.PACKAGE_FORM,
      Spa:      ROUTES.SPA_FORM,
    };
    return map[type];
  };

  const handleDelete = () => {
    const label = item?.name || item?.roomNumber || type.slice(0, -1);
    setDeleteConfig({
      icon:         'trash-can-outline',
      iconBg:       COLORS.errorFaded,
      iconColor:    COLORS.error,
      title:        'Delete Service?',
      message:      `Delete "${label}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel:  'Cancel',
      dangerous:    true,
      onCancel:     () => setDeleteConfig(null),
      onConfirm:    async () => {
        setDeleteConfig(null);
        try {
          if (type === 'Rooms')    await deleteRoom(id, token);
          if (type === 'Tours')    await deleteTour(id, token);
          if (type === 'Food')     await deleteFood(id, token);
          if (type === 'Packages') await deletePackage(id, token);
          if (type === 'Spa')      await deleteSpa(id, token);
          navigation.goBack();
        } catch (e: any) { Alert.alert('Error', e.message); }
      },
    });
  };

  const resolveImageUri = (path?: string | null): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${API_BASE_URL}/${path}`.replace(/([^:]\/\/)\/+/, '$1');
  };

  const mainImage = resolveImageUri(item?.mainImage || item?.image || item?.imageUrl);

  const normalizeList = (value?: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(v => String(v).trim());
    return String(value)
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
  };

  const renderChipSection = (label: string, values?: any) => {
    const list = normalizeList(values);
    if (!list.length) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{label}</Text>
        <View style={styles.chipRow}>
          {list.map((value, index) => (
            <TouchableOpacity
              key={`${label}-${index}`}
              style={styles.chip}
              onPress={() => Alert.alert(label, value)}
            >
              <Text style={styles.chipText}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPackageItems = (label: string, values?: any[]) => {
    if (!Array.isArray(values) || values.length === 0) return null;
    const labels = values.map(value => {
      if (!value || typeof value !== 'object') return String(value);
      if (value.roomNumber) return `Room ${value.roomNumber}${value.roomType ? ` - ${value.roomType}` : ''}`;
      return value.name || value.title || `Item ${value.id}`;
    });
    return renderChipSection(label, labels);
  };

  const renderFields = () => {
    if (!item) return null;
    if (type === 'Rooms') return (
      <>
        <Row label="Room Number" value={item.roomNumber} />
        <Row label="Room Type"   value={item.roomType} />
        <Row label="Price/Night" value={`₱${item.pricePerNight}`} />
        <Row label="Capacity"    value={item.capacity} />
        <Row label="Status"      value={item.status} />
        <Row label="Description" value={item.description} />
      </>
    );
    if (type === 'Tours') return (
      <>
        <Row label="Name"            value={item.name} />
        <Row label="Location"        value={item.location} />
        <Row label="Price"           value={`₱${item.price}`} />
        <Row label="Duration"        value={item.duration} />
        <Row label="Available Slots" value={item.availableSlots} />
        <Row label="Schedule Date"   value={item.scheduleDate} />
        <Row label="Status"          value={item.status} />
        <Row label="Description"     value={item.description} />
      </>
    );
    if (type === 'Food') return (
      <>
        <Row label="Name"            value={item.name} />
        <Row label="Category"        value={item.category} />
        <Row label="Price"           value={`₱${item.price}`} />
        <Row label="Available Stock" value={item.availableStock} />
        <Row label="Status"          value={item.status} />
        <Row label="Description"     value={item.description} />
      </>
    );
    if (type === 'Packages') return (
      <>
        <Row label="Name"             value={item.name} />
        <Row label="Package Price"    value={`₱${item.packagePrice}`} />
        <Row label="Original Price"   value={`₱${item.originalPrice}`} />
        <Row label="Discount"         value={`${item.discountPercentage}%`} />
        <Row label="Duration"         value={`${item.durationDays}D / ${item.durationNights}N`} />
        <Row label="Max Guests"       value={item.maxGuests} />
        <Row label="Valid Until"      value={item.validUntil} />
        <Row label="Status"           value={item.status} />
        <Row label="Description"      value={item.description} />
      </>
    );
    if (type === 'Spa') return (
      <>
        <Row label="Name"            value={item.name} />
        <Row label="Category"        value={item.category} />
        <Row label="Price"           value={`₱${item.price}`} />
        <Row label="Duration"        value={item.duration} />
        <Row label="Capacity"        value={item.capacity} />
        <Row label="Status"          value={item.status} />
        <Row label="Description"     value={item.description} />
      </>
    );
  };

  const title = item?.name || item?.roomNumber || type.slice(0, -1);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {canEdit && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Icon name="trash-can-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {loading
        ? <ActivityIndicator color={accentColor} style={{ marginTop: 40 }} />
        : (
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Image */}
            {mainImage && (
              <Image source={{ uri: mainImage }} style={styles.image} resizeMode="cover" />
            )}

            {/* Fields */}
            <View style={styles.card}>
              {renderFields()}
            </View>

            {renderChipSection('Features', item.features)}
            {renderChipSection('Amenities', item.amenities)}
            {renderChipSection('Inclusions', item.inclusions)}
            {renderChipSection('Exclusions', item.exclusions)}
            {renderPackageItems('Included Rooms', item.rooms)}
            {renderPackageItems('Included Tours', item.tours)}
            {renderPackageItems('Included Food', item.foods)}

            {/* Edit button */}
            {canEdit && (
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: accentColor }]}
                onPress={() => navigation.navigate(formRoute(), { id, type, item })}
              >
                <Icon name="pencil" size={18} color="#fff" />
                <Text style={styles.editBtnText}>Edit {type.slice(0, -1)}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )
      }
      <ConfirmModal config={deleteConfig} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn:     { padding: 4 },
  deleteBtn:   { padding: 4, marginLeft: 'auto' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontFamily: FONTS.display, fontWeight: '700' },

  body:  { padding: 16, paddingBottom: 100 },
  image: { width: '100%', height: 200, borderRadius: RADIUS.md, marginBottom: 16 },

  card:  { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, ...SHADOW.sm, marginBottom: 16 },
  row:   { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginBottom: 2 },
  rowValue: { fontSize: 14, color: COLORS.textDark, fontFamily: FONTS.medium },

  section: { marginBottom: 16, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.bold, marginBottom: 8, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: 13, color: COLORS.textDark, fontFamily: FONTS.medium },

  editBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: RADIUS.md },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONTS.bold },
});

export default ServiceDetailScreen;
