// src/screens/ShareWallScreen.tsx
import React, { FC, useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  StatusBar, Image, Animated, ScrollView, Alert,
  ActivityIndicator, RefreshControl, PermissionsAndroid,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../store';
import {
  WallApiPost, WallApiComment,
  getWallPosts, createWallPost, uploadWallImage, toggleWallLike, addWallComment, deleteWallPost, pinWallPost,
} from '../app/api/api';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';
import ROUTES from '../utils';
import API_BASE_URL from '../config/api.config';

const resolveWallImage = (uri?: string): string | undefined => {
  if (!uri) return undefined;
  if (uri.startsWith('content://')) return undefined;
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    // Re-route any IP or localhost URL to the current API server so images
    // load even if the server IP changed since the post was created.
    // External CDN URLs (picsum.photos, ui-avatars.com, etc.) pass through unchanged.
    return uri.replace(
      /^https?:\/\/(localhost|127\.0\.0\.1|(\d{1,3}\.){3}\d{1,3})(:\d+)?/,
      API_BASE_URL,
    );
  }
  if (uri.startsWith('/')) return `${API_BASE_URL}${uri}`;
  return uri;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_TAGS = [
  { key: 'room',    label: 'Rooms',    icon: 'bed',                   color: '#1565c0' },
  { key: 'tour',    label: 'Tours',    icon: 'map-marker-path',       color: '#2e7d32' },
  { key: 'dining',  label: 'Dining',   icon: 'silverware-fork-knife', color: '#e65100' },
  { key: 'spa',     label: 'Spa',      icon: 'spa',                   color: '#ad1457' },
  { key: 'package', label: 'Packages', icon: 'gift',                  color: '#6a1b9a' },
];

const FILTERS = [
  { key: 'all',     label: 'All',      icon: 'view-grid-outline' },
  { key: 'saved',   label: 'Saved',    icon: 'bookmark-outline' },
  { key: 'room',    label: 'Rooms',    icon: 'bed' },
  { key: 'tour',    label: 'Tours',    icon: 'map-marker-path' },
  { key: 'dining',  label: 'Dining',   icon: 'silverware-fork-knife' },
  { key: 'spa',     label: 'Spa',      icon: 'spa' },
  { key: 'package', label: 'Packages', icon: 'gift' },
];

const PHOTO_PRESETS = [
  `${API_BASE_URL}/uploads/rooms/room_main_Deluxe_693e5b21e4b41.jpg`,
  `${API_BASE_URL}/uploads/rooms/room_main_Family-Room-1_693e5caac3bc3.jpg`,
  `${API_BASE_URL}/uploads/rooms/room_gallery_bedroom_6a0f272f4826a.jpg`,
  `${API_BASE_URL}/uploads/tours/BD-693eb151aecc4.jpg`,
  `${API_BASE_URL}/uploads/tours/CH-693eaff0465d8.jpg`,
  `${API_BASE_URL}/uploads/rooms/room_gallery_double_693e5e0b8bd7e.jpg`,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const roleLabel = (role: string) => {
  if (role === 'ROLE_ADMIN') return 'Admin';
  if (role === 'ROLE_STAFF') return 'Staff';
  return 'Traveler';
};

const roleBadgeColor = (role: string) => {
  if (role === 'ROLE_ADMIN') return COLORS.error;
  if (role === 'ROLE_STAFF') return '#ef6c00';
  return COLORS.primary;
};

const avatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=c24a16&color=ffffff&bold=true&size=64`;

const timestampOf = (iso?: string): number => {
  const value = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
};

const sortWallPosts = (items: WallApiPost[]): WallApiPost[] =>
  [...items].sort((a, b) =>
    Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))
    || timestampOf(b.createdAt) - timestampOf(a.createdAt)
  );

const normalizeWallPost = (post: any): WallApiPost => ({
  id: String(post?.id ?? post?.['@id'] ?? `post-${Date.now()}`),
  authorId: Number(post?.authorId ?? post?.author?.id ?? 0),
  authorName: String(post?.authorName ?? post?.author?.fullName ?? post?.author?.username ?? 'Guest'),
  authorRole: String(post?.authorRole ?? post?.author?.role ?? 'ROLE_GUEST'),
  caption: String(post?.caption ?? post?.message ?? ''),
  imageUri: post?.imageUri ?? post?.imageUrl ?? post?.image ?? undefined,
  serviceTag: post?.serviceTag ?? post?.serviceType ?? undefined,
  reservationId: post?.reservationId ? Number(post.reservationId) : undefined,
  serviceId: post?.serviceId ? Number(post.serviceId) : undefined,
  isPinned: Boolean(post?.isPinned ?? post?.pinned ?? false),
  likedBy: Array.isArray(post?.likedBy) ? post.likedBy.map(Number) : [],
  comments: Array.isArray(post?.comments) ? post.comments : [],
  createdAt: String(post?.createdAt ?? new Date().toISOString()),
});

const normalizeWallPosts = (items: any[]): WallApiPost[] =>
  sortWallPosts(items.map(normalizeWallPost));

// ─── PostCard ─────────────────────────────────────────────────────────────────

const PostCard: FC<{
  post: WallApiPost;
  currentUserId: number;
  isSaved: boolean;
  isModRole: boolean;
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onViewService?: () => void;
}> = ({ post, currentUserId, isSaved, isModRole, onLike, onComment, onSave, onPin, onDelete, onViewService }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUri = resolveWallImage(post.imageUri);
  const authorName = post.authorName || 'Guest';
  const caption = post.caption?.trim() || 'Shared a moment on the wall.';
  const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const isLiked = likedBy.includes(currentUserId);

  const scaleAnim    = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const heartScale   = useRef(new Animated.Value(0.3)).current;
  const saveAnim     = useRef(new Animated.Value(1)).current;
  const lastTap      = useRef(0);

  const tag = SERVICE_TAGS.find(t => t.key === post.serviceTag);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUri]);

  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      if (!isLiked) onLike();
      Animated.sequence([
        Animated.parallel([
          Animated.spring(heartScale,   { toValue: 1,   useNativeDriver: true, speed: 22 }),
          Animated.timing(heartOpacity, { toValue: 1,   duration: 80,  useNativeDriver: true }),
        ]),
        Animated.delay(550),
        Animated.timing(heartOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start(() => heartScale.setValue(0.3));
    }
    lastTap.current = now;
  };

  const handleLike = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.45, useNativeDriver: true, speed: 60 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 60 }),
    ]).start();
    onLike();
  };

  const handleSave = () => {
    Animated.sequence([
      Animated.spring(saveAnim, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(saveAnim, { toValue: 1,   useNativeDriver: true, speed: 50 }),
    ]).start();
    onSave();
  };

  return (
    <View style={[card.wrap, post.isPinned && card.pinned]}>
      {post.isPinned && (
        <View style={card.pinnedBanner}>
          <Icon name="pin" size={14} color="#fff" />
          <Text style={card.pinnedBannerText}>Pinned post</Text>
        </View>
      )}

      {/* ── Author row ──────────────────────────────────────── */}
      <View style={card.authorRow}>
        <Image source={{ uri: avatarUrl(authorName) }} style={card.avatar} />
        <View style={card.authorInfo}>
          <Text style={card.authorName}>{authorName}</Text>
          <View style={card.authorMeta}>
            <View style={[card.rolePill, { backgroundColor: roleBadgeColor(post.authorRole) + '18' }]}>
              <Text style={[card.roleText, { color: roleBadgeColor(post.authorRole) }]}>
                {roleLabel(post.authorRole)}
              </Text>
            </View>
            <Text style={card.time}>{timeAgo(post.createdAt)}</Text>
          </View>
        </View>
        {onDelete && !isModRole && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name="dots-vertical" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Caption ─────────────────────────────────────────── */}
      <Text style={card.caption}>{caption}</Text>

      {/* ── Photo (double-tap to like) ──────────────────────── */}
      {imageUri && !imageFailed ? (
        <TouchableOpacity onPress={handleImageTap} activeOpacity={1}>
          <Image
            source={{ uri: imageUri }}
            style={card.image}
            resizeMode="cover"
            onError={(e) => {
              console.error('[ShareWall] image load failed:', imageUri, e.nativeEvent?.error);
              setImageFailed(true);
            }}
          />
          <Animated.View
            style={[card.heartOverlay, { opacity: heartOpacity, transform: [{ scale: heartScale }] }]}
            pointerEvents="none"
          >
            <Icon name="heart" size={90} color="rgba(255,255,255,0.92)" />
          </Animated.View>
        </TouchableOpacity>
      ) : (
        <View style={[card.image, card.imagePlaceholder]}>
          <Icon name="image-off-outline" size={36} color={COLORS.primary} />
          <Text style={card.imagePlaceholderText}>
            {imageUri ? 'Photo unavailable' : 'No photo attached'}
          </Text>
        </View>
      )}

      {/* ── Meta: tag ───────────────────────────────────────── */}
      {(tag || post.isPinned) ? (
        <View style={card.metaRow}>
          {tag && (
            <View style={[card.tagChip, { backgroundColor: tag.color + '15' }]}>
              <Icon name={tag.icon} size={12} color={tag.color} />
              <Text style={[card.tagText, { color: tag.color }]}>{tag.label}</Text>
            </View>
          )}
          {post.isPinned && (
            <View style={card.pinnedChip}>
              <Icon name="pin" size={11} color={COLORS.primary} />
              <Text style={card.pinnedText}>Pinned</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* ── Like summary ────────────────────────────────────── */}
      {likedBy.length > 0 && (
        <Text style={card.likesSummary}>
          {likedBy.length === 1 ? '1 person liked this' : `${likedBy.length} people liked this`}
        </Text>
      )}

      {/* ── Action bar ──────────────────────────────────────── */}
      <View style={card.divider} />
      {isModRole ? (
        <View style={card.actions}>
          <View style={card.actionsLeft}>
            <TouchableOpacity
              style={[card.actionBtn, post.isPinned && card.pinActionActive]}
              onPress={onPin}
              activeOpacity={0.75}
            >
              <Icon
                name={post.isPinned ? 'pin' : 'pin-outline'}
                size={22}
                color={post.isPinned ? '#fff' : COLORS.textMuted}
              />
              <Text style={[card.actionLabel, post.isPinned && card.pinActionTextActive]}>
                {post.isPinned ? 'Pinned' : 'Pin'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={card.actionBtn} onPress={onComment} activeOpacity={0.75}>
              <Icon name="comment-multiple-outline" size={22} color={COLORS.textMuted} />
              <Text style={card.actionLabel}>
                {comments.length > 0 ? comments.length : ''} Comment{comments.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} activeOpacity={0.75} style={card.modDeleteBtn}>
              <Icon name="trash-can-outline" size={18} color={COLORS.error} />
              <Text style={card.modDeleteText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={card.actions}>
          <View style={card.actionsLeft}>
            <TouchableOpacity style={card.actionBtn} onPress={handleLike} activeOpacity={0.75}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Icon name={isLiked ? 'heart' : 'heart-outline'} size={22}
                  color={isLiked ? '#e53935' : COLORS.textMuted} />
              </Animated.View>
              <Text style={[card.actionLabel, isLiked && { color: '#e53935', fontFamily: FONTS.bold }]}>
                {likedBy.length > 0 ? likedBy.length : ''} {isLiked ? 'Liked' : 'Like'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={card.actionBtn} onPress={onComment} activeOpacity={0.75}>
              <Icon name="comment-outline" size={22} color={COLORS.textMuted} />
              <Text style={card.actionLabel}>
                {comments.length > 0 ? comments.length : ''} Comment{comments.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.75} style={card.saveBtn}>
            <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
              <Icon name={isSaved ? 'bookmark' : 'bookmark-outline'} size={22}
                color={isSaved ? COLORS.primary : COLORS.textMuted} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Explore / View Service bar ──────────────────────── */}
      {tag && onViewService ? (
        <TouchableOpacity style={[card.bookBar, { backgroundColor: tag.color + '10', borderColor: tag.color + '30' }]}
          onPress={onViewService} activeOpacity={0.8}>
          <Icon name={tag.icon} size={14} color={tag.color} />
          <Text style={[card.bookBarText, { color: tag.color }]}>
            {isModRole ? `View ${tag.label} Service` : `Explore & Book ${tag.label}`}
          </Text>
          <Icon name="arrow-right" size={14} color={tag.color} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const card = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  pinned: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#fff7f2',
    ...SHADOW.md,
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
  },
  pinnedBannerText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: FONTS.bold,
    fontWeight: '800',
  },
  authorRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, paddingBottom: 10, gap: 10,
  },
  avatar:     { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: COLORS.primaryFaded },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  authorMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  rolePill:   { borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2 },
  roleText:   { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700' },
  time:       { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted },

  caption: {
    fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark,
    lineHeight: 21, paddingHorizontal: SPACING.md, paddingBottom: 12,
  },

  image:       { width: '100%', height: 230 },
  imagePlaceholder: {
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.primary + '18',
  },
  imagePlaceholderText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.primary,
  },
  heartOverlay:{
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    paddingHorizontal: SPACING.md, gap: SPACING.sm, paddingTop: 10,
  },
  tagChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:    { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700' },
  pinnedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '22', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  pinnedText: { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },

  likesSummary: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '600', color: COLORS.textMuted, paddingHorizontal: SPACING.md, paddingTop: 8 },

  divider:    { height: 1, backgroundColor: COLORS.border, marginTop: 10 },
  actions:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 8 },
  actionsLeft:{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 20 },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pinActionActive: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6 },
  pinActionTextActive: { color: '#fff', fontFamily: FONTS.bold, fontWeight: '800' },
  actionLabel:{ fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted },
  saveBtn:      { padding: 4 },
  modDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.errorFaded },
  modDeleteText:{ fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.error },

  bookBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    paddingVertical: 10, borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  bookBarText: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700' },
});

// ─── CommentsSheet ────────────────────────────────────────────────────────────

const CommentsSheet: FC<{
  post: WallApiPost | null;
  visible: boolean;
  onClose: () => void;
  currentUserName: string;
  onAddComment: (text: string) => Promise<void>;
}> = ({ post, visible, onClose, currentUserName, onAddComment }) => {
  const [text,    setText]    = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onAddComment(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <View style={cs.header}>
          <TouchableOpacity style={cs.backBtn} onPress={onClose}>
            <Icon name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={cs.headerTitle}>Comments</Text>
            {post && <Text style={cs.headerSub}>{post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}</Text>}
          </View>
        </View>

        {post && (
          <View style={cs.postPreview}>
            <Image source={{ uri: avatarUrl(post.authorName) }} style={cs.previewAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={cs.previewName}>{post.authorName}</Text>
              <Text style={cs.previewCaption} numberOfLines={2}>{post.caption}</Text>
            </View>
            {resolveWallImage(post.imageUri) && (
              <Image source={{ uri: resolveWallImage(post.imageUri) }} style={cs.previewThumb} />
            )}
          </View>
        )}

        <ScrollView contentContainerStyle={cs.list}>
          {post?.comments.length === 0 && (
            <View style={cs.empty}>
              <Icon name="comment-outline" size={52} color={COLORS.border} />
              <Text style={cs.emptyTitle}>No comments yet</Text>
              <Text style={cs.emptySub}>Be the first to say something!</Text>
            </View>
          )}
          {post?.comments.map(c => (
            <View key={c.id} style={cs.row}>
              <Image source={{ uri: avatarUrl(c.authorName) }} style={cs.avatar} />
              <View style={cs.bubble}>
                <Text style={cs.bubbleAuthor}>{c.authorName}</Text>
                <Text style={cs.bubbleText}>{c.text}</Text>
                <Text style={cs.bubbleTime}>{timeAgo(c.createdAt)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={cs.inputBar}>
          <Image source={{ uri: avatarUrl(currentUserName) }} style={cs.inputAvatar} />
          <TextInput
            style={cs.input}
            value={text}
            onChangeText={setText}
            placeholder="Add a comment…"
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[cs.sendBtn, (!text.trim() || sending) && cs.sendBtnOff]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.85}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Icon name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const cs = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16, paddingHorizontal: 16, gap: 12,
  },
  backBtn:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  headerTitle:{ color: '#fff', fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700' },
  headerSub:  { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: FONTS.body },

  postPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  previewAvatar:  { width: 36, height: 36, borderRadius: 18 },
  previewName:    { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  previewCaption: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted, marginTop: 1 },
  previewThumb:   { width: 48, height: 48, borderRadius: RADIUS.sm },

  list: { padding: 16, paddingBottom: 16, gap: 12 },

  empty:     { alignItems: 'center', marginTop: 70, gap: 10 },
  emptyTitle:{ fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  emptySub:  { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted },

  row:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar:       { width: 38, height: 38, borderRadius: 19 },
  bubble:       { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12, ...SHADOW.sm },
  bubbleAuthor: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 3 },
  bubbleText:   { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textDark, lineHeight: 19 },
  bubbleTime:   { fontSize: 10, fontFamily: FONTS.body, color: COLORS.textMuted, marginTop: 5 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  inputAvatar: { width: 34, height: 34, borderRadius: 17, marginBottom: 2 },
  input: {
    flex: 1, backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark,
    maxHeight: 90, borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOW.brand },
  sendBtnOff: { opacity: 0.4 },
});

// ─── ComposeModal ─────────────────────────────────────────────────────────────

// A gallery pick carries the file metadata needed for the multipart upload.
// A preset is just a server URL — no upload needed.
type PhotoSelection =
  | { kind: 'gallery'; uri: string; fileName: string; mimeType: string }
  | { kind: 'preset';  url: string };

const ComposeModal: FC<{
  visible: boolean;
  onClose: () => void;
  onPost: (caption: string, photo: PhotoSelection | null, serviceTag?: string) => Promise<void>;
  authorName: string;
}> = ({ visible, onClose, onPost, authorName }) => {
  const [caption,    setCaption]    = useState('');
  const [photo,      setPhoto]      = useState<PhotoSelection | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [posting,    setPosting]    = useState(false);

  const reset = () => {
    setCaption('');
    setPhoto(null);
    setSelectedTag(undefined);
  };

  const pickFromGallery = async () => {
    // Request permission explicitly on Android before opening the picker.
    if (Platform.OS === 'android') {
      try {
        const sdkInt = Platform.Version as number;
        const perm   = sdkInt >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const status = await PermissionsAndroid.request(perm, {
          title:           'Photo access needed',
          message:         'Allow Baroro to access your photos to share memories.',
          buttonPositive:  'Allow',
          buttonNegative:  'Deny',
        });
        if (status !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission denied', 'Please allow photo access in your device Settings.');
          return;
        }
      } catch (_) {
        // some devices auto-grant — continue anyway
      }
    }

    try {
      const response = await launchImageLibrary({
        mediaType:     'photo',
        quality:        0.8,
        selectionLimit: 1,
      });
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets?.[0];
      if (!asset?.uri) return;
      setPhoto({
        kind:     'gallery',
        uri:      asset.uri,
        fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
        mimeType: asset.type     ?? 'image/jpeg',
      });
    } catch (err: any) {
      Alert.alert('Gallery error', err?.message ?? 'Could not open gallery. Please try again.');
    }
  };

  const handlePost = async () => {
    if (!caption.trim()) {
      Alert.alert('Caption required', 'Write something to share with the community.');
      return;
    }
    setPosting(true);
    try {
      await onPost(caption.trim(), photo, selectedTag);
      reset();
      onClose();
    } catch (err: any) {
      Alert.alert('Post failed', err.message ?? 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const previewUri = photo?.kind === 'gallery' ? photo.uri
    : photo?.kind === 'preset'  ? photo.url
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView style={cm.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={cm.sheet}>
          <View style={cm.handle} />

          <View style={cm.header}>
            <Image source={{ uri: avatarUrl(authorName) }} style={cm.authorAvatar} />
            <Text style={cm.title}>New Post</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput
              style={cm.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="Share a memory, moment, or story with our community of travelers…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={cm.charCount}>{caption.length}/500</Text>

            <Text style={cm.sectionLabel}>Add a Photo <Text style={cm.optional}>(optional)</Text></Text>

            {/* Preview + remove */}
            {previewUri ? (
              <View style={cm.galleryPreviewWrap}>
                <Image source={{ uri: previewUri }} style={cm.galleryPreview} resizeMode="cover" />
                <TouchableOpacity
                  style={cm.galleryRemoveBtn}
                  onPress={() => setPhoto(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close-circle" size={26} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={cm.galleryChangeBtn}
                  onPress={pickFromGallery}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="image-edit" size={18} color="#fff" />
                  <Text style={cm.galleryChangeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Gallery picker */}
                <TouchableOpacity style={cm.galleryBtn} onPress={pickFromGallery} activeOpacity={0.8}>
                  <Icon name="image-plus" size={20} color={COLORS.primary} />
                  <Text style={cm.galleryBtnText}>Choose from Gallery</Text>
                </TouchableOpacity>

                {/* Preset thumbnails */}
                <Text style={cm.orLabel}>or pick a preset</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cm.photoRow}>
                  {PHOTO_PRESETS.map((url, i) => {
                    const active = photo?.kind === 'preset' && photo.url === url;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[cm.photoThumb, active && cm.photoThumbSel]}
                        onPress={() => setPhoto(active ? null : { kind: 'preset', url })}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: url }} style={cm.photoThumbImg} />
                        {active && (
                          <View style={cm.photoCheck}>
                            <Icon name="check-circle" size={26} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <Text style={cm.sectionLabel}>Tag a Service <Text style={cm.optional}>(optional)</Text></Text>
            <View style={cm.tagRow}>
              {SERVICE_TAGS.map(t => {
                const active = selectedTag === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[cm.tagChip, active && { backgroundColor: t.color + '18', borderColor: t.color }]}
                    onPress={() => setSelectedTag(active ? undefined : t.key)}
                    activeOpacity={0.75}
                  >
                    <Icon name={t.icon} size={13} color={active ? t.color : COLORS.textMuted} />
                    <Text style={[cm.tagText, active && { color: t.color, fontFamily: FONTS.bold }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[cm.postBtn, (!caption.trim() || posting) && cm.postBtnOff]}
              onPress={handlePost}
              disabled={!caption.trim() || posting}
              activeOpacity={0.85}
            >
              {posting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Icon name="send" size={18} color="#fff" />}
              <Text style={cm.postBtnText}>{posting ? 'Uploading & sharing…' : 'Share with Community'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const cm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '94%',
  },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18 },
  title:        { flex: 1, fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },

  captionInput: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark,
    minHeight: 110, marginBottom: 4,
  },
  charCount:    { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted, textAlign: 'right', marginBottom: 18 },
  sectionLabel: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 10 },
  optional:     { fontWeight: '400', color: COLORS.textMuted },

  photoRow:      { gap: 10, paddingBottom: 20 },
  photoThumb:    { width: 110, height: 74, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent' },
  photoThumbSel: { borderColor: COLORS.primary },
  photoThumbImg: { width: '100%', height: '100%' },
  photoCheck:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(194,74,22,0.42)', justifyContent: 'center', alignItems: 'center' },

  galleryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.primaryFaded,
    borderWidth: 1.5, borderColor: COLORS.primary + '40', borderStyle: 'dashed',
    borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 14,
  },
  galleryBtnText: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },

  galleryPreviewWrap: { position: 'relative', marginBottom: 16, borderRadius: RADIUS.md, overflow: 'hidden' },
  galleryPreview:     { width: '100%', height: 200 },
  galleryRemoveBtn:   {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 13,
  },
  galleryChangeBtn: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  galleryChangeBtnText: { fontSize: 12, fontFamily: FONTS.bold, color: '#fff' },

  orLabel: { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted, marginBottom: 8 },

  tagRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  tagText: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted },

  postBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 15, ...SHADOW.brand },
  postBtnOff: { opacity: 0.5 },
  postBtnText:{ color: '#fff', fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
});

// ─── DeleteModal ─────────────────────────────────────────────────────────────

const DeleteModal: FC<{
  post:      WallApiPost | null;
  visible:   boolean;
  deleting:  boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}> = ({ post, visible, deleting, onConfirm, onCancel }) => {
  const scaleAnim   = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 7 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(120),
          Animated.spring(iconAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }),
        ]),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      iconAnim.setValue(0);
    }
  }, [visible]);

  const resolvedThumb = resolveWallImage(post?.imageUri);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[dm.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[dm.card, { transform: [{ scale: scaleAnim }] }]}>

          {/* Icon */}
          <Animated.View style={[dm.iconRing, { transform: [{ scale: iconAnim }] }]}>
            <Icon name="trash-can-outline" size={38} color="#e53935" />
          </Animated.View>

          <Text style={dm.title}>Delete Post?</Text>
          <Text style={dm.subtitle}>
            This will permanently remove the post from the community wall. This action cannot be undone.
          </Text>

          {/* Post preview */}
          {post && (
            <View style={dm.preview}>
              {resolvedThumb ? (
                <Image source={{ uri: resolvedThumb }} style={dm.previewThumb} resizeMode="cover" />
              ) : (
                <View style={dm.previewThumbPlaceholder}>
                  <Icon name="image-off-outline" size={18} color={COLORS.border} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={dm.previewCaption} numberOfLines={2}>{post.caption}</Text>
                <Text style={dm.previewMeta}>{timeAgo(post.createdAt)}</Text>
              </View>
            </View>
          )}

          {/* Buttons */}
          <View style={dm.btnRow}>
            <TouchableOpacity
              style={dm.btnCancel}
              onPress={onCancel}
              disabled={deleting}
              activeOpacity={0.8}
            >
              <Text style={dm.btnCancelText}>Keep It</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[dm.btnDelete, deleting && dm.btnDeleting]}
              onPress={onConfirm}
              disabled={deleting}
              activeOpacity={0.8}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="trash-can" size={16} color="#fff" />
                  <Text style={dm.btnDeleteText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const dm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 26,
    paddingHorizontal: 26,
    paddingTop: 32,
    paddingBottom: 26,
    width: '100%',
    alignItems: 'center',
    ...SHADOW.sm,
  },

  iconRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#fdecea',
    borderWidth: 5,
    borderColor: '#ffcdd2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 21,
    fontFamily: FONTS.display,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: 12,
    width: '100%',
    marginBottom: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewThumb: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
  },
  previewThumbPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCaption: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textDark,
    lineHeight: 18,
    marginBottom: 3,
  },
  previewMeta: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },

  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  btnCancelText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  btnDelete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 15,
    borderRadius: RADIUS.full,
    backgroundColor: '#e53935',
    ...SHADOW.sm,
  },
  btnDeleting: { opacity: 0.65 },
  btnDeleteText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#fff',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ShareWallScreen: FC = () => {
  const navigation = useNavigation<any>();
  const { data, token } = useSelector((state: RootState) => state.auth);

  const userId   = (data as any)?.id ?? 0;
  const userRoles: string[] = (data as any)?.roles ?? [];
  const isModRole = userRoles.includes('ROLE_ADMIN') || userRoles.includes('ROLE_STAFF');
  const userName = (data as any)?.fullName
    || ((data as any)?.firstName ? `${(data as any).firstName} ${(data as any).lastName ?? ''}`.trim() : '')
    || (data as any)?.username
    || 'Traveler';

  const [posts,        setPosts]        = useState<WallApiPost[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filter,       setFilter]       = useState('all');
  const [composing,      setComposing]      = useState(false);
  const [activePostId,   setActivePostId]   = useState<string | null>(null);
  const [deletePost,     setDeletePost]     = useState<WallApiPost | null>(null);
  const [deleting,       setDeleting]       = useState(false);
  // Local-only saves (not persisted to server)
  const [savedIds,       setSavedIds]       = useState<Set<string>>(new Set());

  const fetchPosts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getWallPosts(50, 0, token);
      setPosts(normalizeWallPosts(res.posts ?? []));
    } catch {
      // silently ignore — network may be unavailable
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const filtered = filter === 'all'
    ? posts
    : filter === 'saved'
      ? posts.filter(p => savedIds.has(p.id))
      : posts.filter(p => p.serviceTag === filter);

  const activePost = posts.find(p => p.id === activePostId) ?? null;

  const handlePost = useCallback(async (
    caption: string,
    photo: PhotoSelection | null,
    serviceTag?: string,
  ) => {
    if (!token) throw new Error('You must be logged in to post.');

    let imageUri: string | undefined;

    if (photo?.kind === 'gallery') {
      // Upload the local file to the server first, then use the returned URL
      imageUri = await uploadWallImage(photo.uri, token, photo.fileName, photo.mimeType);
    } else if (photo?.kind === 'preset') {
      // Preset is already a server URL — use directly
      imageUri = photo.url;
    }

    const res = await createWallPost({ caption, imageUri, serviceTag }, token);
    setPosts(prev => normalizeWallPosts([res.post, ...prev]));
  }, [token]);

  const handleLike = useCallback(async (postId: string) => {
    if (!token) { Alert.alert('Login required', 'Log in to like posts.'); return; }
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const has = p.likedBy.includes(userId);
      return { ...p, likedBy: has ? p.likedBy.filter(id => id !== userId) : [...p.likedBy, userId] };
    }));
    try {
      const res = await toggleWallLike(postId, token);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likedBy: res.likedBy } : p));
    } catch {
      // revert on error
      fetchPosts(true);
    }
  }, [token, userId, fetchPosts]);

  const handleSave = useCallback((postId: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  const handleAddComment = useCallback(async (text: string) => {
    if (!activePostId || !token) return;
    const res = await addWallComment(activePostId, text, token);
    setPosts(prev => prev.map(p =>
      p.id === activePostId ? { ...p, comments: [...p.comments, res.comment] } : p
    ));
  }, [activePostId, token]);

  const handlePin = useCallback(async (postId: string) => {
    if (!token) return;
    setPosts(prev => sortWallPosts(prev.map(p => p.id === postId ? { ...p, isPinned: !p.isPinned } : p)));
    try {
      const res = await pinWallPost(postId, token);
      if (res?.isPinned !== undefined) {
        setPosts(prev => sortWallPosts(prev.map(p => p.id === postId ? { ...p, isPinned: res.isPinned } : p)));
      }
    } catch {
      fetchPosts(true);
    }
  }, [token, fetchPosts]);

  const handleDelete = useCallback((postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) setDeletePost(post);
  }, [posts]);

  const confirmDelete = useCallback(async () => {
    if (!deletePost || !token) return;
    setDeleting(true);
    try {
      await deleteWallPost(deletePost.id, token);
      setPosts(prev => prev.filter(p => p.id !== deletePost.id));
      setDeletePost(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not delete post.');
    } finally {
      setDeleting(false);
    }
  }, [deletePost, token]);

  const handleViewService = useCallback(() => {
    const isAdmin = userRoles.includes('ROLE_ADMIN');
    const isStaff = userRoles.includes('ROLE_STAFF');
    const target  = isAdmin ? 'ServicesTab' : isStaff ? 'StaffSvcTab' : ROUTES.EXPLORE;
    try {
      navigation.navigate(target);
    } catch {
      navigation.getParent()?.navigate(target);
    }
  }, [navigation, userRoles]);

  const savedCount = posts.filter(p => savedIds.has(p.id)).length;

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <View style={S.headerText}>
          <Text style={S.headerTitle}>Share Wall</Text>
          {isModRole ? (
            <View style={S.modBadge}>
              <Icon name="shield-check-outline" size={11} color={COLORS.primary} />
              <Text style={S.modBadgeText}>Moderator View</Text>
            </View>
          ) : (
            <Text style={S.headerSub}>{posts.length} memories from our community</Text>
          )}
        </View>
        {token && !isModRole ? (
          <TouchableOpacity style={S.composeBtn} onPress={() => setComposing(true)} activeOpacity={0.85}>
            <Icon name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <View style={S.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterScroll}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            const isSavedTab = f.key === 'saved';
            return (
              <TouchableOpacity
                key={f.key}
                style={[S.pill, active && S.pillActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.75}
              >
                <Icon name={f.icon} size={13} color={active ? '#fff' : COLORS.textMuted} />
                <Text style={[S.pillText, active && S.pillTextActive]}>{f.label}</Text>
                {isSavedTab && savedCount > 0 && (
                  <View style={[S.pillBadge, active && S.pillBadgeActive]}>
                    <Text style={[S.pillBadgeText, active && S.pillBadgeTextActive]}>{savedCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Feed ───────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={S.loaderWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={S.loaderText}>Loading community posts…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={userId}
              isSaved={savedIds.has(item.id)}
              isModRole={isModRole}
              onLike={() => handleLike(item.id)}
              onComment={() => setActivePostId(item.id)}
              onSave={() => handleSave(item.id)}
              onPin={isModRole ? () => handlePin(item.id) : undefined}
              onDelete={item.authorId === userId || isModRole ? () => handleDelete(item.id) : undefined}
              onViewService={item.serviceTag ? handleViewService : undefined}
            />
          )}
          contentContainerStyle={S.feed}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchPosts(true); }}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            filter === 'saved' ? (
              <View style={S.savedBanner}>
                <Icon name="bookmark" size={22} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={S.savedTitle}>Saved Posts</Text>
                  <Text style={S.savedSub}>
                    {savedCount > 0 ? `${savedCount} post${savedCount !== 1 ? 's' : ''} saved` : 'Tap the bookmark icon on any post to save it'}
                  </Text>
                </View>
              </View>
            ) : isModRole ? (
              <View style={S.modBanner}>
                <Icon name="shield-check-outline" size={28} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={S.modBannerTitle}>Moderation Dashboard</Text>
                  <Text style={S.modBannerSub}>Pin featured posts · Remove violations · Review community content</Text>
                </View>
              </View>
            ) : (
              <View style={S.heroBanner}>
                <Icon name="image-multiple-outline" size={28} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={S.heroTitle}>A Living Gallery</Text>
                  <Text style={S.heroSub}>Like • Comment • Save • Book — join our traveler community.</Text>
                </View>
              </View>
            )
          }
          ListEmptyComponent={
            <View style={S.empty}>
              <Icon name={filter === 'saved' ? 'bookmark-outline' : 'image-multiple-outline'} size={64} color={COLORS.border} />
              <Text style={S.emptyTitle}>{filter === 'saved' ? 'No saved posts yet' : 'No posts yet'}</Text>
              <Text style={S.emptySub}>
                {filter === 'saved'
                  ? 'Tap the bookmark icon on any post to save it here.'
                  : `Be the first to share a moment${filter !== 'all' ? ` in ${filter}` : ''} with the community.`}
              </Text>
              {filter !== 'saved' && token && !isModRole && (
                <TouchableOpacity style={S.emptyBtn} onPress={() => setComposing(true)}>
                  <Icon name="plus" size={16} color="#fff" />
                  <Text style={S.emptyBtnText}>Share a Moment</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {!isModRole && (
        <ComposeModal
          visible={composing}
          onClose={() => setComposing(false)}
          onPost={handlePost}
          authorName={userName}
        />
      )}

      <CommentsSheet
        post={activePost}
        visible={!!activePostId}
        onClose={() => setActivePostId(null)}
        currentUserName={userName}
        onAddComment={handleAddComment}
      />

      <DeleteModal
        post={deletePost}
        visible={!!deletePost}
        deleting={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeletePost(null)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...SHADOW.brand,
  },
  headerText:  { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 22, fontFamily: FONTS.display, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: FONTS.body, marginTop: 2 },
  modBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  modBadgeText:{ fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  composeBtn:  { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },

  filterBar:    { backgroundColor: COLORS.surface, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterScroll: { paddingHorizontal: SPACING.md, gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pillActive:        { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText:          { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '600', color: COLORS.textMuted },
  pillTextActive:    { color: '#fff' },
  pillBadge:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  pillBadgeActive:   { backgroundColor: 'rgba(255,255,255,0.3)' },
  pillBadgeText:     { fontSize: 9, fontFamily: FONTS.bold, fontWeight: '700', color: '#fff' },
  pillBadgeTextActive:{ color: '#fff' },

  feed: { padding: SPACING.md, paddingBottom: 110 },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted },

  heroBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.lg, padding: 16, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  heroTitle: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  heroSub:   { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted, lineHeight: 17 },

  modBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.lg, padding: 16, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  modBannerTitle: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  modBannerSub:   { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted, lineHeight: 17 },

  savedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.lg, padding: 16, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  savedTitle: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  savedSub:   { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted },

  empty:       { alignItems: 'center', marginTop: 60, gap: 10, paddingHorizontal: 32 },
  emptyTitle:  { fontSize: 18, fontFamily: FONTS.display, fontWeight: '700', color: COLORS.textDark },
  emptySub:    { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },
  emptyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 13, borderRadius: RADIUS.full, marginTop: 10, ...SHADOW.brand },
  emptyBtnText:{ color: '#fff', fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700' },
});

export default ShareWallScreen;
