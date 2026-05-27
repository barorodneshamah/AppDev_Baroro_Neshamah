// src/screens/shared/ReservationDetailScreen.tsx
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
import {
  getReservation,
  approveReservation, rejectReservation,
  completeReservation, markReservationPaid,
  requestExtension,
} from '../../app/api/api';
import { addNotification } from '../../app/reducers/notifications';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';
import {
  ConfirmModal,
  ConfirmModalConfig,
  SuccessModal,
  SuccessModalConfig,
} from '../../components/AppModals';

interface Props { accentColor: string; }

const STATUS_COLOR: Record<string, string> = {
  PENDING:   COLORS.warning,
  CONFIRMED: COLORS.success,
  CANCELLED: COLORS.error,
  COMPLETED: COLORS.info,
  RESCHEDULED: '#6a1b9a',
};

const Row: FC<{ label: string; value?: any }> = ({ label, value }) =>
  value !== undefined && value !== null && value !== '' ? (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  ) : null;

const ReservationDetailScreen: FC<Props> = ({ accentColor }) => {
  const navigation  = useNavigation<any>();
  const route       = useRoute<any>();
  const dispatch    = useDispatch();
  const { id, reservation: passed } = route.params as { id: number; reservation?: any };
  const { token, data: authData }   = useSelector((state: RootState) => state.auth);

  const [item, setItem]       = useState<any>(passed ?? null);
  const [loading, setLoading] = useState(!passed);
  const [busy, setBusy]       = useState(false);
  const [actionConfig, setActionConfig] = useState<ConfirmModalConfig | null>(null);
  const [successConfig, setSuccessConfig] = useState<SuccessModalConfig | null>(null);

  // Reject modal
  const [rejectModal,  setRejectModal]  = useState(false);
  const [rejectNotes,  setRejectNotes]  = useState('');

  // Extend modal
  const [extendModal,  setExtendModal]  = useState(false);
  const [extendDate,   setExtendDate]   = useState('');
  const [extendPax,    setExtendPax]    = useState('');
  const [extendBusy,   setExtendBusy]   = useState(false);

  // Role detection
  const roles: string[] = authData?.roles ?? [];
  const isStaffOrAdmin  = roles.some(r => r === 'ROLE_STAFF' || r === 'ROLE_ADMIN');
  const currentUserId   = authData?.id ?? null;

  const isOwnReservation = !isStaffOrAdmin && (
    item?.guest?.id === currentUserId || item?.guest?.['@id']?.endsWith(`/${currentUserId}`)
  );

  // Extend Stay = rooms only (push checkout date forward)
  const canExtend =
    isOwnReservation &&
    (item?.status === 'CONFIRMED' || item?.status === 'COMPLETED') &&
    item?.serviceType === 'room';

  // Rebook / Reschedule = tours, spa, package (pick a new date)
  const canRebook =
    isOwnReservation &&
    (item?.status === 'CONFIRMED' || item?.status === 'COMPLETED') &&
    (item?.serviceType === 'tour' || item?.serviceType === 'spa' || item?.serviceType === 'package');

  useEffect(() => {
    if (passed) return;
    getReservation(id, token)
      .then(setItem)
      .catch(e => console.error('[ResDetail]', e))
      .finally(() => setLoading(false));
  }, [id, token, passed]);

  const action = async (label: string, fn: () => Promise<any>) => {
    const isPaid = label === 'Mark Paid';
    const isComplete = label === 'Complete';
    const color = isPaid ? accentColor : isComplete ? COLORS.info : COLORS.success;
    setActionConfig({
      icon:         isPaid ? 'cash-check' : isComplete ? 'flag-checkered' : 'check-circle-outline',
      iconBg:       color + '18',
      iconColor:    color,
      title:        `${label} Reservation?`,
      message:      `Confirm ${label.toLowerCase()} for this reservation?`,
      confirmLabel: label,
      cancelLabel:  'Cancel',
      onCancel:     () => setActionConfig(null),
      onConfirm:    async () => {
        setActionConfig(null);
        setBusy(true);
        try {
          await fn();
          const fresh = await getReservation(id, token);
          setItem(fresh);
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setBusy(false); }
      },
    });
  };

  const openRejectModal = () => {
    setRejectNotes('');
    setRejectModal(true);
  };

  const confirmReject = async () => {
    setRejectModal(false);
    setBusy(true);
    try {
      await rejectReservation(id, rejectNotes.trim(), token);
      const fresh = await getReservation(id, token);
      setItem(fresh);

      const total   = fresh?.totalAmount ?? item?.totalAmount ?? '0';
      const refCode = fresh?.reservationCode ?? `#${id}`;
      dispatch(addNotification({
        id:        `reservation-rejected-${id}-${Date.now()}`,
        title:     'Reservation Rejected',
        body:      `Reservation ${refCode} (₱${total}) was rejected.${rejectNotes.trim() ? ` Reason: ${rejectNotes.trim()}` : ''}`,
        type:      'reservation',
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

  const openExtendModal = () => {
    // Pre-fill with a sensible default date
    if (item?.serviceType === 'room' && item?.checkOutDate) {
      const d = new Date(item.checkOutDate);
      d.setDate(d.getDate() + 1);
      setExtendDate(d.toISOString().slice(0, 10));
    } else if ((item?.serviceType === 'tour' || item?.serviceType === 'spa') && item?.tourDate) {
      const d = new Date(item.tourDate);
      d.setDate(d.getDate() + 7);
      setExtendDate(d.toISOString().slice(0, 10));
    } else {
      setExtendDate('');
    }
    setExtendPax(String(item?.tourParticipants ?? ''));
    setExtendModal(true);
  };

  const confirmExtend = async () => {
    if (!extendDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid Date', 'Please enter the date in YYYY-MM-DD format.');
      return;
    }

    const payload: any = {};
    if (item?.serviceType === 'room') {
      payload.newCheckoutDate = extendDate;
    } else if (item?.serviceType === 'tour') {
      payload.newTourDate = extendDate;
      if (extendPax && parseInt(extendPax) > 0) payload.newParticipants = parseInt(extendPax);
    } else if (item?.serviceType === 'spa') {
      payload.newDate = extendDate;
    } else if (item?.serviceType === 'package') {
      payload.newCheckInDate  = extendDate;
      payload.newCheckOutDate = extendDate; // user can refine, admin handles details
    }

    setExtendBusy(true);
    try {
      const result = await requestExtension(id, payload, token);
      setExtendModal(false);
      setSuccessConfig({
        icon:         'calendar-check',
        iconBg:       '#e8f5e9',
        iconColor:    COLORS.success,
        title:        'Extension Requested!',
        message:      `Your extension request (${result.extensionCode}) has been submitted. Additional cost: ₱${result.additionalCost}. Pending admin approval.`,
        primaryLabel: 'Done',
        onPrimary:    () => setSuccessConfig(null),
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setExtendBusy(false);
    }
  };

  const rebookLabel = item?.serviceType === 'tour'
    ? 'Reschedule Tour'
    : item?.serviceType === 'spa'
    ? 'Reschedule Spa'
    : 'Reschedule';

  const rebookDateLabel = item?.serviceType === 'tour' ? 'New Tour Date' : 'New Date';

  const statusColor = STATUS_COLOR[item?.status] ?? COLORS.textMuted;
  const normalizedStatus = String(item?.status ?? '').toUpperCase();

  if (loading) return <ActivityIndicator color={accentColor} style={{ marginTop: 80 }} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={accentColor} />

      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item?.reservationCode ?? `Reservation #${id}`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Extension badge */}
        {item?.extensionOf && (
          <View style={styles.extensionBanner}>
            <Icon name="arrow-expand-right" size={14} color={COLORS.info} />
            <Text style={styles.extensionBannerText}>
              Extension of {item.extensionOf?.reservationCode ?? `reservation #${item.extensionOf?.id ?? ''}`}
            </Text>
          </View>
        )}

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{item?.status}</Text>
          <Text style={styles.statusAmount}>₱{item?.totalAmount ?? '0'}</Text>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <Row label="Reservation Code"  value={item?.reservationCode} />
          <Row label="Service Type"      value={item?.serviceType} />
          <Row label="Guest"             value={item?.guest?.fullName || item?.guest?.username} />
          <Row label="Contact"           value={item?.contactPhone} />
          <Row label="Guests"            value={item?.numberOfGuests} />
          <Row label="Check-in"          value={item?.checkInDate} />
          <Row label="Check-out"         value={item?.checkOutDate} />
          <Row label="Tour Date"         value={item?.tourDate} />
          <Row label="Tour Participants" value={item?.tourParticipants} />
          <Row label="Special Requests"  value={item?.specialRequests} />
          <Row label="Payment Status"    value={item?.paymentStatus} />
          <Row label="Admin Notes"       value={item?.adminNotes} />
        </View>

        {/* Staff / Admin actions */}
        {busy
          ? <ActivityIndicator color={accentColor} style={{ marginVertical: 16 }} />
          : <View style={styles.actions}>
              {!isStaffOrAdmin ? null : (
                <>
                  {normalizedStatus === 'PENDING' && (
                    <>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                        onPress={() => action('Approve', () => approveReservation(id, token))}>
                        <Icon name="check" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error }]}
                        onPress={openRejectModal}>
                        <Icon name="close" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {normalizedStatus === 'RESCHEDULED' && (
                    <>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                        onPress={() => action('Accept Reschedule', () => approveReservation(id, token))}>
                        <Icon name="calendar-check" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Accept Reschedule</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error }]}
                        onPress={openRejectModal}>
                        <Icon name="calendar-remove" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Decline Reschedule</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {normalizedStatus === 'CONFIRMED' && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.info }]}
                      onPress={() => action('Complete', () => completeReservation(id, token))}>
                      <Icon name="flag-checkered" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Mark Complete</Text>
                    </TouchableOpacity>
                  )}
                  {item?.paymentStatus === 'UNPAID' && normalizedStatus !== 'CANCELLED' && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: accentColor }]}
                      onPress={() => action('Mark Paid', () => markReservationPaid(id, token))}>
                      <Icon name="cash-check" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Mark Paid</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Guest — Extend Stay (rooms only) */}
              {canExtend && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.extendBtn]}
                  onPress={openExtendModal}
                >
                  <Icon name="calendar-plus" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Extend Stay</Text>
                </TouchableOpacity>
              )}

              {/* Guest — Rebook / Reschedule (tours, spa, package) */}
              {canRebook && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rebookBtn]}
                  onPress={openExtendModal}
                >
                  <Icon name="calendar-refresh" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>{rebookLabel}</Text>
                </TouchableOpacity>
              )}
            </View>
        }
      </ScrollView>

      {/* ── Reject notes modal ── */}
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
            <Text style={styles.modalTitle}>Reject Reservation</Text>
            <Text style={styles.modalSub}>
              Reservation{item?.reservationCode ? (
                <Text style={{ fontFamily: FONTS.bold, color: COLORS.textDark }}> {item.reservationCode}</Text>
              ) : ''} will be cancelled and the guest will be notified.
            </Text>
            <Text style={styles.modalLabel}>Notes / Reason (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectNotes}
              onChangeText={setRejectNotes}
              placeholder="e.g. Dates not available"
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

      {/* ── Extend / Rebook modal ── */}
      <Modal
        visible={extendModal}
        transparent
        animationType="slide"
        onRequestClose={() => !extendBusy && setExtendModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBox}>
            <View style={[styles.modalIconWrap, {
                backgroundColor: canExtend ? '#6d28d914' : '#0891b214',
              }]}>
              <Icon
                name={canExtend ? 'calendar-plus' : 'calendar-refresh'}
                size={36}
                color={canExtend ? '#6d28d9' : '#0891b2'}
              />
            </View>
            <Text style={styles.modalTitle}>
              {canExtend ? 'Extend Stay' : rebookLabel}
            </Text>
            <Text style={styles.modalSub}>
              {canExtend
                ? `Push the check-out date forward for `
                : `Pick a new date for `}
              <Text style={{ fontFamily: FONTS.bold, color: COLORS.textDark }}>
                {item?.reservationCode}
              </Text>
              {canExtend && item?.checkOutDate
                ? `.\nCurrent checkout: ${item.checkOutDate}`
                : item?.tourDate
                ? `.\nCurrent date: ${item.tourDate}`
                : '.'}
            </Text>

            <Text style={styles.modalLabel}>
              {canExtend ? 'New Checkout Date' : rebookDateLabel} (YYYY-MM-DD)
            </Text>
            <TextInput
              style={styles.modalInput}
              value={extendDate}
              onChangeText={setExtendDate}
              placeholder="e.g. 2026-06-15"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              autoFocus
            />

            {item?.serviceType === 'tour' && (
              <>
                <Text style={styles.modalLabel}>Participants (optional)</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 0, height: 48 }]}
                  value={extendPax}
                  onChangeText={setExtendPax}
                  placeholder={String(item?.tourParticipants ?? 1)}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </>
            )}

            <View style={styles.noteBox}>
              <Icon name="information-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.noteText}>
                Your request will be reviewed by our team. You'll be notified once approved.
                Additional charges may apply.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setExtendModal(false)}
                disabled={extendBusy}
              >
                <Icon name="close" size={14} color={COLORS.textMuted} />
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: accentColor }]}
                onPress={confirmExtend}
                disabled={extendBusy}
              >
                {extendBusy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Icon name="send" size={16} color="#fff" />
                      <Text style={styles.modalBtnText}>Submit Request</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ConfirmModal config={actionConfig} />
      <SuccessModal config={successConfig} />
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

  body: { padding: 16, paddingBottom: 100 },

  extensionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.info + '14', borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  extensionBannerText: { fontSize: 12, color: COLORS.info, fontFamily: FONTS.medium },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: RADIUS.md, marginBottom: 14,
  },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  statusText:  { flex: 1, fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold },
  statusAmount:{ fontSize: 16, fontWeight: '800', color: COLORS.textDark, fontFamily: FONTS.bold },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, ...SHADOW.sm, marginBottom: 16 },
  row:  { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginBottom: 2 },
  rowValue: { fontSize: 14, color: COLORS.textDark, fontFamily: FONTS.medium },

  actions:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: RADIUS.md, minWidth: 120 },
  actionBtnText:{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONTS.bold },
  extendBtn:    { backgroundColor: '#6d28d9' },
  rebookBtn:    { backgroundColor: '#0e7490' },

  // Shared modal styles
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
    minHeight: 80, textAlignVertical: 'top', marginBottom: 14,
  },
  noteBox:  { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: COLORS.background, borderRadius: RADIUS.sm, padding: 10, marginBottom: 20 },
  noteText: { flex: 1, fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, lineHeight: 16 },
  modalActions:      { flexDirection: 'row', gap: 10 },
  modalBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: RADIUS.full },
  modalBtnCancel:    { backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border },
  modalBtnReject:    { backgroundColor: COLORS.error },
  modalBtnCancelText:{ fontSize: 14, fontFamily: FONTS.bold, color: COLORS.textMuted },
  modalBtnText:      { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: '#fff' },
});

export default ReservationDetailScreen;
