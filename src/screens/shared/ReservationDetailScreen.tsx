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
} from '../../app/api/api';
import { addNotification } from '../../app/reducers/notifications';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';

interface Props { accentColor: string; }

const STATUS_COLOR: Record<string, string> = {
  PENDING:   COLORS.warning,
  CONFIRMED: COLORS.success,
  CANCELLED: COLORS.error,
  COMPLETED: COLORS.info,
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
  const { token }   = useSelector((state: RootState) => state.auth);

  const [item, setItem]       = useState<any>(passed ?? null);
  const [loading, setLoading] = useState(!passed);
  const [busy, setBusy]       = useState(false);

  // Reject modal
  const [rejectModal,  setRejectModal]  = useState(false);
  const [rejectNotes,  setRejectNotes]  = useState('');

  useEffect(() => {
    if (passed) return;
    getReservation(id, token)
      .then(setItem)
      .catch(e => console.error('[ResDetail]', e))
      .finally(() => setLoading(false));
  }, [id, token, passed]);

  const action = async (label: string, fn: () => Promise<any>) => {
    Alert.alert(label, `Confirm: ${label} this reservation?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label, onPress: async () => {
          setBusy(true);
          try {
            await fn();
            const fresh = await getReservation(id, token);
            setItem(fresh);
          } catch (e: any) { Alert.alert('Error', e.message); }
          finally { setBusy(false); }
        },
      },
    ]);
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

  const statusColor = STATUS_COLOR[item?.status] ?? COLORS.textMuted;

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

        {/* Actions */}
        {busy
          ? <ActivityIndicator color={accentColor} style={{ marginVertical: 16 }} />
          : <View style={styles.actions}>
              {item?.status === 'PENDING' && (
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
              {item?.status === 'CONFIRMED' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.info }]}
                  onPress={() => action('Complete', () => completeReservation(id, token))}>
                  <Icon name="flag-checkered" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Mark Complete</Text>
                </TouchableOpacity>
              )}
              {item?.paymentStatus === 'UNPAID' && item?.status !== 'CANCELLED' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: accentColor }]}
                  onPress={() => action('Mark Paid', () => markReservationPaid(id, token))}>
                  <Icon name="cash-check" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Mark Paid</Text>
                </TouchableOpacity>
              )}
            </View>
        }
      </ScrollView>

      {/* Reject notes modal — cross-platform (Alert.prompt is iOS-only) */}
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
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.error }]}
                onPress={confirmReject}
              >
                <Icon name="close" size={15} color="#fff" />
                <Text style={styles.modalBtnText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // Reject modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:     { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 24, ...SHADOW.md },
  modalTitle:   { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 },
  modalSub:     { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted, marginBottom: 16, lineHeight: 18 },
  modalLabel:   { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 },
  modalInput:   {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12, fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark,
    minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
  },
  modalActions:      { flexDirection: 'row', gap: 10 },
  modalBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, borderRadius: RADIUS.md },
  modalBtnCancel:    { backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  modalBtnCancelText:{ fontSize: 14, fontFamily: FONTS.bold, color: COLORS.textMuted },
  modalBtnText:      { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: '#fff' },
});

export default ReservationDetailScreen;