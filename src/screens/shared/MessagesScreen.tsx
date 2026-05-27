// src/screens/shared/MessagesScreen.tsx
import React, { FC, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getContactMessages } from '../../app/api/api';
import { markRead } from '../../app/reducers/notifications';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';

interface Props { accentColor: string; detailRoute: string; }

const normalizeStatus = (status?: string) => (status ?? 'unread').toLowerCase();
const isUnread = (message: any) => ['new', 'unread'].includes(normalizeStatus(message.status));
const isUnreplied = (message: any) => !['replied', 'archived'].includes(normalizeStatus(message.status));
const collectionOf = (response: any): any[] =>
  response?.['hydra:member'] ?? response?.member ?? response?.data ?? (Array.isArray(response) ? response : []);
const markMessageSeen = (message: any) =>
  isUnread(message) ? { ...message, status: 'read' } : message;
const timestampOf = (iso?: string): number => {
  const value = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
};
const latestActivityTime = (message: any): number => {
  const replies = Array.isArray(message?.replies) ? message.replies : [];
  const latestReplyTime = replies.reduce(
    (latest: number, reply: any) => Math.max(latest, timestampOf(reply?.createdAt)),
    0,
  );
  return Math.max(timestampOf(message?.createdAt), latestReplyTime);
};
const replyBody = (reply: any): string =>
  String(reply?.replyMessage ?? reply?.message ?? reply?.body ?? '').trim();
const latestConversationPreview = (message: any): string => {
  const replies = Array.isArray(message?.replies) ? message.replies : [];
  const latestReply = [...replies].sort((a, b) => timestampOf(b?.createdAt) - timestampOf(a?.createdAt))[0];
  return replyBody(latestReply) || String(message?.message ?? '').trim();
};
const notificationMessageId = (notification: any): number | null => {
  const value = notification?.data?.messageId
    ?? notification?.data?.contactMessageId
    ?? notification?.data?.itemId
    ?? notification?.data?.id
    ?? notification?.messageId
    ?? notification?.contactMessageId
    ?? notification?.itemId;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const id = value.match(/\/(\d+)$/)?.[1] ?? value;
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value?.id != null) return Number(value.id);
  if (typeof value?.['@id'] === 'string') {
    const id = value['@id'].match(/\/(\d+)$/)?.[1];
    return id ? Number(id) : null;
  }
  return null;
};
const timeAgo = (iso?: string): string => {
  const timestamp = timestampOf(iso);
  if (!timestamp) return '—';

  const diff = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const STATUS_META: Record<string, { color: string; icon: string }> = {
  new:      { color: COLORS.warning, icon: 'email-alert-outline' },
  unread:   { color: COLORS.warning, icon: 'email-outline' },
  read:     { color: COLORS.info,    icon: 'email-open-outline' },
  replied:  { color: COLORS.success, icon: 'reply' },
  archived: { color: COLORS.textMuted,icon:'archive-outline' },
};

const MessagesScreen: FC<Props> = ({ accentColor, detailRoute }) => {
  const navigation = useNavigation<any>();
  const { token, notifications } = useSelector((state: RootState) => ({
    token: state.auth.token,
    notifications: state.notifications.items,
  }), shallowEqual);

  const [list, setList]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]       = useState('ALL');

  const fetchData = useCallback(async () => {
    try {
      const res = await getContactMessages(token);
      const messages = collectionOf(res);
      setList([...messages].sort((a, b) => {
        const latestDelta = latestActivityTime(b) - latestActivityTime(a);
        const unreadDelta = Number(isUnread(b) || hasUnreadMessageNotification(b.id)) - Number(isUnread(a) || hasUnreadMessageNotification(a.id));
        const unrepliedDelta = Number(isUnreplied(b)) - Number(isUnreplied(a));
        return latestDelta || unreadDelta || unrepliedDelta;
      }));
    } catch (e) { console.error('[Messages]', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, notifications]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const dispatch = useDispatch();

  const FILTERS = ['ALL', 'unread', 'read', 'replied', 'archived'];
  const filtered = filter === 'ALL' ? list : list.filter(m => normalizeStatus(m.status) === filter);
  const unreadCount = list.filter(message => isUnread(message) || hasUnreadMessageNotification(message.id)).length;
  const unrepliedCount = list.filter(isUnreplied).length;

  function hasUnreadMessageNotification(messageId: any): boolean {
    return notifications.some(n =>
      !n.read && n.type === 'message' && notificationMessageId(n) === Number(messageId)
    );
  }

  const markMessageNotificationsRead = (messageId: any): void => {
    notifications
      .filter(n => !n.read && n.type === 'message' && notificationMessageId(n) === Number(messageId))
      .forEach(n => dispatch(markRead(n.id)));
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = normalizeStatus(item.status);
    const unread = isUnread(item) || hasUnreadMessageNotification(item.id);
    const unreplied = isUnreplied(item);
    const meta = STATUS_META[status] ?? { color: COLORS.textMuted, icon: 'email-outline' };
    const activeAt = latestActivityTime(item);
    const preview = latestConversationPreview(item);
    return (
      <TouchableOpacity
        style={[styles.card, unreplied && styles.cardUnreplied, unread && styles.cardUnread]}
        activeOpacity={0.85}
        onPress={() => {
          markMessageNotificationsRead(item.id);
          setList(prev => prev.map(message => Number(message.id) === Number(item.id) ? markMessageSeen(message) : message));
          navigation.navigate(detailRoute, { id: item.id, message: markMessageSeen(item) });
        }}
      >
        <View style={[styles.cardLeft, { backgroundColor: meta.color }]}>
          <Icon name={meta.icon} size={20} color="#fff" />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text style={[styles.cardName, unread && styles.cardNameUnread]} numberOfLines={1}>{item.fullName}</Text>
            {unreplied && (
              <View style={[styles.attentionBadge, unread && styles.attentionBadgeUnread]}>
                <Text style={styles.attentionBadgeText}>{unread ? 'new' : 'needs reply'}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardSubject, unread && styles.cardTextUnread]} numberOfLines={1}>{item.subject}</Text>
          <Text style={[styles.cardPreview, unreplied && styles.cardPreviewUnreplied, unread && styles.cardPreviewUnread]} numberOfLines={1}>{preview}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.cardStatus, { color: meta.color }]}>{status}</Text>
          <Text style={[styles.cardDate, unread && styles.cardDateUnread]}>{timeAgo(activeAt ? new Date(activeAt).toISOString() : undefined)}</Text>
          {unread && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <View>
          <Text style={styles.headerTitle}>Messages</Text>
          {unrepliedCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread · {unrepliedCount} unreplied</Text>
          )}
        </View>
        <Text style={styles.headerCount}>{list.length} total</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && { backgroundColor: accentColor }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && { color: '#fff' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color={accentColor} style={{ marginTop: 40 }} />
        : <FlatList
            data={filtered}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={accentColor} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Icon name="email-off-outline" size={44} color={COLORS.border} />
                <Text style={styles.emptyText}>No messages</Text>
              </View>
            }
            renderItem={renderItem}
          />
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontFamily: FONTS.display, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: FONTS.body, marginTop: 2 },
  headerCount: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: FONTS.body },

  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  chip:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt },
  chipText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bold, color: COLORS.textMuted },

  list: { padding: 14, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    marginBottom: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  cardUnreplied: { borderLeftWidth: 4, borderLeftColor: COLORS.primary, backgroundColor: '#fffaf6' },
  cardUnread: {
    borderLeftWidth: 6,
    borderLeftColor: COLORS.warning,
    borderColor: '#f4b56b',
    backgroundColor: '#f8f1e7',
    ...SHADOW.md,
  },
  cardLeft:   { width: 52, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  cardBody:   { flex: 1, padding: 12 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName:   { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  cardNameUnread: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '900', color: COLORS.warning },
  cardSubject:{ fontSize: 12, color: COLORS.textDark, fontFamily: FONTS.medium, marginTop: 2 },
  cardPreview:{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },
  cardTextUnread: { color: '#111827', fontFamily: FONTS.bold, fontWeight: '900' },
  cardPreviewUnreplied: { color: '#4b5563', fontFamily: FONTS.body, fontWeight: '500' },
  cardPreviewUnread: { color: '#1f2937', fontFamily: FONTS.medium, fontWeight: '800' },
  cardRight:  { padding: 12, alignItems: 'flex-end', gap: 4 },
  cardStatus: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.bold },
  cardDate:   { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body },
  cardDateUnread: { color: COLORS.textDark, fontFamily: FONTS.bold, fontWeight: '700' },
  attentionBadge: { borderRadius: RADIUS.full, backgroundColor: COLORS.primary + '18', paddingHorizontal: 7, paddingVertical: 2 },
  attentionBadgeUnread: { backgroundColor: COLORS.warning + '26' },
  attentionBadgeText: { fontSize: 9, color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '900' },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.warning,
    marginTop: 2,
  },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body },
});

export default MessagesScreen;
