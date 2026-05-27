// src/screens/MessagesScreen.tsx
import React, { FC, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  StatusBar, ActivityIndicator, Alert, ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RootState } from '../store';
import { getContactMessages, submitContactMessage, getContactReplies, submitContactReply, isAuthError } from '../app/api/api';
import { userLogout } from '../app/reducers/auth';
import { markRead } from '../app/reducers/notifications';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  NEW:      { label: 'Sent',     color: '#1565c0', icon: 'email-send-outline' },
  UNREAD:   { label: 'Sent',     color: '#1565c0', icon: 'email-send-outline' },
  READ:     { label: 'Read',     color: '#2e7d32', icon: 'email-open-outline' },
  REPLIED:  { label: 'Replied',  color: '#c24a16', icon: 'reply-outline' },
  CLOSED:   { label: 'Closed',   color: '#888888', icon: 'email-check-outline' },
  ARCHIVED: { label: 'Closed',   color: '#888888', icon: 'email-check-outline' },
};

const timeAgo = (iso: string): string => {
  const date = new Date(iso);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return '';

  const diff = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const replyBody = (reply: any) =>
  reply?.replyMessage ?? reply?.message ?? reply?.body ?? '';

const replyKey = (reply: any, index: number) =>
  String(reply?.id ?? reply?.['@id'] ?? `${reply?.createdAt ?? 'reply'}-${index}`);

const replyMarker = (reply: any) =>
  String(reply?.id ?? reply?.['@id'] ?? reply?.createdAt ?? replyBody(reply));

const replyContactMessageId = (reply: any): number | null => {
  const contactMessage = reply?.contactMessage;
  if (typeof contactMessage === 'number') return contactMessage;
  if (typeof contactMessage === 'string') {
    const id = contactMessage.match(/\/(\d+)$/)?.[1];
    return id ? Number(id) : null;
  }
  if (contactMessage?.id) return Number(contactMessage.id);
  if (typeof contactMessage?.['@id'] === 'string') {
    const id = contactMessage['@id'].match(/\/(\d+)$/)?.[1];
    return id ? Number(id) : null;
  }
  return null;
};

const isReplyFromUser = (reply: any, userId: number | null) => {
  if (!userId) return false;
  return reply?.repliedBy?.id === userId || reply?.repliedBy === `/api/users/${userId}`;
};

const timestampOf = (iso?: string): number => {
  const value = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
};

const getThreadReplies = (message: any, allReplies: any[]): any[] => {
  const embedded = Array.isArray(message?.replies) ? message.replies : [];
  if (embedded.length > 0) return embedded;
  const messageId = Number(message?.id);
  return allReplies.filter(r => replyContactMessageId(r) === messageId);
};

const latestActivityAt = (message: any, allReplies: any[]): string | undefined => {
  const threadReplies = getThreadReplies(message, allReplies);
  const latestReplyTime = threadReplies.reduce(
    (latest: number, reply: any) => Math.max(latest, timestampOf(reply?.createdAt)),
    0,
  );
  const latest = Math.max(timestampOf(message?.createdAt), latestReplyTime);
  return latest ? new Date(latest).toISOString() : message?.createdAt;
};

const latestConversationPreview = (message: any, allReplies: any[]): string => {
  const threadReplies = getThreadReplies(message, allReplies);
  const latestReply = [...threadReplies].sort((a, b) => timestampOf(b?.createdAt) - timestampOf(a?.createdAt))[0];
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

const collectionOf = (response: any): any[] =>
  response?.['hydra:member'] ?? response?.member ?? response?.data ?? (Array.isArray(response) ? response : []);

// ─── Thread View Modal ────────────────────────────────────────────────────────

const ThreadModal: FC<{
  message: any;
  replies: any[];
  visible: boolean;
  onClose: () => void;
  token: string | null;
  userId: number | null;
  hasUnreadSupportReply: boolean;
  onReplySent: () => void;
}> = ({ message, replies, visible, onClose, token, userId, hasUnreadSupportReply, onReplySent }) => {
  const [replyText, setReplyText] = useState('');
  const [sending,   setSending]   = useState(false);
  const [localReplies, setLocalReplies] = useState<any[]>([]);
  const scrollRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    setLocalReplies([]);
    setReplyText('');
  }, [message?.id, visible]);

  const baseReplies = getThreadReplies(message, replies);
  const visibleLocalReplies = localReplies.filter(local =>
    !baseReplies.some(reply => replyBody(reply) === replyBody(local) && isReplyFromUser(reply, userId))
  );
  const threadReplies = [...baseReplies, ...visibleLocalReplies].sort(
    (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
  );
  const latestSupportReply = [...threadReplies].reverse().find(r => !isReplyFromUser(r, userId));
  const latestSupportMarker = latestSupportReply ? replyMarker(latestSupportReply) : null;

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const sentText = replyText.trim();
      const created = await submitContactReply({
        contactMessage: `/api/contact_messages/${message.id}`,
        repliedBy:      `/api/users/${userId}`,
        replyMessage:   sentText,
      }, token);
      setLocalReplies(prev => [...prev, {
        ...(created ?? {}),
        id: created?.id ?? created?.['@id'] ?? `local-${Date.now()}`,
        contactMessage: `/api/contact_messages/${message.id}`,
        repliedBy: `/api/users/${userId}`,
        replyMessage: sentText,
        createdAt: created?.createdAt ?? new Date().toISOString(),
      }]);
      setReplyText('');
      onReplySent();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={thread.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* Header */}
        <View style={thread.header}>
          <TouchableOpacity style={thread.backBtn} onPress={onClose}>
            <Icon name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={thread.headerInfo}>
            <Text style={thread.headerTitle} numberOfLines={1}>
              {message?.subject ?? 'Message'}
            </Text>
            <Text style={thread.headerSub}>Support Thread</Text>
          </View>
        </View>

        {/* Conversation */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={thread.scroll}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Original message bubble (customer, right-aligned) */}
          <View style={thread.rowRight}>
            <View style={[thread.bubble, thread.bubbleCustomer]}>
              <View style={thread.bubbleMeta}>
                <Icon name="account-circle-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={thread.bubbleFromWhite}>{message?.fullName ?? 'You'}</Text>
                <Text style={thread.bubbleTimeWhite}>{message?.createdAt ? timeAgo(message.createdAt) : ''}</Text>
              </View>
              <Text style={thread.bubbleTextWhite}>{message?.message ?? ''}</Text>
            </View>
          </View>

          {/* Replies alternating: support = left, customer replies = right */}
          {threadReplies.map((r, i) => {
            const isCustomer = isReplyFromUser(r, userId);
            const isNewSupportReply = hasUnreadSupportReply && !isCustomer && replyMarker(r) === latestSupportMarker;
            return isCustomer ? (
              <View key={replyKey(r, i)} style={thread.rowRight}>
                <View style={[thread.bubble, thread.bubbleCustomer]}>
                  <View style={thread.bubbleMeta}>
                    <Icon name="account-circle-outline" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={thread.bubbleFromWhite}>You</Text>
                    <Text style={thread.bubbleTimeWhite}>{r.createdAt ? timeAgo(r.createdAt) : ''}</Text>
                  </View>
                  <Text style={thread.bubbleTextWhite}>{replyBody(r)}</Text>
                </View>
              </View>
            ) : (
              <View key={replyKey(r, i)} style={thread.rowLeft}>
                <View style={[thread.bubble, thread.bubbleSupport, isNewSupportReply && thread.bubbleSupportNew]}>
                  <View style={thread.bubbleMeta}>
                    <Icon name="headset" size={14} color={COLORS.primary} />
                    <Text style={thread.bubbleFrom}>Support Team</Text>
                    <Text style={thread.bubbleTime}>{r.createdAt ? timeAgo(r.createdAt) : ''}</Text>
                  </View>
                  <Text style={thread.bubbleText}>{replyBody(r)}</Text>
                  {isNewSupportReply && (
                    <View style={thread.newBadge}>
                      <Text style={thread.newBadgeText}>New</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {threadReplies.length === 0 && (
            <View style={thread.waitingWrap}>
              <Icon name="clock-outline" size={28} color={COLORS.border} />
              <Text style={thread.waitingText}>Waiting for a reply from our team</Text>
            </View>
          )}
        </ScrollView>

        {/* Reply input bar */}
        <View style={thread.inputBar}>
          <TextInput
            style={thread.input}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Type a follow-up message…"
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[thread.sendBtn, (!replyText.trim() || sending) && thread.sendBtnDisabled]}
            onPress={handleSendReply}
            disabled={!replyText.trim() || sending}
            activeOpacity={0.85}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Icon name="send" size={20} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const thread = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f4f0' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16, paddingHorizontal: 16,
  },
  backBtn:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  headerInfo: { flex: 1 },
  headerTitle:{ color: '#fff', fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700' },
  headerSub:  { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: FONTS.body, marginTop: 1 },

  scroll: { padding: 16, paddingBottom: 16, gap: 8 },

  rowRight: { alignItems: 'flex-end', marginBottom: 8 },
  rowLeft:  { alignItems: 'flex-start', marginBottom: 8 },

  bubble: {
    maxWidth: '82%',
    borderRadius: RADIUS.lg,
    padding: 12,
    ...SHADOW.sm,
  },
  bubbleCustomer: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleSupport: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  bubbleSupportNew: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#fff8f2',
  },

  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  bubbleFrom: { flex: 1, fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textMuted },
  bubbleTime: { fontSize: 10, fontFamily: FONTS.body, color: COLORS.textMuted },
  bubbleText: { fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark, lineHeight: 20 },

  bubbleFromWhite: { flex: 1, fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  bubbleTimeWhite: { fontSize: 10, fontFamily: FONTS.body, color: 'rgba(255,255,255,0.65)' },
  bubbleTextWhite: { fontSize: 14, fontFamily: FONTS.body, color: '#fff', lineHeight: 20 },

  waitingWrap: { alignItems: 'center', marginTop: 32, gap: 8 },
  waitingText: { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted, textAlign: 'center' },
  newBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: { color: '#fff', fontSize: 10, fontFamily: FONTS.bold, fontWeight: '800' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: '#f0eeea',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark,
    maxHeight: 100,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    ...SHADOW.brand,
  },
  sendBtnDisabled: { opacity: 0.45 },
});

// ─── Compose Modal ────────────────────────────────────────────────────────────

const SUBJECT_PRESETS = [
  'Booking Inquiry',
  'Tour Information',
  'Dining Reservation',
  'General Question',
  'Feedback',
  'Partnership',
  'Other',
];

const ComposeModal: FC<{
  visible: boolean;
  onClose: () => void;
  onSent: () => void;
  defaultName: string;
  defaultEmail: string;
  token: string | null;
}> = ({ visible, onClose, onSent, defaultName, defaultEmail, token }) => {
  const [preset,        setPreset]        = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [body,          setBody]          = useState('');
  const [phone,         setPhone]         = useState('');
  const [sending,       setSending]       = useState(false);

  const finalSubject = preset === 'Other' ? customSubject.trim() : preset;
  const canSend      = !!finalSubject && !!body.trim() && !sending;

  const reset = () => { setPreset(''); setCustomSubject(''); setBody(''); setPhone(''); };

  const handleSend = async () => {
    if (!finalSubject || !body.trim()) {
      Alert.alert('Missing fields', 'Please select a subject and enter your message.');
      return;
    }
    setSending(true);
    try {
      await submitContactMessage(
        { fullName: defaultName, email: defaultEmail, phone: phone.trim() || undefined, subject: finalSubject, message: body.trim() },
        token,
      );
      reset();
      onSent();
      onClose();
    } catch (e: any) {
      if (isAuthError(e)) {
        Alert.alert('Session expired', 'Please log in again to continue.');
        onClose();
        return;
      }
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={compose.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={compose.sheet}>
          <View style={compose.handle} />
          <View style={compose.sheetHeader}>
            <Text style={compose.sheetTitle}>New Message</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {/* Sender info (read-only) */}
            <View style={compose.infoRow}>
              <Icon name="account-outline" size={16} color={COLORS.textMuted} />
              <Text style={compose.infoText}>{defaultName}  ·  {defaultEmail}</Text>
            </View>

            <Text style={compose.label}>Phone <Text style={compose.optional}>(optional)</Text></Text>
            <TextInput
              style={compose.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 09123456789"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={compose.label}>Subject</Text>
            <View style={compose.chipsWrap}>
              {SUBJECT_PRESETS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[compose.chip, preset === p && compose.chipActive]}
                  onPress={() => setPreset(p)}
                  activeOpacity={0.75}
                >
                  <Text style={[compose.chipText, preset === p && compose.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {preset === 'Other' && (
              <TextInput
                style={compose.input}
                value={customSubject}
                onChangeText={setCustomSubject}
                placeholder="Describe your inquiry..."
                placeholderTextColor={COLORS.textMuted}
                maxLength={255}
              />
            )}

            <Text style={compose.label}>Message</Text>
            <TextInput
              style={[compose.input, compose.textarea]}
              value={body}
              onChangeText={setBody}
              placeholder="Type your message here..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[compose.sendBtn, !canSend && compose.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.85}
            >
              {sending
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Icon name="send" size={16} color="#fff" />
                    <Text style={compose.sendBtnText}>Send Message</Text>
                  </>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const compose = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle:  { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 12, marginBottom: 16 },
  infoText:    { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted },
  label:       { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 6, marginTop: 4 },
  optional:    { fontWeight: '400', color: COLORS.textMuted },
  input: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12, fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark, marginBottom: 14,
  },
  textarea:    { minHeight: 110, textAlignVertical: 'top' },
  sendBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 14, marginTop: 4, ...SHADOW.brand },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
  chipsWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  chipActive:  { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '18' },
  chipText:    { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const MessagesScreen: FC = () => {
  const dispatch = useDispatch();
  const { data, token } = useSelector((state: RootState) => state.auth);
  const notifications = useSelector((state: RootState) => state.notifications.items);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [messages,   setMessages]   = useState<any[]>([]);
  const [replies,    setReplies]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composing,  setComposing]  = useState(false);
  const [active,     setActive]     = useState<any>(null);
  const [activeUnreadMessageId, setActiveUnreadMessageId] = useState<number | null>(null);
  const [openedIds,  setOpenedIds]  = useState<Set<number>>(new Set());

  const senderName  = data?.fullName  || data?.username || '';
  const senderEmail = data?.email     || '';
  const unreadMessageNotifications = notifications.filter(n => !n.read && n.type === 'message');
  const unreadMessageIds = unreadMessageNotifications
    .map(notificationMessageId)
    .filter((id): id is number => id !== null);

  const openMessageId: number | undefined = route.params?.openMessageId;

  useEffect(() => {
    if (!openMessageId || loading || messages.length === 0) return;
    const msg = messages.find(m => m.id === openMessageId || m.id === Number(openMessageId));
    if (msg) {
      setActiveUnreadMessageId(Number(openMessageId));
      notifications
        .filter(n => !n.read && n.type === 'message' && notificationMessageId(n) === Number(openMessageId))
        .forEach(n => dispatch(markRead(n.id)));
      setActive(msg);
      navigation.setParams({ openMessageId: undefined });
    }
  }, [openMessageId, messages, loading, notifications, dispatch, navigation]);

  const handleAuthExpiration = (error: any) => {
    if (!isAuthError(error)) return false;
    dispatch(userLogout());
    Alert.alert('Session expired', 'Please log in again to continue.');
    return true;
  };

  const load = useCallback(async () => {
    try {
      const [msgRes, repRes] = await Promise.all([
        getContactMessages(token),
        getContactReplies(token),
      ]);
      const allMsgs: any[] = collectionOf(msgRes);

      // Only show messages sent by this user — filter by email so other
      // users' messages (visible to admin) are never shown to the customer.
      const myMsgs = senderEmail
        ? allMsgs.filter(m => m.email === senderEmail)
        : allMsgs;

      const allReplies = collectionOf(repRes);
      setMessages([...myMsgs].sort((a, b) =>
        timestampOf(latestActivityAt(b, allReplies)) - timestampOf(latestActivityAt(a, allReplies))
      ));
      setReplies(allReplies);
    } catch (e: any) {
      if (handleAuthExpiration(e)) return;
      Alert.alert('Error', e.message ?? 'Unable to load messages.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, senderEmail, dispatch]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  useEffect(() => {
    if (unreadMessageNotifications.length === 0) return;
    load();
  }, [unreadMessageNotifications.length, load]);

  const isLikelyUnreadThread = (item: any): boolean => {
    const itemId = Number(item.id);
    if (openedIds.has(itemId)) return false;
    return unreadMessageIds.includes(itemId);
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = item.status?.toUpperCase() ?? 'NEW';
    const meta   = STATUS_META[status] ?? STATUS_META.NEW;
    const threadReplies = getThreadReplies(item, replies);
    const replyCount = threadReplies.length;
    const hasReplies = replyCount > 0;
    const isWaitingReply = !hasReplies && ['NEW', 'UNREAD', 'READ'].includes(status);
    const activeAt = latestActivityAt(item, replies);
    const hasUnreadSupportReply = isLikelyUnreadThread(item);
    const preview = latestConversationPreview(item, replies);
    const openThread = () => {
      setOpenedIds(prev => new Set([...prev, Number(item.id)]));
      setActiveUnreadMessageId(hasUnreadSupportReply ? Number(item.id) : null);
      notifications
        .filter(n => !n.read && n.type === 'message' && notificationMessageId(n) === Number(item.id))
        .forEach(n => dispatch(markRead(n.id)));
      setActive(item);
      load();
    };

    return (
      <TouchableOpacity
        style={[S.card, isWaitingReply && S.cardWaitingReply, hasReplies && S.cardWithReply, hasUnreadSupportReply && S.cardUnreadReply]}
        onPress={openThread}
        activeOpacity={0.85}
      >
        <View style={[S.cardIcon, { backgroundColor: meta.color + '18' }]}>
          <Icon name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={S.cardContent}>
          <View style={S.cardTop}>
            <Text style={[S.cardSubject, isWaitingReply && S.cardSubjectWaiting, hasUnreadSupportReply && S.cardUnreadReplyText]} numberOfLines={1}>{item.subject}</Text>
            <Text style={[S.cardTime, hasUnreadSupportReply && S.cardTimeUnread]}>{activeAt ? timeAgo(activeAt) : ''}</Text>
          </View>
          {hasReplies && (
            <Text style={[S.cardFrom, hasUnreadSupportReply && S.cardFromUnread]} numberOfLines={1}>
              Support Team
            </Text>
          )}
          <Text style={[S.cardPreview, isWaitingReply && S.cardPreviewWaiting, hasUnreadSupportReply && S.cardUnreadReplyText]} numberOfLines={1}>{preview}</Text>
          <View style={S.cardBottom}>
            <View style={[S.statusPill, { backgroundColor: meta.color + '18' }]}>
              <Text style={[S.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {replyCount > 0 && (
              <View style={[S.replyBadge, hasUnreadSupportReply && S.replyBadgeUnread]}>
                <Icon name="reply" size={11} color={COLORS.primary} />
                <Text style={[S.replyBadgeText, hasUnreadSupportReply && S.replyBadgeTextUnread]}>
                  {hasUnreadSupportReply ? 'new reply' : `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
                </Text>
              </View>
            )}
            {replyCount === 0 && hasUnreadSupportReply && (
              <View style={S.replyBadgeUnread}>
                <Text style={S.replyBadgeTextUnread}>new reply</Text>
              </View>
            )}
            {isWaitingReply && (
              <View style={S.waitingBadge}>
                <Icon name="clock-outline" size={11} color={COLORS.warning} />
                <Text style={S.waitingBadgeText}>awaiting reply</Text>
              </View>
            )}
          </View>
        </View>
        <Icon name="chevron-right" size={18} color={COLORS.border} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={S.header}>
        <View>
          <Text style={S.headerTitle}>Messages</Text>
          <Text style={S.headerSub}>Contact & support threads</Text>
        </View>
        <TouchableOpacity style={S.composeBtn} onPress={() => setComposing(true)} activeOpacity={0.85}>
          <Icon name="pencil-plus-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} size="large" />
        : (
          <FlatList
            data={messages}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={messages.length === 0 ? S.emptyWrap : S.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <View style={S.empty}>
                <Icon name="email-outline" size={64} color={COLORS.border} />
                <Text style={S.emptyTitle}>No messages yet</Text>
                <Text style={S.emptySub}>Tap the pencil icon to send us a message.</Text>
                <TouchableOpacity style={S.emptyBtn} onPress={() => setComposing(true)}>
                  <Icon name="pencil-plus-outline" size={16} color="#fff" />
                  <Text style={S.emptyBtnText}>New Message</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )
      }

      <ComposeModal
        visible={composing}
        onClose={() => setComposing(false)}
        onSent={load}
        defaultName={senderName}
        defaultEmail={senderEmail}
        token={token}
      />

      {active && (
        <ThreadModal
          message={active}
          replies={replies}
          visible={!!active}
          onClose={() => {
            setActive(null);
            setActiveUnreadMessageId(null);
          }}
          token={token}
          userId={data?.id ?? null}
          hasUnreadSupportReply={activeUnreadMessageId === Number(active.id)}
          onReplySent={load}
        />
      )}
    </View>
  );
};

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
  headerTitle: { color: '#fff', fontSize: 22, fontFamily: FONTS.display, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: FONTS.body, marginTop: 2 },
  composeBtn:  { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },

  list:     { padding: SPACING.md, paddingBottom: 100 },
  emptyWrap:{ flex: 1 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: 14,
    marginBottom: 10, ...SHADOW.sm, gap: 12,
  },
  cardWithReply: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    backgroundColor: '#fffaf6',
  },
  cardWaitingReply: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    backgroundColor: '#fff8f2',
  },
  cardUnreadReply: {
    borderLeftWidth: 6,
    borderLeftColor: COLORS.warning,
    borderWidth: 1,
    borderColor: '#f4b56b',
    backgroundColor: '#f8f1e7',
    ...SHADOW.md,
  },
  cardIcon:    { width: 48, height: 48, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardContent: { flex: 1, gap: 4 },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSubject: { flex: 1, fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginRight: 8 },
  cardTime:    { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted },
  cardFrom:    { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted },
  cardFromUnread: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '900', color: COLORS.warning },
  cardPreview: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.textMuted },
  cardSubjectWaiting: { color: '#1f2937', fontWeight: '900' },
  cardPreviewWaiting: { color: '#374151', fontFamily: FONTS.medium, fontWeight: '700' },
  cardSubjectWithReply: { color: '#111827', fontWeight: '900' },
  cardTimeUnread: { color: '#374151', fontFamily: FONTS.bold, fontWeight: '700' },
  cardUnreadReplyText: { color: '#0f172a', fontFamily: FONTS.bold, fontWeight: '900' },
  cardBottom:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  statusPill:  { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:  { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700' },
  replyBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyBadgeText: { fontSize: 11, fontFamily: FONTS.body, color: COLORS.primary },
  replyBadgeUnread: {
    backgroundColor: COLORS.primary + '18',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  replyBadgeTextUnread: { fontFamily: FONTS.bold, fontWeight: '900', color: COLORS.primary },
  waitingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.warning + '18', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  waitingBadgeText: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '900', color: COLORS.warning },

  empty:      { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.display, fontWeight: '700', color: COLORS.textDark },
  emptySub:   { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.full, marginTop: 8, ...SHADOW.brand },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700' },
});

export default MessagesScreen;
