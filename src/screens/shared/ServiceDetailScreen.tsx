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
import { getRoom, getTour, getFood, getPackage, deleteRoom, deleteTour, deleteFood, deletePackage } from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';
import ROUTES from '../../utils';
import { API_BASE_URL } from '../../config/firebase';

type ServiceType = 'Rooms' | 'Tours' | 'Food' | 'Packages';

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

  useEffect(() => {
    if (passedItem) return;
    const fetch = async () => {
      try {
        let res: any;
        if (type === 'Rooms')    res = await getRoom(id, token);
        if (type === 'Tours')    res = await getTour(id, token);
        if (type === 'Food')     res = await getFood(id, token);
        if (type === 'Packages') res = await getPackage(id, token);
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
    };
    return map[type];
  };

  const handleDelete = () => {
    Alert.alert('Delete', `Delete "${item?.name || item?.roomNumber}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            if (type === 'Rooms')    await deleteRoom(id, token);
            if (type === 'Tours')    await deleteTour(id, token);
            if (type === 'Food')     await deleteFood(id, token);
            if (type === 'Packages') await deletePackage(id, token);
            navigation.goBack();
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const mainImage = item?.mainImage
    ? `${API_BASE_URL}/${item.mainImage}`.replace(/\/\/+/, '/')
    : null;

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
        <Row label="Features"    value={Array.isArray(item.features) ? item.features.join(', ') : item.features} />
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
        <Row label="Inclusions"       value={item.inclusions} />
        <Row label="Exclusions"       value={item.exclusions} />
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

  editBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: RADIUS.md },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONTS.bold },
});

export default ServiceDetailScreen;
