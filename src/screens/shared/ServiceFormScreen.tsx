// src/screens/shared/ServiceFormScreen.tsx
import React, { FC, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  createRoom, updateRoom, createTour, updateTour,
  createFood, updateFood, createPackage, updatePackage,
} from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';

type ServiceType = 'Rooms' | 'Tours' | 'Food' | 'Packages';

interface Props { accentColor: string; }

// ─── Field config per service type ────────────────────────────────────────────

const FIELDS: Record<ServiceType, { key: string; label: string; placeholder: string; numeric?: boolean; multiline?: boolean }[]> = {
  Rooms: [
    { key: 'roomNumber',    label: 'Room Number',    placeholder: '101' },
    { key: 'roomType',      label: 'Room Type',      placeholder: 'Deluxe / Suite / Standard' },
    { key: 'pricePerNight', label: 'Price / Night',  placeholder: '0.00', numeric: true },
    { key: 'capacity',      label: 'Capacity',       placeholder: '2',    numeric: true },
    { key: 'status',        label: 'Status',         placeholder: 'available / unavailable / maintenance' },
    { key: 'description',   label: 'Description',    placeholder: 'Describe the room…', multiline: true },
    { key: 'features',      label: 'Features (comma-separated)', placeholder: 'WiFi, AC, TV' },
  ],
  Tours: [
    { key: 'name',           label: 'Tour Name',      placeholder: 'Island Hopping' },
    { key: 'location',       label: 'Location',       placeholder: 'Palawan' },
    { key: 'price',          label: 'Price',          placeholder: '0.00', numeric: true },
    { key: 'duration',       label: 'Duration',       placeholder: '4 hours' },
    { key: 'availableSlots', label: 'Available Slots',placeholder: '10',   numeric: true },
    { key: 'scheduleDate',   label: 'Schedule Date',  placeholder: 'YYYY-MM-DD' },
    { key: 'status',         label: 'Status',         placeholder: 'active / inactive' },
    { key: 'description',    label: 'Description',    placeholder: 'Describe the tour…', multiline: true },
  ],
  Food: [
    { key: 'name',           label: 'Food Name',      placeholder: 'Kare-kare' },
    { key: 'category',       label: 'Category',       placeholder: 'Main Course / Dessert / Beverage' },
    { key: 'price',          label: 'Price',          placeholder: '0.00', numeric: true },
    { key: 'availableStock', label: 'Available Stock',placeholder: '50',   numeric: true },
    { key: 'status',         label: 'Status',         placeholder: 'available / unavailable' },
    { key: 'description',    label: 'Description',    placeholder: 'Describe the dish…', multiline: true },
  ],
  Packages: [
    { key: 'name',               label: 'Package Name',    placeholder: 'Weekend Getaway' },
    { key: 'originalPrice',      label: 'Original Price',  placeholder: '0.00', numeric: true },
    { key: 'packagePrice',       label: 'Package Price',   placeholder: '0.00', numeric: true },
    { key: 'discountPercentage', label: 'Discount %',      placeholder: '10',   numeric: true },
    { key: 'durationDays',       label: 'Duration (days)', placeholder: '2',    numeric: true },
    { key: 'durationNights',     label: 'Duration (nights)',placeholder: '1',   numeric: true },
    { key: 'maxGuests',          label: 'Max Guests',      placeholder: '4',    numeric: true },
    { key: 'validUntil',         label: 'Valid Until',     placeholder: 'YYYY-MM-DD' },
    { key: 'status',             label: 'Status',          placeholder: 'active / inactive' },
    { key: 'description',        label: 'Description',     placeholder: 'Describe the package…', multiline: true },
    { key: 'inclusions',         label: 'Inclusions',      placeholder: 'What is included…',     multiline: true },
    { key: 'exclusions',         label: 'Exclusions',      placeholder: 'What is NOT included…', multiline: true },
  ],
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const ServiceFormScreen: FC<Props> = ({ accentColor }) => {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { type, id, item: passedItem } = route.params as { type: ServiceType; id?: number; item?: any };
  const { token } = useSelector((state: RootState) => state.auth);

  const isEdit = !!id;

  const buildInitial = () => {
    const init: Record<string, string> = {};
    FIELDS[type].forEach(f => { init[f.key] = passedItem ? String(passedItem[f.key] ?? '') : ''; });
    return init;
  };

  const [form, setForm]       = useState<Record<string, string>>(buildInitial);
  const [saving, setSaving]   = useState(false);

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const buildPayload = () => {
    const p: Record<string, any> = {};
    FIELDS[type].forEach(f => {
      const v = form[f.key];
      if (v === '') return;
      p[f.key] = f.numeric ? Number(v) : v;
    });
    if (type === 'Rooms' && p.features)
      p.features = String(p.features).split(',').map((s: string) => s.trim());
    return p;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        if (type === 'Rooms')    await updateRoom(id!, payload, token);
        if (type === 'Tours')    await updateTour(id!, payload, token);
        if (type === 'Food')     await updateFood(id!, payload, token);
        if (type === 'Packages') await updatePackage(id!, payload, token);
      } else {
        if (type === 'Rooms')    await createRoom(payload, token);
        if (type === 'Tours')    await createTour(payload, token);
        if (type === 'Food')     await createFood(payload, token);
        if (type === 'Packages') await createPackage(payload, token);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit' : 'Add'} {type.slice(0, -1)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {FIELDS[type].map(f => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={[styles.input, f.multiline && styles.inputMulti]}
              placeholder={f.placeholder}
              placeholderTextColor={COLORS.textMuted}
              value={form[f.key]}
              onChangeText={v => set(f.key, v)}
              keyboardType={f.numeric ? 'numeric' : 'default'}
              multiline={f.multiline}
              numberOfLines={f.multiline ? 4 : 1}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: accentColor }, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Icon name={isEdit ? 'content-save' : 'plus-circle'} size={18} color="#fff" />
                <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : `Add ${type.slice(0, -1)}`}</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: FONTS.display, fontWeight: '700' },

  body:  { padding: 16, paddingBottom: 100 },

  field: { marginBottom: 16 },
  label: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.textDark, fontFamily: FONTS.body,
    ...SHADOW.sm,
  },
  inputMulti: { height: 100, textAlignVertical: 'top' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: RADIUS.md, marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONTS.bold },
});

export default ServiceFormScreen;
