// src/screens/HomeScreen.tsx
import React, { FC, useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar, Image, ActivityIndicator,
  ImageBackground, RefreshControl, Dimensions, Animated,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getTours, getRooms, getPackages, getReservations, getWallPosts,
} from '../app/api/api';
import { RootState } from '../store';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING, getStatusColor } from '../theme';
import ROUTES from '../utils';
import API_BASE_URL from '../config/api.config';
import { WallApiPost } from '../app/api/api';

const { width } = Dimensions.get('window');
const API_BASE  = API_BASE_URL;

const UPLOAD_DIR: Record<string, string> = {
  room: 'uploads/rooms', tour: 'uploads/tours', food: 'uploads/foods',
  package: 'uploads/packages', spa: 'uploads/spas',
};

const resolveImg = (path?: string | null, seed = 'item', type?: string): string => {
  if (!path) return `https://picsum.photos/seed/${seed}/600/400`;
  if (path.startsWith('http')) {
    return path.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, API_BASE);
  }
  if (path.startsWith('/')) return `${API_BASE}${path}`;
  if (path.startsWith('uploads/')) return `${API_BASE}/${path}`;
  if (type && UPLOAD_DIR[type]) return `${API_BASE}/${UPLOAD_DIR[type]}/${path}`;
  return `${API_BASE}/uploads/${path}`;
};

// ─── Service category tiles ───────────────────────────────────────────────────

const CATEGORIES = [
  { icon: 'bed',                   label: 'Rooms',    color: '#1565c0', tab: 'Rooms'    },
  { icon: 'map-marker-path',       label: 'Tours',    color: '#2e7d32', tab: 'Tours'    },
  { icon: 'spa',                   label: 'Spa',      color: '#ad1457', tab: 'Spa'      },
  { icon: 'silverware-fork-knife', label: 'Dining',   color: '#e65100', tab: 'Dining'   },
  { icon: 'gift',                  label: 'Packages', color: '#6a1b9a', tab: 'Packages' },
];

const CategoryRow: FC<{ onPress: (tab: string) => void }> = ({ onPress }) => (
  <View style={S.catRow}>
    {CATEGORIES.map(c => (
      <TouchableOpacity key={c.label} style={S.catItem} onPress={() => onPress(c.tab)} activeOpacity={0.75}>
        <View style={[S.catIcon, { backgroundColor: c.color + '16' }]}>
          <Icon name={c.icon} size={24} color={c.color} />
        </View>
        <Text style={S.catLabel}>{c.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHeader: FC<{ title: string; onSeeAll?: () => void }> = ({ title, onSeeAll }) => (
  <View style={S.secRow}>
    <Text style={S.secTitle}>{title}</Text>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={S.seeAll}>View All</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Featured room / tour card ────────────────────────────────────────────────

const FeaturedCard: FC<{ item: any; type: string; onPress: () => void }> = ({ item, type, onPress }) => {
  const price = type === 'room'
    ? `₱${Number(item.pricePerNight || item.price || 0).toLocaleString()}/night`
    : `₱${Number(item.price || 0).toLocaleString()}`;

  return (
    <TouchableOpacity style={FC_S.wrap} onPress={onPress} activeOpacity={0.88}>
      <ImageBackground
        source={{ uri: resolveImg(item.mainImage || item.image, `${type}${item.id}`, type) }}
        style={FC_S.image}
        imageStyle={{ borderRadius: RADIUS.lg }}
      >
        <View style={FC_S.overlay}>
          <View style={FC_S.typePill}>
            <Text style={FC_S.typePillText}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
          </View>
          <View style={FC_S.bottom}>
            <Text style={FC_S.name} numberOfLines={1}>{item.name || item.roomNumber}</Text>
            {item.location ? <Text style={FC_S.loc} numberOfLines={1}><Icon name="map-marker" size={11} color="rgba(255,255,255,0.85)" />  {item.location}</Text> : null}
            <Text style={FC_S.price}>{price}</Text>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const FC_S = StyleSheet.create({
  wrap:     { width: width * 0.68, marginRight: 14, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.md },
  image:    { width: '100%', height: 195 },
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', padding: 12, justifyContent: 'space-between' },
  typePill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  typePillText: { color: '#fff', fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700' },
  bottom:   { gap: 3 },
  name:     { color: '#fff', fontSize: 15, fontFamily: FONTS.display, fontWeight: '700' },
  loc:      { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: FONTS.body },
  price:    { color: '#fff', fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', marginTop: 2 },
});

// ─── Package card ─────────────────────────────────────────────────────────────

const PackageCard: FC<{ item: any; onPress: () => void }> = ({ item, onPress }) => (
  <TouchableOpacity style={PK_S.wrap} onPress={onPress} activeOpacity={0.88}>
    <Image source={{ uri: resolveImg(item.mainImage || item.image, `pkg${item.id}`, 'package') }} style={PK_S.image} />
    {item.discountPercentage ? (
      <View style={PK_S.badge}><Text style={PK_S.badgeText}>{item.discountPercentage}% OFF</Text></View>
    ) : null}
    <View style={PK_S.body}>
      <Text style={PK_S.name} numberOfLines={1}>{item.name}</Text>
      {item.packageType ? <Text style={PK_S.type}>{item.packageType}</Text> : null}
      <Text style={PK_S.price}>₱{Number(item.packagePrice || item.price || 0).toLocaleString()}</Text>
    </View>
  </TouchableOpacity>
);

const PK_S = StyleSheet.create({
  wrap:      { width: 170, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, marginRight: 12, overflow: 'hidden', ...SHADOW.sm },
  image:     { width: '100%', height: 105 },
  badge:     { position: 'absolute', top: 8, right: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontFamily: FONTS.bold, fontWeight: '700', color: '#fff' },
  body:      { padding: 10, gap: 2 },
  name:      { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  type:      { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body },
  price:     { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary, marginTop: 2 },
});

// ─── Booking pill ─────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { icon: string; color: string }> = {
  room:    { icon: 'bed',                   color: '#1565c0' },
  tour:    { icon: 'map-marker-path',       color: '#2e7d32' },
  package: { icon: 'gift',                  color: '#6a1b9a' },
  food:    { icon: 'silverware-fork-knife', color: '#e65100' },
  spa:     { icon: 'spa',                   color: '#ad1457' },
};

const BookingPill: FC<{ res: any; onPress: () => void }> = ({ res, onPress }) => {
  const type   = res.serviceType || 'room';
  const meta   = TYPE_META[type] ?? TYPE_META.room;
  const status = res.status || 'Pending';
  const name   = res.itemName || res.serviceName || res.item?.name || `#${res.id}`;
  return (
    <TouchableOpacity style={BP_S.wrap} onPress={onPress} activeOpacity={0.85}>
      <View style={[BP_S.icon, { backgroundColor: meta.color + '18' }]}>
        <Icon name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={BP_S.content}>
        <Text style={BP_S.name} numberOfLines={1}>{name}</Text>
        <Text style={[BP_S.status, { color: getStatusColor(status) }]}>{status}</Text>
      </View>
      <Icon name="chevron-right" size={16} color={COLORS.border} />
    </TouchableOpacity>
  );
};

const BP_S = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, ...SHADOW.sm, gap: 10 },
  icon:    { width: 38, height: 38, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 2 },
  name:    { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  status:  { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '600', textTransform: 'capitalize' },
});

// ─── Offer card ───────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  room:    { label: 'Room',    color: '#1565c0' },
  tour:    { label: 'Tour',   color: '#2e7d32' },
  package: { label: 'Package', color: '#6a1b9a' },
  spa:     { label: 'Spa',     color: '#ad1457' },
};

const OfferCard: FC<{ item: any; type: string; onPress: () => void }> = ({ item, type, onPress }) => {
  const badge   = TYPE_BADGE[type] ?? TYPE_BADGE.room;
  const price   = type === 'room'
    ? `₱${Number(item.pricePerNight || item.price || 0).toLocaleString()}/night`
    : `₱${Number(item.packagePrice || item.price || 0).toLocaleString()}`;
  const sub     = item.location || item.packageType || item.roomType || item.duration || null;

  return (
    <TouchableOpacity style={OC_S.wrap} onPress={onPress} activeOpacity={0.88}>
      <ImageBackground
        source={{ uri: resolveImg(item.mainImage || item.image, `${type}${item.id}`, type) }}
        style={OC_S.image}
        imageStyle={{ borderRadius: RADIUS.lg }}
      >
        <View style={OC_S.overlay}>
          <View style={[OC_S.typeBadge, { backgroundColor: badge.color }]}>
            <Text style={OC_S.typeBadgeText}>{badge.label}</Text>
          </View>
          {item.discountPercentage ? (
            <View style={OC_S.discountBadge}>
              <Text style={OC_S.discountText}>{item.discountPercentage}% OFF</Text>
            </View>
          ) : null}
          <View style={OC_S.bottom}>
            <Text style={OC_S.name} numberOfLines={1}>{item.name}</Text>
            {sub ? <Text style={OC_S.sub} numberOfLines={1}>{sub}</Text> : null}
            <Text style={OC_S.price}>{price}</Text>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const OC_S = StyleSheet.create({
  wrap:          { width: width * 0.68, marginRight: 14, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.md },
  image:         { width: '100%', height: 195 },
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', padding: 12, justifyContent: 'space-between' },
  typeBadge:     { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { color: '#fff', fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700' },
  discountBadge: { alignSelf: 'flex-start', backgroundColor: '#e65100', borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 3 },
  discountText:  { color: '#fff', fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700' },
  bottom:        { gap: 3 },
  name:          { color: '#fff', fontSize: 15, fontFamily: FONTS.display, fontWeight: '700' },
  sub:           { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: FONTS.body },
  price:         { color: '#fff', fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', marginTop: 2 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

const HomeScreen: FC = () => {
  const navigation      = useNavigation<NavigationProp<any>>();
  const { data, token } = useSelector((state: RootState) => state.auth);
  const unreadCount     = useSelector((state: RootState) =>
    state.notifications.items.filter(n => !n.read).length);

  const [wallPosts, setWallPosts] = useState<WallApiPost[]>([]);
  const bellAnim   = useRef(new Animated.Value(0)).current;

  // Swing bell when unread notifications exist
  useEffect(() => {
    if (unreadCount === 0) return;
    const swing = Animated.sequence([
      Animated.timing(bellAnim, { toValue:  1, duration: 120, useNativeDriver: true }),
      Animated.timing(bellAnim, { toValue: -1, duration: 120, useNativeDriver: true }),
      Animated.timing(bellAnim, { toValue:  1, duration: 120, useNativeDriver: true }),
      Animated.timing(bellAnim, { toValue: -1, duration: 120, useNativeDriver: true }),
      Animated.timing(bellAnim, { toValue:  0, duration: 120, useNativeDriver: true }),
    ]);
    const loop = Animated.loop(swing, { iterations: 1 });
    loop.start();
    const interval = setInterval(() => { loop.reset(); loop.start(); }, 4000);
    return () => { clearInterval(interval); loop.stop(); };
  }, [unreadCount, bellAnim]);

  const bellRotate = bellAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-20deg', '0deg', '20deg'],
  });

  const [tours,        setTours]        = useState<any[]>([]);
  const [rooms,        setRooms]        = useState<any[]>([]);
  const [packages,     setPackages]     = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [toursRes, roomsRes, pkgsRes, resRes, wallRes] = await Promise.all([
        getTours(token).catch(() => ({})),
        getRooms(token).catch(() => ({})),
        getPackages(token).catch(() => ({})),
        getReservations(token).catch(() => ({})),
        getWallPosts(6, 0, token).catch(() => ({ posts: [] })),
      ]);
      const pick = (r: any) => r?.['hydra:member'] ?? r?.data ?? [];
      setTours(pick(toursRes).slice(0, 5));
      setRooms(pick(roomsRes).slice(0, 5));
      setPackages(pick(pkgsRes).slice(0, 5));
      const r = resRes as any;
      setReservations((r?.['hydra:member'] ?? r?.data ?? []).slice(0, 4));
      setWallPosts(((wallRes as any).posts ?? []).slice(0, 6));
    } catch (e) {
      console.error('[HomeScreen]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const goBookings = () => navigation.navigate(ROUTES.BOOKINGS);
  const goDetail   = (item: any, type: string) =>
    navigation.navigate(ROUTES.SERVICE_DETAIL, { item, type });

  const name      = data?.fullName || data?.username || 'Guest';
  const firstName = name.split(' ')[0];
  const avatarUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=c24a16&color=ffffff&bold=true&size=64`;

  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* ── Branded header ──────────────────────────────────────────── */}
      <View style={S.header}>
        <View style={S.headerTop}>
          <View style={S.brandWrap}>
            <Text style={S.brandName}>La Casa Gaudencia</Text>
            <Text style={S.brandTagline}>A House of Joy, Warmth, and Memories</Text>
          </View>
          <View style={S.headerRight}>
            <TouchableOpacity
              style={S.iconBtn}
              onPress={() => navigation.navigate(ROUTES.NOTIFICATIONS)}
              activeOpacity={0.8}
            >
              <Animated.View style={{ transform: [{ rotate: bellRotate }] }}>
                <Icon name="bell-outline" size={22} color="#fff" />
              </Animated.View>
              {unreadCount > 0 && (
                <View style={S.bellBadge}>
                  <Text style={S.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.PROFILE)} activeOpacity={0.8}>
              <Image source={{ uri: avatarUri }} style={S.avatar} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={S.greeting}>{timeGreet}, <Text style={S.greetingName}>{firstName}!</Text></Text>
        <Text style={S.greetingSub}>Discover paradise in every stay.</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={S.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Categories ──────────────────────────────────────────────── */}
        <View style={S.section}>
          <CategoryRow onPress={(tab) => navigation.navigate(ROUTES.EXPLORE, { screen: 'ExploreMain', params: { initialTab: tab } })} />
        </View>

        {/* ── New Offers ───────────────────────────────────────────────── */}
        <View style={S.section}>
          <SectionHeader
            title="New Offers"
            onSeeAll={() => navigation.navigate(ROUTES.EXPLORE, { screen: 'ExploreMain', params: { initialTab: 'Packages' } })}
          />
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={S.loader} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.hScroll}>
              {[
                ...packages.map((i: any) => ({ item: i, type: 'package' })),
                ...rooms.map((i: any) => ({ item: i, type: 'room' })),
                ...tours.map((i: any) => ({ item: i, type: 'tour' })),
              ].slice(0, 6).map(({ item, type }) => (
                <OfferCard
                  key={`${type}-${item.id}`}
                  item={item}
                  type={type}
                  onPress={() => goDetail(item, type)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Active bookings ──────────────────────────────────────────── */}
        {reservations.length > 0 && (
          <View style={S.section}>
            <SectionHeader title="My Bookings" onSeeAll={goBookings} />
            {reservations.map(r => (
              <BookingPill key={r.id} res={r} onPress={goBookings} />
            ))}
          </View>
        )}

        {/* ── Featured rooms ────────────────────────────────────────────── */}
        <View style={S.section}>
          <SectionHeader title="Featured Rooms" onSeeAll={() => navigation.navigate(ROUTES.EXPLORE, { screen: 'ExploreMain', params: { initialTab: 'Rooms' } })} />
          {loading
            ? <ActivityIndicator color={COLORS.primary} style={S.loader} />
            : rooms.length === 0
            ? <Text style={S.empty}>No rooms available</Text>
            : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.hScroll}>
                {rooms.map(r => (
                  <FeaturedCard key={r.id} item={r} type="room" onPress={() => goDetail(r, 'room')} />
                ))}
              </ScrollView>
            )
          }
        </View>

        {/* ── Tours & activities ────────────────────────────────────────── */}
        <View style={S.section}>
          <SectionHeader title="Tours & Activities" onSeeAll={() => navigation.navigate(ROUTES.EXPLORE, { screen: 'ExploreMain', params: { initialTab: 'Tours' } })} />
          {loading
            ? <ActivityIndicator color={COLORS.primary} style={S.loader} />
            : tours.length === 0
            ? <Text style={S.empty}>No tours available</Text>
            : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.hScroll}>
                {tours.map(t => (
                  <FeaturedCard key={t.id} item={t} type="tour" onPress={() => goDetail(t, 'tour')} />
                ))}
              </ScrollView>
            )
          }
        </View>

        {/* ── Packages & promos ─────────────────────────────────────────── */}
        {!loading && packages.length > 0 && (
          <View style={S.section}>
            <SectionHeader title="Packages & Promos" onSeeAll={() => navigation.navigate(ROUTES.EXPLORE, { screen: 'ExploreMain', params: { initialTab: 'Packages' } })} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.hScroll}>
              {packages.map(p => (
                <PackageCard key={p.id} item={p} onPress={() => goDetail(p, 'package')} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Community Moments ────────────────────────────────────────────── */}
        <View style={S.section}>
          <SectionHeader
            title="Community Moments"
            onSeeAll={() => navigation.navigate(ROUTES.SHARE_WALL)}
          />
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={S.loader} />
          ) : wallPosts.length === 0 ? (
            <TouchableOpacity
              style={CM_S.emptyBanner}
              onPress={() => navigation.navigate(ROUTES.SHARE_WALL)}
              activeOpacity={0.85}
            >
              <Icon name="image-multiple-outline" size={32} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={CM_S.emptyTitle}>Share Wall</Text>
                <Text style={CM_S.emptySub}>Be the first to share a travel memory with our community!</Text>
              </View>
              <Icon name="arrow-right" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.hScroll}>
              {wallPosts.map((post: WallApiPost) => (
                <TouchableOpacity
                  key={post.id}
                  style={CM_S.card}
                  onPress={() => navigation.navigate(ROUTES.SHARE_WALL)}
                  activeOpacity={0.88}
                >
                  {post.imageUri ? (
                    <Image source={{ uri: post.imageUri }} style={CM_S.image} resizeMode="cover" />
                  ) : (
                    <View style={CM_S.imagePlaceholder}>
                      <Icon name="image-outline" size={32} color={COLORS.border} />
                    </View>
                  )}
                  <View style={CM_S.body}>
                    <Text style={CM_S.author} numberOfLines={1}>{post.authorName}</Text>
                    <Text style={CM_S.caption} numberOfLines={2}>{post.caption}</Text>
                    <View style={CM_S.meta}>
                      <Icon name="heart" size={12} color="#e53935" />
                      <Text style={CM_S.metaText}>{post.likedBy.length}</Text>
                      <Icon name="comment-outline" size={12} color={COLORS.textMuted} style={{ marginLeft: 6 }} />
                      <Text style={CM_S.metaText}>{post.comments.length}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Contact CTA ───────────────────────────────────────────────── */}
        <View style={S.section}>
          <TouchableOpacity
            style={S.ctaBanner}
            onPress={() => navigation.navigate(ROUTES.MESSAGES)}
            activeOpacity={0.88}
          >
            <Icon name="chat-question-outline" size={28} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={S.ctaTitle}>Questions? We're here to help.</Text>
              <Text style={S.ctaSub}>Send us a message anytime.</Text>
            </View>
            <Icon name="arrow-right" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOW.brand,
  },
  headerTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  brandWrap:  {},
  brandName:  { color: '#fff', fontSize: 24, fontFamily: FONTS.display, fontWeight: '700', letterSpacing: 2 },
  brandTagline: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: FONTS.body, letterSpacing: 1, marginTop: 1 },
  headerRight:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  bellBadge:  { position: 'absolute', top: 4, right: 4, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: COLORS.primary },
  bellBadgeText: { fontSize: 8, fontFamily: FONTS.bold, fontWeight: '700', color: '#fff' },
  avatar:     { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  greeting:   { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontFamily: FONTS.body },
  greetingName: { color: '#fff', fontFamily: FONTS.bold, fontWeight: '700' },
  greetingSub:{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: FONTS.body, marginTop: 3, fontStyle: 'italic' },

  // Layout
  scroll:   { paddingBottom: 110, paddingTop: SPACING.lg },
  section:  { marginBottom: SPACING.lg, paddingHorizontal: SPACING.md },
  hScroll:  { marginLeft: -SPACING.md, paddingLeft: SPACING.md },
  loader:   { marginVertical: 24 },
  empty:    { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.body, textAlign: 'center', paddingVertical: 20 },

  // Section header
  secRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  secTitle: { fontSize: 18, fontFamily: FONTS.display, fontWeight: '700', color: COLORS.textDark },
  seeAll:   { fontSize: 13, color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '600' },

  // Categories
  catRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  catItem:  { alignItems: 'center', gap: 6 },
  catIcon:  { width: 54, height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '600', color: COLORS.textDark },

  // Contact CTA banner
  ctaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
    padding: 18, ...SHADOW.brand,
  },
  ctaTitle: { color: '#fff', fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700', marginBottom: 2 },
  ctaSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: FONTS.body },
});

const CM_S = StyleSheet.create({
  card: {
    width: 190, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, marginRight: 12, overflow: 'hidden', ...SHADOW.sm,
  },
  image:            { width: '100%', height: 115 },
  imagePlaceholder: { width: '100%', height: 115, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  body:             { padding: 10, gap: 4 },
  author:           { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  caption:          { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textDark, lineHeight: 17 },
  meta:             { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaText:         { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted },

  emptyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.lg, padding: 16,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  emptyTitle: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  emptySub:   { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted, lineHeight: 17 },
});

export default HomeScreen;