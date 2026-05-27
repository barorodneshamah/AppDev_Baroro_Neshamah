// src/screens/shared/PaymentDetailScreen.tsx
import React, { FC, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar, Modal,
  TextInput, KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { getPayment, approvePayment, rejectPayment, refundPayment } from '../../app/api/api';
import { addNotification } from '../../app/reducers/notifications';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';
import { ConfirmModal, ConfirmModalConfig } from '../../components/AppModals';

interface Props { accentColor: string; }

const STATUS_COLOR: Record<string, string> = {
  PENDING:  COLORS.warning,
  APPROVED: COLORS.success,
  REJECTED: COLORS.error,
  REFUNDED: COLORS.info,
};

const Row: FC<{ label: string; value?: any }> = ({ label, value }) =>
  value !== undefined && value !== null && value !== '' ? (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  ) : null;

const PaymentDetailScreen: FC<Props> = ({ accentColor }) => {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const dispatch   = useDispatch();
  const { id, payment: passed } = route.params as { id: number; payment?: any };
  const { token }  = useSelector((state: RootState) => state.auth);

  const [item, setItem]       = useState<any>(passed ?? null);
  const [loading, setLoading] = useState(!passed);
  const [busy, setBusy]       = useState(false);
  const [actionConfig, setActionConfig] = useState<ConfirmModalConfig | null>(null);

  // Reject modal (cross-platform replacement for Alert.prompt)
  const [rejectModal,  setRejectModal]  = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const reload = async () => {
    const fresh = await getPayment(id, token);
    setItem(fresh);
  };

  useEffect(() => {
    if (passed) return;
    getPayment(id, token)
      .then(setItem)
      .catch(e => console.error('[PaymentDetail]', e))
      .finally(() => setLoading(false));
  }, [id, token, passed]);

  const doAction = (label: string, fn: () => Promise<any>, onSuccess?: () => void) => {
    const isRefund = label.toLowerCase().includes('refund');
    const color = isRefund ? COLORS.info : COLORS.success;
    setActionConfig({
      icon:         isRefund ? 'cash-refund' : 'check-circle-outline',
      iconBg:       color + '18',
      iconColor:    color,
      title:        `${label} Payment?`,
      message:      `Confirm ${label.toLowerCase()} for this payment?`,
      confirmLabel: label,
      cancelLabel:  'Cancel',
      onCancel:     () => setActionConfig(null),
      onConfirm:    async () => {
        setActionConfig(null);
        setBusy(true);
        try {
          await fn();
          await reload();
          onSuccess?.();
        } catch (e: any) {
          Alert.alert('Error', e.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const openRejectModal = () => {
    setRejectReason('');
    setRejectModal(true);
  };

  const confirmReject = async () => {
    setRejectModal(false);
    setBusy(true);
    try {
      await rejectPayment(id, rejectReason.trim(), token);
      const fresh = await getPayment(id, token);

      const amount  = fresh?.amount ?? item?.amount ?? '0';
      const refCode = fresh?.transactionReference ?? `#${id}`;
      dispatch(addNotification({
        id:        `payment-rejected-${id}-${Date.now()}`,
        title:     'Payment Rejected',
        body:      `Payment ${refCode} of ₱${amount} was rejected.${rejectReason.trim() ? ` Reason: ${rejectReason.trim()}` : ''}`,
        type:      'payment',
        read:      false,
        createdAt: new Date().toISOString(),
      }));

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const normalizedStatus = String(item?.status ?? '').toUpperCase();
  const statusColor = STATUS_COLOR[normalizedStatus] ?? COLORS.textMuted;

  if (loading) return <ActivityIndicator color={accentColor} style={{ marginTop: 80 }} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item?.transactionReference ?? `Payment #${id}`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{normalizedStatus || item?.status}</Text>
          <Text style={styles.statusAmount}>₱{item?.amount}</Text>
        </View>

        <View style={styles.card}>
          <Row label="Transaction Ref"  value={item?.transactionReference} />
          <Row label="Payment Method"   value={item?.paymentMethod} />
          <Row label="Amount"           value={`₱${item?.amount}`} />
          <Row label="Status"           value={normalizedStatus || item?.status} />
          <Row label="Paid By"          value={item?.paidBy?.fullName || item?.paidBy?.username} />
          <Row label="Approved By"      value={item?.approvedBy?.fullName || item?.approvedBy?.username} />
          <Row label="Approved At"      value={item?.approvedAt?.slice(0, 10)} />
          <Row label="Rejection Reason" value={item?.rejectionReason} />
          <Row label="Admin Notes"      value={item?.adminNotes} />
          <Row label="Created"          value={item?.createdAt?.slice(0, 10)} />
        </View>

        {busy
          ? <ActivityIndicator color={accentColor} style={{ marginVertical: 16 }} />
          : <View style={styles.actions}>
              {normalizedStatus === 'PENDING' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                    onPress={() => doAction('Approve', () => approvePayment(id, token))}
                  >
                    <Icon name="check" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.error }]}
                    onPress={openRejectModal}
                  >
                    <Icon name="close" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </>
              )}
              {normalizedStatus === 'APPROVED' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: COLORS.info }]}
                  onPress={() => doAction('Approve Refund', () => refundPayment(id, token))}
                >
                  <Icon name="cash-refund" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Approve Refund</Text>
                </TouchableOpacity>
              )}
            </View>
        }
      </ScrollView>

      {/* Reject reason modal — cross-platform (Alert.prompt is iOS-only) */}
      <Modal
        visible={rejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Icon name="alert-circle-outline" size={36} color={COLORS.error} />
            </View>
            <Text style={styles.modalTitle}>Reject Payment</Text>
            <Text style={styles.modalSub}>
              Payment of <Text style={{ fontFamily: FONTS.bold, color: COLORS.textDark }}>
                ₱{item?.amount}
              </Text> will be rejected and the guest will be notified.
            </Text>
            <Text style={styles.modalLabel}>Reason (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Invalid reference number"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setRejectModal(false)}
              >
                <Icon name="close" size={14} color={COLORS.textMuted} />
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnReject]}
                onPress={confirmReject}
              >
                <Icon name="close-circle" size={16} color="#fff" />
                <Text style={styles.modalBtnText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ConfirmModal config={actionConfig} />
    </View>
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
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontFamily: FONTS.display, fontWeight: '700' },

  body:  { padding: 16, paddingBottom: 100 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: RADIUS.md, marginBottom: 14,
  },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  statusText:  { flex: 1, fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold },
  statusAmount:{ fontSize: 16, fontWeight: '800', color: COLORS.textDark, fontFamily: FONTS.bold },

  card:     { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, ...SHADOW.sm, marginBottom: 16 },
  row:      { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginBottom: 2 },
  rowValue: { fontSize: 14, color: COLORS.textDark, fontFamily: FONTS.medium },

  actions:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: RADIUS.md, minWidth: 120 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONTS.bold },

  // Reject modal
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:      { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 24, ...SHADOW.md },
  modalIconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.error + '14', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 14 },
  modalTitle:    { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 6, textAlign: 'center' },
  modalSub:      { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted, marginBottom: 16, lineHeight: 18, textAlign: 'center' },
  modalLabel:    { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 },
  modalInput:    {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: 12, fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark,
    minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
  },
  modalActions:      { flexDirection: 'row', gap: 10 },
  modalBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: RADIUS.full },
  modalBtnCancel:    { backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border },
  modalBtnReject:    { backgroundColor: COLORS.error },
  modalBtnCancelText:{ fontSize: 14, fontFamily: FONTS.bold, color: COLORS.textMuted },
  modalBtnText:      { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: '#fff' },
});

export default PaymentDetailScreen;
