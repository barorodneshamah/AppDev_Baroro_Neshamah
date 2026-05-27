// src/screens/NotificationsScreen.tsx
import React, { FC } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../store';
import {
  markRead, markAllRead, removeNotification, clearNotifications,
  AppNotification,
} from '../app/reducers/notifications';
import ROUTES from '../utils';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';

const WsStatusDot: FC = () => {
  const { connected, reconnecting } = useSelector((s: RootState) => s.wsStatus);
  const color = connected ? '#4caf50' : reconnecting ? '#f57f17' : '#9e9e9e';
  const label = connected ? 'Live' : reconnecting ? 'Reconnecting…' : 'Offline';
  return (
    <View style={wsDot.wrap}>
      <View style={[wsDot.dot, { backgroundColor: color }]} />
      <Text style={[wsDot.label, { color }]}>{label}</Text>
    </View>
  );
};

const wsDot = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700' },
});

const TYPE_META: Record<string, { icon: string; color: string }> = {
  reservation: { icon: 'calendar-check',      color: '#1565c0' },
  payment:     { icon: 'credit-card-outline',  color: '#2e7d32' },
  booking:     { icon: 'calendar-plus',        color: '#6a1b9a' },
  cancellation:{ icon: 'calendar-remove',      color: '#c62828' },
  message:     { icon: 'email-outline',        color: '#f57f17' },
  general:     { icon: 'bell-outline',         color: COLORS.primary },
};

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const notificationResourceId = (item: AppNotification, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = item.data?.[key] ?? (item as any)[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const id = value.match(/\/(\d+)$/)?.[1] ?? value;
      const parsed = Number(id);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (value?.id != null) {
      const parsed = Number(value.id);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (typeof value?.['@id'] === 'string') {
      const id = value['@id'].match(/\/(\d+)$/)?.[1];
      if (id) return Number(id);
    }
  }
  return undefined;
};

const NotificationsScreen: FC = () => {
  const navigation = useNavigation<any>();
  const dispatch   = useDispatch();
  const items      = useSelector((state: RootState) => state.notifications.items);
  const unread     = items.filter(n => !n.read).length;
  const authData   = useSelector((state: RootState) => (state.auth as any).data);
  const roles: string[] = authData?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isStaff = roles.includes('ROLE_STAFF');

  const handlePress = (item: AppNotification) => {
    dispatch(markRead(item.id));
    const parent = (navigation as any).getParent();
    const messageId = notificationResourceId(item, ['messageId', 'contactMessageId', 'itemId', 'id']);
    if (isAdmin) {
      if (item.type === 'message') {
        messageId
          ? parent?.navigate('MessagesTab', { screen: ROUTES.ADMIN_MESSAGE_DETAIL, params: { id: messageId } })
          : parent?.navigate('MessagesTab');
      } else if (item.type === 'reservation') {
        parent?.navigate('ReservationsTab');
      } else if (item.type === 'payment') {
        parent?.navigate('PaymentsTab');
      }
    } else if (isStaff) {
      if (item.type === 'message') {
        messageId
          ? parent?.navigate('StaffMsgTab', { screen: ROUTES.STAFF_MESSAGE_DETAIL, params: { id: messageId } })
          : parent?.navigate('StaffMsgTab');
      } else if (item.type === 'reservation') {
        parent?.navigate('StaffResTab');
      } else if (item.type === 'payment') {
        parent?.navigate('StaffPayTab');
      }
    } else {
      if (item.type === 'message') {
        messageId
          ? parent?.navigate(ROUTES.MESSAGES, { openMessageId: messageId })
          : parent?.navigate(ROUTES.MESSAGES);
      } else if (['reservation', 'booking', 'cancellation', 'payment'].includes(item.type)) {
        parent?.navigate(ROUTES.BOOKINGS);
      }
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const meta = TYPE_META[item.type] ?? TYPE_META.general;
    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        activeOpacity={0.8}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
          <Icon name={meta.icon} size={22} color={meta.color} />
          {!item.read && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.body}  numberOfLines={2}>{item.body}</Text>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => dispatch(removeNotification(item.id))}
        >
          <Icon name="close" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          )}
        </View>
        <WsStatusDot />
        <View style={styles.headerActions}>
{unread > 0 && (
            <TouchableOpacity onPress={() => dispatch(markAllRead())} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {items.length > 0 && (
            <TouchableOpacity onPress={() => dispatch(clearNotifications())} style={styles.headerBtn}>
              <Icon name="delete-outline" size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? styles.emptyWrap : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Icon name="bell-off-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>You'll see booking updates and alerts here.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW.brand,
  },
  backBtn:      { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', color: '#fff' },
  badge:        { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  badgeText:    { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  headerActions:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn:    { paddingHorizontal: 4 },
  headerBtnText:{ fontSize: 11, fontFamily: FONTS.bold, color: 'rgba(255,255,255,0.9)' },

  list:    { padding: SPACING.md, paddingBottom: 40 },
  emptyWrap:  { flex: 1 },
  emptyInner: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.display, color: COLORS.textDark, fontWeight: '700' },
  emptySub:   { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.body, textAlign: 'center', paddingHorizontal: 32 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.sm,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },

  iconWrap: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm, position: 'relative' },
  unreadDot:{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.surface },

  content:  { flex: 1, marginRight: SPACING.sm },
  title:    { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  body:     { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted, lineHeight: 18, marginBottom: 4 },
  time:     { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted },

  deleteBtn: { padding: 4 },
});

export default NotificationsScreen;
