// src/screens/ServiceDetailScreen.tsx
import React, { FC, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, Dimensions, Image,
  ActivityIndicator, FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';
import { getPackage, getItemReviews } from '../app/api/api';
import { RootState } from '../store';
import ROUTES from '../utils';

const { width, height } = Dimensions.get('window');
const API_BASE = 'http://192.168.254.138:8000';

type ServiceType = 'room' | 'tour' | 'package' | 'food' | 'spa';

const resolveImage = (path?: string, seed = 'item'): string => {
  if (!path) return `https://picsum.photos/seed/${seed}/800/500`;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
};

const formatPrice = (price?: string | number): string => {
  if (!price) return '—';
  return `₱${Number(price).toLocaleString()}`;
};

// ─── Chip ─────────────────────────────────────────────────────────────────────

const Chip: FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <View style={styles.chip}>
    <Icon name={icon} size={13} color={COLORS.primary} />
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

// ─── Detail row ───────────────────────────────────────────────────────────────

const DetailRow: FC<{ label: string; value: string; last?: boolean }> = ({ label, value, last }) => (
  <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// ─── Gallery strip ────────────────────────────────────────────────────────────

const Gallery: FC<{ images: string[]; selected: number; onSelect: (i: number) => void }> = ({ images, selected, onSelect }) => {
  if (images.length <= 1) return null;
  return (
    <View style={gallery.wrap}>
      {/* count badge */}
      <View style={gallery.countBadge}>
        <Icon name="image-multiple-outline" size={12} color="#fff" />
        <Text style={gallery.countText}>{images.length}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={gallery.row}>
        {images.map((uri, i) => (
          <TouchableOpacity key={i} onPress={() => onSelect(i)} activeOpacity={0.85}>
            <Image
              source={{ uri }}
              style={[gallery.thumb, i === selected && gallery.thumbActive]}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const gallery = StyleSheet.create({
  wrap:       { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.35)' },
  row:        { paddingHorizontal: 14, gap: 8 },
  thumb:      { width: 52, height: 40, borderRadius: 6, borderWidth: 2, borderColor: 'transparent', opacity: 0.7 },
  thumbActive:{ borderColor: '#fff', opacity: 1 },
  countBadge: { position: 'absolute', top: -30, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 4 },
  countText:  { color: '#fff', fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700' },
});

// ─── Star rating ──────────────────────────────────────────────────────────────

const Stars: FC<{ rating: number; size?: number; interactive?: boolean; onRate?: (n: number) => void }> = ({ rating, size = 16, interactive, onRate }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <TouchableOpacity key={n} disabled={!interactive} onPress={() => onRate?.(n)} activeOpacity={0.7}>
        <Icon
          name={n <= rating ? 'star' : 'star-outline'}
          size={size}
          color={n <= rating ? '#f59e0b' : COLORS.border}
        />
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Review card ──────────────────────────────────────────────────────────────

const ReviewCard: FC<{ review: any }> = ({ review }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <View style={styles.reviewAvatar}>
        <Text style={styles.reviewAvatarText}>
          {(review.reviewer?.username ?? review.reviewer?.fullName ?? 'G')[0].toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.reviewName}>
          {review.reviewer?.fullName ?? review.reviewer?.username ?? 'Guest'}
        </Text>
        <Stars rating={review.rating ?? 0} size={13} />
      </View>
      <Text style={styles.reviewDate}>
        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}
      </Text>
    </View>
    {review.comment ? <Text style={styles.reviewText}>{review.comment}</Text> : null}
  </View>
);

// ─── Package include card ─────────────────────────────────────────────────────

const IncludeCard: FC<{ item: any; type: 'room' | 'tour' | 'food' }> = ({ item, type }) => {
  const icon  = type === 'room' ? 'bed' : type === 'tour' ? 'map-marker-path' : 'silverware-fork-knife';
  const color = type === 'room' ? '#1565c0' : type === 'tour' ? '#2e7d32' : '#e65100';
  return (
    <View style={styles.includeCard}>
      <Image source={{ uri: resolveImage(item.mainImage, `${type}${item.id}`) }} style={styles.includeImage} />
      <View style={[styles.includeTypePill, { backgroundColor: color }]}>
        <Icon name={icon} size={8} color="#fff" />
        <Text style={styles.includeTypeText}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
      </View>
      <View style={styles.includeBody}>
        <Text style={styles.includeName} numberOfLines={1}>{item.name || item.roomNumber}</Text>
        <Text style={styles.includePrice}>{formatPrice(type === 'room' ? item.pricePerNight : item.price)}</Text>
      </View>
    </View>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const ServiceDetailScreen: FC = () => {
  const navigation = useNavigation<any>();
  const route      = useRoute<RouteProp<any>>();
  const { token }  = useSelector((state: RootState) => state.auth);
  const { item, type } = route.params as { item: any; type: ServiceType };

  const [pkgDetail,   setPkgDetail]   = useState<any>(null);
  const [pkgLoading,  setPkgLoading]  = useState(false);
  const [reviews,     setReviews]     = useState<any[]>([]);
  const [revLoading,  setRevLoading]  = useState(false);
  const [selImg,      setSelImg]      = useState(0);

  // Fetch package details
  useEffect(() => {
    if (type === 'package' && item?.id) {
      setPkgLoading(true);
      getPackage(item.id, token).then(setPkgDetail).catch(() => {}).finally(() => setPkgLoading(false));
    }
  }, [type, item?.id, token]);

  // Fetch reviews
  useEffect(() => {
    if (!item?.id) return;
    setRevLoading(true);
    getItemReviews(type, item.id, token)
      .then(res => setReviews(res?.['hydra:member'] ?? res?.data ?? (Array.isArray(res) ? res : [])))
      .catch(() => setReviews([]))
      .finally(() => setRevLoading(false));
  }, [type, item?.id, token]);

  const detail    = type === 'package' ? (pkgDetail ?? item) : item;
  const isBookable= type === 'room' || type === 'tour' || type === 'package' || type === 'spa';

  const price = type === 'room'    ? (detail?.pricePerNight || detail?.price)
              : type === 'package' ? (detail?.packagePrice  || detail?.price)
              : detail?.price;
  const priceLabel = type === 'room' ? '/night' : type === 'tour' ? '/pax' : type === 'spa' ? '/session' : '';

  // Build image list
  const imageList: string[] = (() => {
    const raw: string[] = detail?.images ?? detail?.gallery ?? [];
    const main = detail?.image || detail?.mainImage;
    const all  = main ? [main, ...raw.filter((u: string) => u !== main)] : raw;
    return all.length ? all.map(u => resolveImage(u, `${type}${item?.id}`)) : [resolveImage(main, `${type}${item?.id}`)];
  })();

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length
    : 0;

  const handleBookNow = () => {
    const parent = navigation.getParent();
    if (parent) parent.navigate(ROUTES.BOOKINGS, { preselect: { item, type } });
    else        navigation.navigate(ROUTES.BOOKINGS, { preselect: { item, type } });
  };

  // ── Chips ──────────────────────────────────────────────────────────────────

  const renderChips = () => {
    if (type === 'room') return (
      <>
        {detail?.capacity   && <Chip icon="account-group"   label={`${detail.capacity} guests`} />}
        {detail?.roomType   && <Chip icon="bed"             label={detail.roomType} />}
        {detail?.roomNumber && <Chip icon="door"            label={`Room ${detail.roomNumber}`} />}
        {detail?.status     && <Chip icon="check-circle"    label={detail.status} />}
      </>
    );
    if (type === 'tour') return (
      <>
        {detail?.duration       && <Chip icon="clock-outline"   label={detail.duration} />}
        {detail?.location       && <Chip icon="map-marker"      label={detail.location} />}
        {detail?.availableSlots != null && <Chip icon="calendar-check" label={`${detail.availableSlots} slots`} />}
      </>
    );
    if (type === 'package') return (
      <>
        {detail?.packageType        && <Chip icon="tag"            label={detail.packageType} />}
        {detail?.durationDays       && <Chip icon="calendar-range" label={`${detail.durationDays} days`} />}
        {detail?.discountPercentage && <Chip icon="sale"           label={`${detail.discountPercentage}% OFF`} />}
        {detail?.maxGuests          && <Chip icon="account-group"  label={`Up to ${detail.maxGuests} guests`} />}
      </>
    );
    if (type === 'food') return (
      <>
        {detail?.category           && <Chip icon="silverware-fork-knife" label={detail.category} />}
        {detail?.availableStock != null && <Chip icon="package-variant"   label={`${detail.availableStock} left`} />}
      </>
    );
    if (type === 'spa') return (
      <>
        {detail?.duration  && <Chip icon="clock-outline"  label={detail.duration} />}
        {detail?.category  && <Chip icon="spa"            label={detail.category} />}
        {detail?.capacity != null && <Chip icon="account-group" label={`${detail.capacity} pax`} />}
      </>
    );
    return null;
  };

  // ── Detail rows ────────────────────────────────────────────────────────────

  const detailRows = (): { label: string; value: string }[] => {
    const rows: { label: string; value: string }[] = [];
    if (type === 'room') {
      if (detail?.roomType)   rows.push({ label: 'Room Type',   value: detail.roomType });
      if (detail?.roomNumber) rows.push({ label: 'Room No.',    value: String(detail.roomNumber) });
      if (detail?.capacity)   rows.push({ label: 'Capacity',    value: `${detail.capacity} guests` });
      if (price)              rows.push({ label: 'Price/Night', value: formatPrice(price) });
    } else if (type === 'tour') {
      if (detail?.location)       rows.push({ label: 'Location',    value: detail.location });
      if (detail?.duration)       rows.push({ label: 'Duration',    value: detail.duration });
      if (detail?.availableSlots != null) rows.push({ label: 'Slots Left', value: String(detail.availableSlots) });
      if (price)                  rows.push({ label: 'Price/Pax',   value: formatPrice(price) });
    } else if (type === 'package') {
      if (detail?.packageType)        rows.push({ label: 'Type',        value: detail.packageType });
      if (detail?.durationDays)       rows.push({ label: 'Duration',    value: `${detail.durationDays} days` });
      if (detail?.maxGuests)          rows.push({ label: 'Max Guests',  value: `${detail.maxGuests} pax` });
      if (detail?.discountPercentage) rows.push({ label: 'Discount',    value: `${detail.discountPercentage}%` });
      if (price)                      rows.push({ label: 'Total Price', value: formatPrice(price) });
    } else if (type === 'food') {
      if (detail?.category)           rows.push({ label: 'Category', value: detail.category });
      if (detail?.availableStock != null) rows.push({ label: 'Stock',    value: String(detail.availableStock) });
      if (price)                      rows.push({ label: 'Price',    value: formatPrice(price) });
    } else if (type === 'spa') {
      if (detail?.category)  rows.push({ label: 'Category', value: detail.category });
      if (detail?.duration)  rows.push({ label: 'Duration', value: detail.duration });
      if (detail?.capacity != null) rows.push({ label: 'Capacity', value: `${detail.capacity} pax` });
      if (price)             rows.push({ label: 'Price',    value: formatPrice(price) });
    }
    return rows;
  };

  const rows             = detailRows();
  const includedTours    = detail?.tours  ?? [];
  const includedRooms    = detail?.rooms  ?? [];
  const includedFoods    = detail?.foods  ?? [];
  const hasIncludes      = type === 'package' && (includedTours.length + includedRooms.length + includedFoods.length > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero + Gallery ──────────────────────────────────────────── */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: imageList[selImg] }} style={styles.heroImg} resizeMode="cover" />
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Gallery images={imageList} selected={selImg} onSelect={setSelImg} />
        </View>

        {/* ── Content card ────────────────────────────────────────────── */}
        <View style={styles.contentCard}>

          {/* Name + Price */}
          <View style={styles.titleRow}>
            <Text style={styles.name}>{detail?.name || detail?.roomNumber || '—'}</Text>
            <View style={styles.priceBox}>
              <Text style={styles.price}>{formatPrice(price)}</Text>
              {priceLabel ? <Text style={styles.priceLabel}>{priceLabel}</Text> : null}
            </View>
          </View>

          {/* Rating summary */}
          {reviews.length > 0 && (
            <View style={styles.ratingSummary}>
              <Stars rating={Math.round(avgRating)} size={15} />
              <Text style={styles.ratingAvg}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</Text>
            </View>
          )}

          {/* Chips */}
          <View style={styles.chips}>{renderChips()}</View>

          {/* About */}
          {detail?.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{detail.description}</Text>
            </View>
          ) : null}

          {/* Details */}
          {rows.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailCard}>
                {rows.map((r, i) => (
                  <DetailRow key={r.label} label={r.label} value={r.value} last={i === rows.length - 1} />
                ))}
              </View>
            </View>
          )}

          {/* Package includes */}
          {type === 'package' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's Included</Text>
              {pkgLoading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
              ) : !hasIncludes ? (
                <View style={styles.noIncludes}>
                  <Icon name="information-outline" size={20} color={COLORS.textMuted} />
                  <Text style={styles.noIncludesText}>Contact us for full package details</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACING.md }}>
                  <View style={styles.includesRow}>
                    {includedRooms.map((r: any) => <IncludeCard key={`room-${r.id}`} item={r} type="room" />)}
                    {includedTours.map((t: any) => <IncludeCard key={`tour-${t.id}`} item={t} type="tour" />)}
                    {includedFoods.map((f: any) => <IncludeCard key={`food-${f.id}`} item={f} type="food" />)}
                  </View>
                </ScrollView>
              )}
            </View>
          )}

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>
                Reviews {reviews.length > 0 ? `(${reviews.length})` : ''}
              </Text>
              {reviews.length > 0 && (
                <View style={styles.avgRow}>
                  <Stars rating={Math.round(avgRating)} size={14} />
                  <Text style={styles.avgNum}>{avgRating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            {revLoading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />
            ) : reviews.length === 0 ? (
              <View style={styles.noReviews}>
                <Icon name="star-outline" size={32} color={COLORS.border} />
                <Text style={styles.noReviewsTitle}>No reviews yet</Text>
                <Text style={styles.noReviewsSub}>Be the first to share your experience.</Text>
              </View>
            ) : (
              reviews.map((r, i) => <ReviewCard key={i} review={r} />)
            )}
          </View>

        </View>
      </ScrollView>

      {/* Book Now Footer */}
      {isBookable && (
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>Starting from</Text>
            <Text style={styles.footerPrice}>
              {formatPrice(price)}<Text style={styles.footerPriceLabel}>{priceLabel}</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={handleBookNow} activeOpacity={0.85}>
            <Icon name="calendar-plus" size={17} color="#fff" />
            <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll:    { paddingBottom: 160 },

  heroWrap:    { width, height: height * 0.42, position: 'relative' },
  heroImg:     { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center', alignItems: 'center',
  },

  contentCard: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.lg,
  },

  titleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  name:       { flex: 1, fontSize: 22, fontFamily: FONTS.display, fontWeight: '700', color: COLORS.textDark, paddingRight: SPACING.sm },
  priceBox:   { alignItems: 'flex-end' },
  price:      { fontSize: 22, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  priceLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, textAlign: 'right' },

  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md },
  ratingAvg:     { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  ratingCount:   { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  chip:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primaryFaded, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '600', color: COLORS.primary },

  section:      { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  description:  { fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark, lineHeight: 22 },

  detailCard:      { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, ...SHADOW.sm },
  detailRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel:     { fontSize: 14, fontFamily: FONTS.body, color: COLORS.textMuted },
  detailValue:     { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '600', color: COLORS.textDark },

  // Package includes
  noIncludes:      { flexDirection: 'row', alignItems: 'center', gap: 8, padding: SPACING.md, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md },
  noIncludesText:  { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.body },
  includesRow:     { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  includeCard:     { width: 150, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.sm },
  includeImage:    { width: '100%', height: 90 },
  includeTypePill: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  includeTypeText: { fontSize: 8, fontWeight: '700', fontFamily: FONTS.bold, color: '#fff' },
  includeBody:     { padding: 8 },
  includeName:     { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  includePrice:    { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },

  // Reviews
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  avgRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avgNum:        { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  reviewCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 10, ...SHADOW.sm,
  },
  reviewHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryFaded, justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  reviewName:       { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 3 },
  reviewDate:       { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted },
  reviewText:       { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textDark, lineHeight: 20 },
  noReviews:        { alignItems: 'center', paddingVertical: 24, gap: 6 },
  noReviewsTitle:   { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  noReviewsSub:     { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 90 : 74,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    ...SHADOW.md,
  },
  footerLabel:     { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body },
  footerPrice:     { fontSize: 20, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  footerPriceLabel:{ fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted },
  bookBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: 14, borderRadius: RADIUS.full, ...SHADOW.brand },
  bookBtnText: { color: '#fff', fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
});

export default ServiceDetailScreen;