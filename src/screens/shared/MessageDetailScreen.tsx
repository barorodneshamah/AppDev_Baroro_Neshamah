// src/screens/shared/MessageDetailScreen.tsx
import React, { FC, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getContactMessage, replyToMessage, updateMessageStatus, deleteMessage } from '../../app/api/api';
import { markRead } from '../../app/reducers/notifications';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';
import { ConfirmModal, ConfirmModalConfig } from '../../components/AppModals';

interface Props { accentColor: string; }

const STATUS_OPTIONS = ['unread', 'read', 'replied', 'archived'];

const replyKey = (reply: any, index: number) =>
  String(reply?.id ?? reply?.['@id'] ?? `${reply?.createdAt ?? 'reply'}-${index}`);

const replyBody = (reply: any) =>
  reply?.replyMessage ?? reply?.message ?? reply?.body ?? '';

const isReplyFromCurrentUser = (reply: any, userId?: number | null) => {
  if (!userId) return false;
  return reply?.repliedBy?.id === userId || reply?.repliedBy === `/api/users/${userId}`;
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

const MessageDetailScreen: FC<Props> = ({ accentColor }) => {
  const navigation  = useNavigation<any>();
  const route       = useRoute<any>();
  const { id, message: passed } = route.params as { id: number; message?: any };
  const dispatch = useDispatch();
  const { token, data, notifications } = useSelector((state: RootState) => ({
    token: state.auth.token,
    data: state.auth.data,
    notifications: state.notifications.items,
  }));

  const [item, setItem]         = useState<any>(passed ?? null);
  const [loading, setLoading]   = useState(!passed);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmModalConfig | null>(null);

  const reload = async () => {
    const fresh = await getContactMessage(id, token);
    setItem(fresh);
  };

  useEffect(() => {
    if (passed) return;
    getContactMessage(id, token)
      .then(setItem)
      .catch(e => console.error('[MessageDetail]', e))
      .finally(() => setLoading(false));
  }, [id, token, passed]);

  useEffect(() => {
    notifications
      .filter(n => !n.read && n.type === 'message' && notificationMessageId(n) === Number(id))
      .forEach(n => dispatch(markRead(n.id)));
  }, [dispatch, id, notifications]);

  useEffect(() => {
    if (!['new', 'unread'].includes(String(item?.status ?? '').toLowerCase())) return;
    setItem((current: any) => current ? { ...current, status: 'read' } : current);
    updateMessageStatus(id, 'read', token).catch(e => console.error('[MessageDetail] mark read', e));
  }, [id, item?.status, token]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replyToMessage(id, reply.trim(), token);
      setReply('');
      await reload();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSending(false); }
  };

  const handleStatus = (status: string) => {
    setConfirmConfig({
      icon:         'check-circle-outline',
      iconBg:       accentColor + '18',
      iconColor:    accentColor,
      title:        'Update Status?',
      message:      `Mark this message as "${status}"?`,
      confirmLabel: 'Update',
      cancelLabel:  'Cancel',
      onCancel:     () => setConfirmConfig(null),
      onConfirm:    async () => {
        setConfirmConfig(null);
        try { await updateMessageStatus(id, status, token); await reload(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      },
    });
  };

  const handleDelete = () => {
    setConfirmConfig({
      icon:         'trash-can-outline',
      iconBg:       COLORS.errorFaded,
      iconColor:    COLORS.error,
      title:        'Delete Message?',
      message:      'This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel:  'Cancel',
      dangerous:    true,
      onCancel:     () => setConfirmConfig(null),
      onConfirm:    async () => {
        setConfirmConfig(null);
        try { await deleteMessage(id, token); navigation.goBack(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      },
    });
  };

  if (loading) return <ActivityIndicator color={accentColor} style={{ marginTop: 80 }} />;

  const sortedReplies = [...(item?.replies ?? [])].sort(
    (a: any, b: any) => new Date(a?.createdAt ?? 0).getTime() - new Date(b?.createdAt ?? 0).getTime()
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{item?.subject}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Icon name="trash-can-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Sender info */}
        <View style={styles.senderCard}>
          <View style={[styles.avatar, { backgroundColor: accentColor }]}>
            <Text style={styles.avatarText}>{(item?.fullName?.[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View style={styles.senderInfo}>
            <Text style={styles.senderName}>{item?.fullName}</Text>
            <Text style={styles.senderEmail}>{item?.email}</Text>
            {item?.phone && <Text style={styles.senderPhone}>{item.phone}</Text>}
          </View>
          <Text style={styles.senderDate}>{item?.createdAt?.slice(0, 10)}</Text>
        </View>

        {/* Status chips */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          {STATUS_OPTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.statusChip, item?.status === s && { backgroundColor: accentColor }]}
              onPress={() => handleStatus(s)}
            >
              <Text style={[styles.statusChipText, item?.status === s && { color: '#fff' }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Conversation */}
        <View style={styles.threadSection}>
          <Text style={styles.threadTitle}>Conversation</Text>

          <View style={styles.bubbleRowLeft}>
            <View style={styles.bubbleLeft}>
              <View style={styles.bubbleMeta}>
                <Icon name="account-circle-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.bubbleName}>{item?.fullName ?? 'Customer'}</Text>
                <Text style={styles.bubbleTime}>{item?.createdAt?.slice(0, 10) ?? ''}</Text>
              </View>
              <Text style={styles.bubbleText}>{item?.message ?? ''}</Text>
            </View>
          </View>

          {sortedReplies.map((r: any, index: number) => {
            const mine = isReplyFromCurrentUser(r, data?.id);
            return (
              <View key={replyKey(r, index)} style={mine ? styles.bubbleRowRight : styles.bubbleRowLeft}>
                <View style={mine ? [styles.bubbleRight, { backgroundColor: accentColor }] : styles.bubbleLeft}>
                  <View style={styles.bubbleMeta}>
                    <Icon
                      name={mine ? 'account-tie-outline' : 'account-circle-outline'}
                      size={14}
                      color={mine ? 'rgba(255,255,255,0.8)' : COLORS.textMuted}
                    />
                    <Text style={mine ? styles.bubbleNameWhite : styles.bubbleName}>
                      {mine ? 'You' : r?.repliedBy?.fullName ?? item?.fullName ?? 'Customer'}
                    </Text>
                    <Text style={mine ? styles.bubbleTimeWhite : styles.bubbleTime}>
                      {r?.createdAt?.slice(0, 10) ?? ''}
                    </Text>
                  </View>
                  <Text style={mine ? styles.bubbleTextWhite : styles.bubbleText}>{replyBody(r)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Reply input */}
        <View style={styles.replyBox}>
          <Text style={styles.replyBoxLabel}>Reply</Text>
          <TextInput
            style={styles.replyInput}
            placeholder="Type your reply…"
            placeholderTextColor={COLORS.textMuted}
            value={reply}
            onChangeText={setReply}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: accentColor }, sending && { opacity: 0.7 }]}
            onPress={handleReply}
            disabled={sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Icon name="send" size={16} color="#fff" />
                  <Text style={styles.sendBtnText}>Send Reply</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ConfirmModal config={confirmConfig} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn:     { padding: 4 },
  deleteBtn:   { padding: 4, marginLeft: 'auto' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 16, fontFamily: FONTS.display, fontWeight: '700' },
  body:  { padding: 16, paddingBottom: 100 },

  senderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 14, marginBottom: 12, ...SHADOW.sm,
  },
  avatar:      { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText:  { color: '#fff', fontSize: 18, fontWeight: '800', fontFamily: FONTS.bold },
  senderInfo:  { flex: 1 },
  senderName:  { fontSize: 14, fontWeight: '700', color: COLORS.textDark, fontFamily: FONTS.bold },
  senderEmail: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },
  senderPhone: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.body },
  senderDate:  { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body },

  statusRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusLabel: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  statusChip:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt },
  statusChipText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bold, color: COLORS.textMuted },

  threadSection: { marginBottom: 16 },
  threadTitle:   { fontSize: 13, fontWeight: '700', color: COLORS.textDark, fontFamily: FONTS.bold, marginBottom: 10 },
  bubbleRowLeft: { alignItems: 'flex-start', marginBottom: 10 },
  bubbleRowRight:{ alignItems: 'flex-end', marginBottom: 10 },
  bubbleLeft: {
    maxWidth: '84%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderBottomLeftRadius: 4,
    padding: 12,
    ...SHADOW.sm,
  },
  bubbleRight: {
    maxWidth: '84%',
    borderRadius: RADIUS.md,
    borderBottomRightRadius: 4,
    padding: 12,
    ...SHADOW.sm,
  },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  bubbleName: { flex: 1, fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.bold, fontWeight: '700' },
  bubbleNameWhite: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.86)', fontFamily: FONTS.bold, fontWeight: '700' },
  bubbleTime: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body },
  bubbleTimeWhite: { fontSize: 10, color: 'rgba(255,255,255,0.72)', fontFamily: FONTS.body },
  bubbleText: { fontSize: 14, color: COLORS.textDark, fontFamily: FONTS.body, lineHeight: 21 },
  bubbleTextWhite: { fontSize: 14, color: '#fff', fontFamily: FONTS.body, lineHeight: 21 },

  replyBox:      { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, ...SHADOW.sm },
  replyBoxLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textDark, fontFamily: FONTS.bold, marginBottom: 8 },
  replyInput:    {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: 12, fontSize: 14, color: COLORS.textDark, fontFamily: FONTS.body,
    height: 100, textAlignVertical: 'top', marginBottom: 10,
  },
  sendBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: RADIUS.md },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold },
});

export default MessageDetailScreen;
