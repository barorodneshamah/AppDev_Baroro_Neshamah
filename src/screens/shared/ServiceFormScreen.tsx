// src/screens/shared/ServiceFormScreen.tsx
import React, { FC, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Platform, StatusBar, Image, PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  createRoom, updateRoom, createTour, updateTour,
  createFood, updateFood, createPackage, updatePackage,
  createSpa, updateSpa,
  getRooms, getTours, getFoods, getPackage,
  uploadServiceImage,
} from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';
import { API_BASE_URL } from '../../config/firebase';

type ServiceType = 'Rooms' | 'Tours' | 'Food' | 'Packages' | 'Spa';
type FieldConfig = { key: string; label: string; placeholder: string; numeric?: boolean; multiline?: boolean; options?: string[]; readOnly?: boolean };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type PhotoSelection = {
  kind: 'gallery';
  uri: string;
  fileName: string;
  mimeType: string;
};

interface Props { accentColor: string; }

type PackageBucket = 'roomIds' | 'tourIds' | 'foodIds';
type PackageOption = {
  id: number;
  label: string;
  sub: string;
  price: number;
};

// ─── Field config per service type ────────────────────────────────────────────

const FIELDS: Record<ServiceType, FieldConfig[]> = {
  Rooms: [
    { key: 'roomNumber',    label: 'Room Number',    placeholder: '101' },
    { key: 'roomType',      label: 'Room Type',      placeholder: 'Deluxe / Suite / Standard', options: ['Standard', 'Deluxe', 'Suite', 'Family', 'Single', 'Double'] },
    { key: 'pricePerNight', label: 'Price / Night',  placeholder: '0.00', numeric: true },
    { key: 'capacity',      label: 'Capacity',       placeholder: '2',    numeric: true },
    { key: 'status',        label: 'Status',         placeholder: 'Available / Unavailable / Maintenance', options: ['Available', 'Unavailable', 'Maintenance'] },
    { key: 'description',   label: 'Description',    placeholder: 'Describe the room…', multiline: true },
    { key: 'features',      label: 'Features', placeholder: 'Select features…', options: [
      'WiFi', 'Air Conditioning', 'Mini Bar', 'Television', 'Hot Shower', 'Complimentary Breakfast', 'Room Service', 'Balcony', 'Sea View', 'Soundproof',
      'Laundry Service', 'Gym Access', 'Swimming Pool Access', 'Pet Friendly', 'Kitchenette', 'Parking', 'Wheelchair Accessible', 'Daily Housekeeping',
      'Coffee Maker', 'Hair Dryer', 'Iron and Ironing Board', 'Blackout Curtains', 'Telephone', 'Desk/Work Area', 'Extra Bedding', 'Refrigerator',
      'Microwave', 'Toaster', 'Gas Stove', 'Dishwasher', 'Dining Area', 'Living Area', 'Fireplace', 'Jacuzzi', 'Terrace', 'Garden View', 'City View',
      'Mountain View', 'Beach Access', 'Spa Access', 'Sauna', 'Steam Room', 'Sofa Bed', 'Crib Available', 'Slippers', 'Bathrobe', 'Toiletries',
      'Towels'
    ] },
  ],
  Tours: [
    { key: 'name',           label: 'Tour Name',      placeholder: 'Island Hopping' },
    { key: 'location',       label: 'Location',       placeholder: 'Palawan', options: ['Palawan', 'Cebu', 'Boracay', 'Bohol', 'Manila'] },
    { key: 'price',          label: 'Price',          placeholder: '0.00', numeric: true },
    { key: 'duration',       label: 'Duration',       placeholder: '4 hours', options: ['2 hours', '3 hours', '4 hours', 'Half day', 'Full day', '2 days 1 night', '3 days 2 nights'] },
    { key: 'availableSlots', label: 'Available Slots',placeholder: '10',   numeric: true },
    { key: 'scheduleDate',   label: 'Schedule Date',  placeholder: 'YYYY-MM-DD' },
    { key: 'schedule',       label: 'Schedule',       placeholder: 'Daily / Weekends / By appointment', options: ['Daily', 'Weekdays', 'Weekends', 'Every Monday', 'Every Wednesday', 'Every Friday', 'By appointment'] },
    { key: 'status',         label: 'Status',         placeholder: 'Available / Unavailable', options: ['Available', 'Unavailable'] },
    { key: 'description',    label: 'Description',    placeholder: 'Describe the tour…', multiline: true },
  ],
  Food: [
    { key: 'name',           label: 'Food Name',      placeholder: 'Kare-kare' },
    { key: 'category',       label: 'Category',       placeholder: 'Main Course / Dessert / Beverage', options: ['Main Course', 'Dessert', 'Beverage', 'Snack', 'Appetizer'] },
    { key: 'price',          label: 'Price',          placeholder: '0.00', numeric: true },
    { key: 'availableStock', label: 'Available Stock',placeholder: '50',   numeric: true },
    { key: 'status',         label: 'Status',         placeholder: 'Available / Unavailable', options: ['Available', 'Unavailable'] },
    { key: 'description',    label: 'Description',    placeholder: 'Describe the dish…', multiline: true },
  ],
  Packages: [
    { key: 'name',               label: 'Package Name',    placeholder: 'Weekend Getaway' },
    { key: 'originalPrice',      label: 'Original Price',  placeholder: '0.00', numeric: true, readOnly: true },
    { key: 'packagePrice',       label: 'Package Price',   placeholder: '0.00', numeric: true, readOnly: true },
    { key: 'discountPercentage', label: 'Discount %',      placeholder: '10',   numeric: true },
    { key: 'durationDays',       label: 'Duration (days)', placeholder: '2',    numeric: true },
    { key: 'durationNights',     label: 'Duration (nights)',placeholder: '1',   numeric: true },
    { key: 'maxGuests',          label: 'Max Guests',      placeholder: '4',    numeric: true },
    { key: 'validUntil',         label: 'Valid Until',     placeholder: 'YYYY-MM-DD' },
    { key: 'status',             label: 'Status',          placeholder: 'Active / Inactive', options: ['Active', 'Inactive'] },
    { key: 'description',        label: 'Description',     placeholder: 'Describe the package…', multiline: true },
    { key: 'inclusions',         label: 'Inclusions',      placeholder: 'What is included…',     multiline: true },
    { key: 'exclusions',         label: 'Exclusions',      placeholder: 'What is NOT included…', multiline: true },
  ],
  Spa: [
    { key: 'name',           label: 'Spa Service Name', placeholder: 'Hot Stone Massage' },
    { key: 'category',       label: 'Category',         placeholder: 'Massage / Facial / Body Treatment', options: ['Massage', 'Facial', 'Body Treatment', 'Manicure & Pedicure', 'Hair Treatment', 'Aromatherapy', 'Hydrotherapy'] },
    { key: 'price',          label: 'Price',            placeholder: '0.00', numeric: true },
    { key: 'duration',       label: 'Duration',         placeholder: '60 minutes', options: ['30 minutes', '45 minutes', '60 minutes', '90 minutes', '2 hours', '3 hours'] },
    { key: 'capacity',       label: 'Capacity',         placeholder: '5', numeric: true },
    { key: 'status',         label: 'Status',           placeholder: 'Available / Unavailable', options: ['Available', 'Unavailable'] },
    { key: 'description',    label: 'Description',      placeholder: 'Describe the spa service…', multiline: true },
  ],
};

const UPLOAD_TYPES: Record<ServiceType, 'rooms' | 'tours' | 'foods' | 'packages' | 'spas'> = {
  Rooms: 'rooms',
  Tours: 'tours',
  Food: 'foods',
  Packages: 'packages',
  Spa: 'spas',
};

const getImageUri = (path?: string): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}/${path}`.replace(/([^:]\/\/)\/+/, '$1');
};

const collectionOf = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const idsFrom = (value: any): number[] => {
  if (!value) return [];
  const values = Array.isArray(value) ? value : String(value).split(',');
  return values
    .map((item: any) => {
      const raw = typeof item === 'object' ? item?.id : item;
      if (typeof raw === 'string') {
        const match = raw.match(/(\d+)$/);
        return Number(match ? match[1] : raw);
      }
      return Number(raw);
    })
    .filter(Number.isFinite);
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
    init.mainImage = passedItem ? String(passedItem?.mainImage ?? '') : '';
    return init;
  };

  const [form, setForm]             = useState<Record<string, string>>(buildInitial);
  const [saving, setSaving]         = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photo, setPhoto]           = useState<PhotoSelection | null>(null);
  const [dropdownKey, setDropdownKey] = useState<string | null>(null);
  const [packageOptions, setPackageOptions] = useState<Record<PackageBucket, PackageOption[]>>({
    roomIds: [], tourIds: [], foodIds: [],
  });
  const [packageSelected, setPackageSelected] = useState<Record<PackageBucket, number[]>>({
    roomIds: idsFrom(passedItem?.roomIds ?? passedItem?.rooms),
    tourIds: idsFrom(passedItem?.tourIds ?? passedItem?.tours),
    foodIds: idsFrom(passedItem?.foodIds ?? passedItem?.foods),
  });
  const [packageOptionsLoading, setPackageOptionsLoading] = useState(false);

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (type !== 'Packages') return;
    let alive = true;
    const loadPackageOptions = async () => {
      setPackageOptionsLoading(true);
      try {
        const [roomsRes, toursRes, foodsRes, packageRes] = await Promise.all([
          getRooms(token),
          getTours(token),
          getFoods(token),
          isEdit ? getPackage(id!, token).catch(() => null) : Promise.resolve(null),
        ]);
        if (!alive) return;
        if (packageRes) {
          setPackageSelected({
            roomIds: idsFrom(packageRes.roomIds ?? packageRes.rooms),
            tourIds: idsFrom(packageRes.tourIds ?? packageRes.tours),
            foodIds: idsFrom(packageRes.foodIds ?? packageRes.foods),
          });
        }
        setPackageOptions({
          roomIds: collectionOf(roomsRes).map((room: any) => ({
            id: Number(room.id),
            label: room.roomNumber ? `Room ${room.roomNumber}` : room.name || `Room ${room.id}`,
            sub: `${room.roomType ?? 'Room'} · ₱${room.pricePerNight ?? room.price ?? 0}/night`,
            price: Number(room.pricePerNight ?? room.price ?? 0),
          })),
          tourIds: collectionOf(toursRes).map((tour: any) => ({
            id: Number(tour.id),
            label: tour.name || `Tour ${tour.id}`,
            sub: `${tour.location ?? 'Tour'} · ${tour.duration ?? 'Schedule'} · ₱${tour.price ?? 0}`,
            price: Number(tour.price ?? 0),
          })),
          foodIds: collectionOf(foodsRes).map((food: any) => ({
            id: Number(food.id),
            label: food.name || `Food ${food.id}`,
            sub: `${food.category ?? 'Food'} · ₱${food.price ?? 0}`,
            price: Number(food.price ?? 0),
          })),
        });
      } catch (err) {
        console.error('[ServiceForm] package options', err);
      } finally {
        if (alive) setPackageOptionsLoading(false);
      }
    };
    loadPackageOptions();
    return () => { alive = false; };
  }, [type, token, isEdit, id]);

  const togglePackageItem = (bucket: PackageBucket, id: number) => {
    setPackageSelected(prev => {
      const selected = prev[bucket].includes(id)
        ? prev[bucket].filter(value => value !== id)
        : [...prev[bucket], id];
      return { ...prev, [bucket]: selected };
    });
  };

  const selectedPackageTotal = () =>
    (Object.keys(packageSelected) as PackageBucket[]).reduce((total, bucket) => {
      return total + packageOptions[bucket]
        .filter(option => packageSelected[bucket].includes(option.id))
        .reduce((sum, option) => sum + option.price, 0);
    }, 0);

  const autoPackagePrice = () => {
    const original = selectedPackageTotal();
    const discount = Math.min(100, Math.max(0, Number(form.discountPercentage || 0)));
    return Math.max(0, original - (original * discount / 100));
  };

  useEffect(() => {
    if (type !== 'Packages') return;
    const original = selectedPackageTotal();
    const price = autoPackagePrice();
    setForm(prev => ({
      ...prev,
      originalPrice: original > 0 ? original.toFixed(2) : (prev.originalPrice || ''),
      packagePrice: original > 0 ? price.toFixed(2) : (prev.packagePrice || ''),
    }));
  }, [type, packageSelected, packageOptions, form.discountPercentage]);

  const requestLegacyGalleryPermission = async () => {
    if (Platform.OS !== 'android' || Platform.Version >= 33) return true;
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, {
      title: 'Photo access needed',
      message: 'Allow Baroro to access photos so you can add a service image.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
        includeBase64: false,
      });

      if (result.didCancel) return;

      if (result.errorCode === 'permission') {
        const granted = await requestLegacyGalleryPermission();
        if (!granted) {
          Alert.alert('Permission denied', 'Please allow photo access in your device settings.');
          return;
        }

        const retry = await launchImageLibrary({
          mediaType: 'photo',
          quality: 0.8,
          selectionLimit: 1,
          includeBase64: false,
        });
        if (retry.didCancel) return;
        if (retry.errorCode) {
          Alert.alert('Gallery error', retry.errorMessage ?? 'Could not open gallery. Please try again.');
          return;
        }
        const retryAsset = retry.assets?.[0];
        if (!retryAsset?.uri) return;

        setPhoto({
          kind: 'gallery',
          uri: retryAsset.uri,
          fileName: retryAsset.fileName ?? `service_photo_${Date.now()}.jpg`,
          mimeType: retryAsset.type ?? 'image/jpeg',
        });
        return;
      }

      if (result.errorCode) {
        Alert.alert('Gallery error', result.errorMessage ?? 'Could not open gallery. Please try again.');
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setPhoto({
        kind: 'gallery',
        uri: asset.uri,
        fileName: asset.fileName ?? `service_photo_${Date.now()}.jpg`,
        mimeType: asset.type ?? 'image/jpeg',
      });
    } catch (err: any) {
      Alert.alert('Gallery error', err?.message ?? 'Could not open gallery. Please try again.');
    }
  };

  const buildPayload = () => {
    const p: Record<string, any> = {};
    FIELDS[type].forEach(f => {
      const v = form[f.key];
      if (v === '') return;
      if (f.key === 'scheduleDate' && !DATE_PATTERN.test(v)) return;
      p[f.key] = f.numeric ? Number(v) : v;
    });
    if (type === 'Rooms' && p.features)
      p.features = String(p.features).split(',').map((s: string) => s.trim());
    if (type === 'Packages') {
      const original = selectedPackageTotal();
      const price = autoPackagePrice();
      p.roomIds = packageSelected.roomIds;
      p.tourIds = packageSelected.tourIds;
      p.foodIds = packageSelected.foodIds;
      p.autoCalculatePrices = true;
      if (original > 0) {
        p.originalPrice = original;
        p.packagePrice = price;
      }
    }
    if (form.mainImage) p.mainImage = form.mainImage;
    return p;
  };

  const renderPackagePicker = () => {
    if (type !== 'Packages') return null;
    const groups: { key: PackageBucket; title: string; icon: string }[] = [
      { key: 'roomIds', title: 'Rooms', icon: 'bed' },
      { key: 'tourIds', title: 'Tours', icon: 'compass' },
      { key: 'foodIds', title: 'Food Items', icon: 'food-fork-drink' },
    ];
    const totalItems = packageSelected.roomIds.length + packageSelected.tourIds.length + packageSelected.foodIds.length;

    return (
      <View style={styles.packagePicker}>
        <View style={styles.packagePickerHeader}>
          <View>
            <Text style={styles.packagePickerTitle}>Included Services</Text>
            <Text style={styles.packagePickerSub}>
              {totalItems} selected · ₱{selectedPackageTotal().toLocaleString()} original · ₱{autoPackagePrice().toLocaleString()} package
            </Text>
          </View>
          {packageOptionsLoading ? <ActivityIndicator color={accentColor} /> : null}
        </View>
        {groups.map(group => (
          <View key={group.key} style={styles.packageGroup}>
            <View style={styles.packageGroupTitleRow}>
              <Icon name={group.icon} size={16} color={accentColor} />
              <Text style={styles.packageGroupTitle}>{group.title}</Text>
            </View>
            {packageOptions[group.key].length === 0 ? (
              <Text style={styles.packageEmptyText}>No available {group.title.toLowerCase()}</Text>
            ) : packageOptions[group.key].map(option => {
              const active = packageSelected[group.key].includes(option.id);
              return (
                <TouchableOpacity
                  key={`${group.key}-${option.id}`}
                  style={[styles.packageOption, active && { borderColor: accentColor, backgroundColor: accentColor + '12' }]}
                  activeOpacity={0.8}
                  onPress={() => togglePackageItem(group.key, option.id)}
                >
                  <Icon name={active ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={20} color={active ? accentColor : COLORS.textMuted} />
                  <View style={styles.packageOptionText}>
                    <Text style={styles.packageOptionLabel}>{option.label}</Text>
                    <Text style={styles.packageOptionSub}>{option.sub}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (photo?.kind === 'gallery') {
        setUploadingPhoto(true);
        const imageUri = await uploadServiceImage(photo.uri, token, UPLOAD_TYPES[type], photo.fileName, photo.mimeType);
        payload.mainImage = imageUri;
      }

      if (isEdit) {
        if (type === 'Rooms')    await updateRoom(id!, payload, token);
        if (type === 'Tours')    await updateTour(id!, payload, token);
        if (type === 'Food')     await updateFood(id!, payload, token);
        if (type === 'Packages') await updatePackage(id!, payload, token);
        if (type === 'Spa')      await updateSpa(id!, payload, token);
      } else {
        if (type === 'Rooms')    await createRoom(payload, token);
        if (type === 'Tours')    await createTour(payload, token);
        if (type === 'Food')     await createFood(payload, token);
        if (type === 'Packages') await createPackage(payload, token);
        if (type === 'Spa')      await createSpa(payload, token);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUploadingPhoto(false);
      setSaving(false);
    }
  };

  const previewUri = photo?.uri || getImageUri(form.mainImage);

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

        <View style={styles.photoSection}>
          <Text style={styles.label}>Service Photo</Text>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Icon name="image-outline" size={36} color={COLORS.border} />
              <Text style={styles.photoPlaceholderText}>No photo selected</Text>
            </View>
          )}

          <View style={styles.photoButtons}>
            <TouchableOpacity style={[styles.photoBtn, { borderColor: accentColor }]} onPress={pickFromGallery}>
              <Icon name="image-plus" size={18} color={accentColor} />
              <Text style={[styles.photoBtnText, { color: accentColor }]}>Choose Photo</Text>
            </TouchableOpacity>
            {previewUri ? (
              <TouchableOpacity style={[styles.photoBtn, styles.photoRemoveBtn]} onPress={() => { setPhoto(null); set('mainImage', ''); }}>
                <Icon name="trash-can-outline" size={18} color={COLORS.error} />
                <Text style={[styles.photoBtnText, { color: COLORS.error }]}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {renderPackagePicker()}

        {FIELDS[type].map(f => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            {f.options ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.input, styles.dropdownInput]}
                  onPress={() => setDropdownKey(dropdownKey === f.key ? null : f.key)}
                >
                  <Text style={[styles.inputText, !form[f.key] && styles.placeholderText]}>
                    {form[f.key] || f.placeholder}
                  </Text>
                  <Icon name={dropdownKey === f.key ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
                {dropdownKey === f.key && (
                  <View style={styles.dropdownList}>
                    {f.options.map(option => (
                      <TouchableOpacity
                        key={option}
                        style={styles.dropdownItem}
                        onPress={() => {
                          if (f.key === 'features') {
                            const existing = form.features ? form.features.split(',').map(v => v.trim()).filter(Boolean) : [];
                            const next = existing.includes(option)
                              ? existing
                              : [...existing, option];
                            set(f.key, next.join(', '));
                          } else {
                            set(f.key, option);
                          }
                          setDropdownKey(null);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TextInput
                  style={[styles.input, styles.customOptionInput, f.readOnly && styles.inputReadOnly]}
                  placeholder={f.key === 'features' ? 'Or type custom features separated by comma' : `Or type custom ${f.label.toLowerCase()}`}
                  placeholderTextColor={COLORS.textMuted}
                  value={form[f.key]}
                  onChangeText={v => set(f.key, v)}
                  keyboardType={f.numeric ? 'numeric' : 'default'}
                  multiline={f.multiline}
                  numberOfLines={f.multiline ? 4 : 1}
                  editable={!f.readOnly}
                />
              </>
            ) : (
              <TextInput
                style={[styles.input, f.multiline && styles.inputMulti, f.readOnly && styles.inputReadOnly]}
                placeholder={f.placeholder}
                placeholderTextColor={COLORS.textMuted}
                value={form[f.key]}
                onChangeText={v => set(f.key, v)}
                keyboardType={f.numeric ? 'numeric' : 'default'}
                multiline={f.multiline}
                numberOfLines={f.multiline ? 4 : 1}
                editable={!f.readOnly}
              />
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: accentColor }, (saving || uploadingPhoto) && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving || uploadingPhoto}
        >
          {saving || uploadingPhoto
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

  photoSection: { marginBottom: 20 },
  photoPlaceholder: {
    width: '100%', height: 200, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  photoPlaceholderText: { color: COLORS.textMuted, fontFamily: FONTS.body },
  photoPreview: { width: '100%', height: 200, borderRadius: RADIUS.md, marginBottom: 12, backgroundColor: COLORS.surfaceAlt },
  photoButtons: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 14,
  },
  photoRemoveBtn: { borderColor: COLORS.error },
  photoBtnText: { fontSize: 14, fontFamily: FONTS.bold },

  packagePicker: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 18,
    ...SHADOW.sm,
  },
  packagePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packagePickerTitle: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  packagePickerSub: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted, marginTop: 2 },
  packageGroup: { marginTop: 10 },
  packageGroupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  packageGroupTitle: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  packageEmptyText: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted, paddingVertical: 8 },
  packageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.3,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  packageOptionText: { flex: 1 },
  packageOptionLabel: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  packageOptionSub: { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted, marginTop: 2 },

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
  inputText: { fontSize: 14, color: COLORS.textDark, fontFamily: FONTS.body },
  placeholderText: { color: COLORS.textMuted },
  inputMulti: { height: 100, textAlignVertical: 'top' },
  inputReadOnly: { backgroundColor: COLORS.surfaceAlt, color: COLORS.textMuted },
  dropdownInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customOptionInput: { marginTop: 8 },
  dropdownList: {
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, marginTop: 4, overflow: 'hidden', ...SHADOW.sm,
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14 },
  dropdownItemText: { fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: RADIUS.md, marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONTS.bold },
});

export default ServiceFormScreen;
