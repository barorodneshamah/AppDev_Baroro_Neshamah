// src/screens/auth/LandingScreen.tsx
import React, { FC, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Platform, StatusBar,
  Dimensions, Animated, ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getFeaturedWallPosts, WallApiPost } from '../../app/api/api';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../theme';
import ROUTES from '../../utils';
import API_BASE_URL from '../../config/api.config';

const resolveWallImage = (uri?: string): string | undefined => {
  if (!uri) return undefined;
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, API_BASE_URL);
  }
  if (uri.startsWith('/')) return `${API_BASE_URL}${uri}`;
  return uri;
};

const { width, height } = Dimensions.get('window');

const HERO_IMAGE = require('../../../images/ground.jpeg');

const STATS = [
  { icon: 'bed',              value: '20+',  label: 'Rooms' },
  { icon: 'map-marker-path',  value: '15+',  label: 'Tours' },
  { icon: 'account-group',    value: '500+', label: 'Happy Guests' },
  { icon: 'star',             value: '4.9',  label: 'Rating' },
];

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const avatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=c24a16&color=ffffff&bold=true&size=64`;

// ─── Review card ──────────────────────────────────────────────────────────────

const ReviewCard: FC<{ post: WallApiPost }> = ({ post }) => (
  <View style={styles.reviewCard}>
    {post.imageUri ? (
      <Image source={{ uri: resolveWallImage(post.imageUri) }} style={styles.reviewImage} resizeMode="cover" />
    ) : (
      <View style={styles.reviewImagePlaceholder}>
        <Icon name="image-outline" size={28} color={COLORS.border} />
      </View>
    )}
    <View style={styles.reviewBody}>
      <View style={styles.reviewAuthorRow}>
        <Image source={{ uri: avatarUrl(post.authorName) }} style={styles.reviewAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewAuthor} numberOfLines={1}>{post.authorName}</Text>
          <Text style={styles.reviewTime}>{timeAgo(post.createdAt)}</Text>
        </View>
        <View style={styles.reviewLikes}>
          <Icon name="heart" size={12} color="#e53935" />
          <Text style={styles.reviewLikesText}>{post.likedBy.length}</Text>
        </View>
      </View>
      <Text style={styles.reviewCaption} numberOfLines={3}>{post.caption}</Text>
      {post.serviceTag ? (
        <View style={styles.reviewTag}>
          <Icon name="tag-outline" size={11} color={COLORS.primary} />
          <Text style={styles.reviewTagText}>{post.serviceTag}</Text>
        </View>
      ) : null}
    </View>
  </View>
);

// ─── Landing screen ───────────────────────────────────────────────────────────

const LandingScreen: FC = () => {
  const navigation = useNavigation<any>();
  const [posts,   setPosts]   = useState<WallApiPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    getFeaturedWallPosts(6)
      .then(res => setPosts((res.posts ?? []).slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        bounces={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <ImageBackground source={HERO_IMAGE} style={styles.hero} resizeMode="cover">
          <View style={styles.heroOverlay}>
            <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.logoBadge}>
                <Icon name="home-heart" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.heroTitle}>La Casa{'\n'}Gaudencia</Text>
              <Text style={styles.heroTagline}>A House of Joy, Warmth, and Memories</Text>

              {/* Stats row */}
              <View style={styles.statsRow}>
                {STATS.map(s => (
                  <View key={s.label} style={styles.statItem}>
                    <Icon name={s.icon} size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          </View>
        </ImageBackground>

        {/* ── Features strip ───────────────────────────────────────────── */}
        <View style={styles.featuresStrip}>
          {[
            { icon: 'bed-queen-outline',     label: 'Luxury Rooms'  },
            { icon: 'waves',                 label: 'Ocean Views'   },
            { icon: 'silverware-fork-knife', label: 'Fine Dining'   },
            { icon: 'spa',                   label: 'Wellness Spa'  },
          ].map(f => (
            <View key={f.label} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Icon name={f.icon} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Community Reviews ─────────────────────────────────────────── */}
        <View style={styles.reviewsSection}>
          <View style={styles.sectionHeader}>
            <Icon name="star-circle" size={20} color={COLORS.primary} />
            <View>
              <Text style={styles.sectionTitle}>What Our Guests Say</Text>
              <Text style={styles.sectionSub}>Real stories from real travelers</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading reviews…</Text>
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.noReviewsWrap}>
              <Icon name="comment-outline" size={40} color={COLORS.border} />
              <Text style={styles.noReviewsText}>Be the first to share your experience!</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reviewsScroll}
            >
              {posts.map(post => <ReviewCard key={post.id} post={post} />)}
            </ScrollView>
          )}
        </View>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to experience paradise?</Text>
          <Text style={styles.ctaSub}>Join thousands of happy guests at La Casa Gaudencia</Text>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate(ROUTES.REGISTER)}
            activeOpacity={0.88}
          >
            <Icon name="account-plus" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>Create Free Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
            activeOpacity={0.88}
          >
            <Icon name="login" size={18} color={COLORS.primary} />
            <Text style={styles.btnSecondaryText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll:    { flexGrow: 1 },

  // Hero
  hero:        { width, height: height * 0.55 },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
  },
  heroContent: { gap: 10 },
  logoBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
    ...SHADOW.sm,
  },
  heroTitle: {
    color: '#fff', fontSize: 36,
    fontFamily: FONTS.display, fontWeight: '800',
    lineHeight: 42, letterSpacing: 1,
  },
  heroTagline: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13, fontFamily: FONTS.body, lineHeight: 18,
  },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 10 },
  statItem: { alignItems: 'center', gap: 2 },
  statValue:{ color: '#fff', fontSize: 15, fontFamily: FONTS.bold, fontWeight: '800' },
  statLabel:{ color: 'rgba(255,255,255,0.72)', fontSize: 10, fontFamily: FONTS.body },

  // Features strip
  featuresStrip: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  featureItem: { flex: 1, alignItems: 'center', gap: 6 },
  featureIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center', alignItems: 'center',
  },
  featureLabel: { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, textAlign: 'center' },

  // Reviews section
  reviewsSection: { padding: SPACING.lg, paddingBottom: SPACING.md },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.md },
  sectionTitle:   { fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  sectionSub:     { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted },

  loadingWrap:    { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText:    { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted },
  noReviewsWrap:  { alignItems: 'center', paddingVertical: 32, gap: 10 },
  noReviewsText:  { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted, textAlign: 'center' },

  reviewsScroll: { gap: 12, paddingBottom: 4, paddingRight: SPACING.lg },

  // Review card
  reviewCard: {
    width: width * 0.72,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  reviewImage:           { width: '100%', height: 130 },
  reviewImagePlaceholder:{ width: '100%', height: 130, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  reviewBody:       { padding: 12 },
  reviewAuthorRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  reviewAvatar:     { width: 32, height: 32, borderRadius: 16 },
  reviewAuthor:     { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  reviewTime:       { fontSize: 10, fontFamily: FONTS.body, color: COLORS.textMuted },
  reviewLikes:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reviewLikesText:  { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted },
  reviewCaption:    { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textDark, lineHeight: 18, marginBottom: 8 },
  reviewTag:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewTagText:    { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary, textTransform: 'capitalize' },

  // CTA section
  ctaSection: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
    gap: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
  },
  ctaTitle: { fontSize: 18, fontFamily: FONTS.display, fontWeight: '700', color: COLORS.textDark, textAlign: 'center' },
  ctaSub:   { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 4 },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: 17, width: '100%', ...SHADOW.brand,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },

  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'transparent', borderRadius: RADIUS.full,
    paddingVertical: 15, width: '100%',
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  btnSecondaryText: { color: COLORS.primary, fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
});

export default LandingScreen;
