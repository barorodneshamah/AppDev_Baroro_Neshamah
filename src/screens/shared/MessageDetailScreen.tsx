// src/screens/shared/MessageDetailScreen.tsx
import React, { FC, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getContactMessage, replyToMessage, updateMessageStatus, deleteMessage } from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';

interface Props { accentColor: string; }

const STATUS_OPTIONS = ['unread', 'read', 'replied', 'archived'];

const MessageDetailScreen: FC<Props> = ({ accentColor }) => {
  const navigation  = useNavigation<any>();
  const route       = useRoute<any>();
  const { id, message: passed } = route.params as { id: number; message?: any };
  const { token }   = useSelector((state: RootState) => state.auth);

  const [item, setItem]         = useState<any>(passed ?? null);
  const [loading, setLoading]   = useState(!passed);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);

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
    Alert.alert('Update Status', `Mark as "${status}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update', onPress: async () => {
          try { await updateMessageStatus(id, status, token); await reload(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Message', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteMessage(id, token); navigation.goBack(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator color={accentColor} style={{ marginTop: 80 }} />;

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

        {/* Message body */}
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>{item?.message}</Text>
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

        {/* Replies */}
        {(item?.replies ?? []).length > 0 && (
          <View style={styles.repliesSection}>
            <Text style={styles.repliesTitle}>Previous Replies</Text>
            {(item.replies as any[]).map((r: any) => (
              <View key={r.id} style={[styles.replyCard, { borderLeftColor: accentColor }]}>
                <Text style={styles.replyBy}>{r.repliedBy?.fullName ?? 'Staff'}</Text>
                <Text style={styles.replyText}>{r.replyMessage}</Text>
                <Text style={styles.replyDate}>{r.createdAt?.slice(0, 10)}</Text>
              </View>
            ))}
          </View>
        )}

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

  messageCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, ...SHADOW.sm, marginBottom: 12 },
  messageText: { fontSize: 14, color: COLORS.textDark, fontFamily: FONTS.body, lineHeight: 22 },

  statusRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusLabel: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  statusChip:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt },
  statusChipText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bold, color: COLORS.textMuted },

  repliesSection: { marginBottom: 16 },
  repliesTitle:   { fontSize: 13, fontWeight: '700', color: COLORS.textDark, fontFamily: FONTS.bold, marginBottom: 8 },
  replyCard:      { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 10, paddingVertical: 6 },
  replyBy:        { fontSize: 12, fontWeight: '700', color: COLORS.textDark, fontFamily: FONTS.bold },
  replyText:      { fontSize: 13, color: COLORS.textDark, fontFamily: FONTS.body, marginTop: 4, lineHeight: 20 },
  replyDate:      { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 4 },

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
