// src/screens/BookingsScreen.tsx
import React, { FC, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
  ScrollView, Platform, KeyboardAvoidingView, StatusBar, Dimensions,
  PermissionsAndroid, Image,
} from 'react-native';
import { SuccessModal, SuccessModalConfig } from '../components/AppModals';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Calendar, DateData } from 'react-native-calendars';
import {
  getRooms, getTours, getPackages, getReservations, getPayments,
  createReservation, getMercureToken, submitPayment, getSpaServices,
  createWallPost, uploadWallImage, getMyWallPosts, rescheduleReservation as apiReschedule,
  isAuthError,
} from '../app/api/api';
import { userLogout } from '../app/reducers/auth';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';
import { addNotification } from '../app/reducers/notifications';
import { markReservationShared, setSharedReservationIds, markReservationRescheduled } from '../app/reducers/wall';
import API_BASE_URL from '../config/api.config';

const UPLOAD_DIR: Record<string, string> = {
  room: 'uploads/rooms', tour: 'uploads/tours', food: 'uploads/foods',
  package: 'uploads/packages', spa: 'uploads/spas',
};

const resolveImg = (path?: string | null, seed = 'item', type?: string): string => {
  if (!path) return `https://picsum.photos/seed/${seed}/600/400`;
  if (path.startsWith('http')) {
    return path.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, API_BASE_URL);
  }
  if (path.startsWith('/')) return `${API_BASE_URL}${path}`;
  if (path.startsWith('uploads/')) return `${API_BASE_URL}/${path}`;
  if (type && UPLOAD_DIR[type]) return `${API_BASE_URL}/${UPLOAD_DIR[type]}/${path}`;
  return `${API_BASE_URL}/uploads/${path}`;
};

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceItem { id: number; name: string; price: number; }

interface Reservation {
  id: number;
  reservationCode?: string;
  serviceType: string;
  status: string;
  paymentStatus: string;
  totalAmount?: number;
  checkInDate?: string;
  checkOutDate?: string;
  tourDate?: string;
  numberOfGuests?: number;
  tourParticipants?: number;
  specialRequests?: string;
  createdAt: string;
}

type ServiceType = 'room' | 'tour' | 'package' | 'spa';
type Step        = 'pick_type' | 'pick_item' | 'fill_form';
type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL',         label: 'All' },
  { key: 'PENDING',     label: 'Pending' },
  { key: 'CONFIRMED',   label: 'Confirmed' },
  { key: 'COMPLETED',   label: 'Completed' },
  { key: 'RESCHEDULED', label: 'Rescheduled' },
  { key: 'CANCELLED',   label: 'Cancelled' },
];

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  room:    { icon: 'bed',                   color: '#1565c0', label: 'Room' },
  tour:    { icon: 'map-marker-path',       color: '#2e7d32', label: 'Tour' },
  package: { icon: 'gift',                  color: '#6a1b9a', label: 'Package' },
  food:    { icon: 'silverware-fork-knife', color: '#e65100', label: 'Dining' },
  spa:     { icon: 'spa',                   color: '#ad1457', label: 'Spa' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusColor = (s: string) => {
  switch (s?.toUpperCase()) {
    case 'CONFIRMED':   return '#2e7d32';
    case 'PENDING':     return '#f57f17';
    case 'CANCELLED':   return '#c62828';
    case 'COMPLETED':   return '#1565c0';
    case 'RESCHEDULED': return '#6a1b9a';
    default:            return COLORS.textMuted;
  }
};

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0, CONFIRMED: 1, RESCHEDULED: 2, COMPLETED: 3, CANCELLED: 4,
};

const paymentColor = (s: string) => {
  switch (s?.toUpperCase()) {
    case 'PAID':    return '#2e7d32';
    case 'PARTIAL': return '#f57f17';
    default:        return '#c62828';
  }
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Mercure SSE ──────────────────────────────────────────────────────────────

const subscribeToMercure = (hubUrl: string, mercureToken: string, onUpdate: () => void) => {
  const url = new URL(hubUrl);
  url.searchParams.append('topic', '/topic/reservations');
  url.searchParams.append('authorization', mercureToken);
  const controller = new AbortController();
  const connect = () => {
    (fetch(url.toString(), { signal: controller.signal, headers: { Accept: 'text/event-stream' } }) as Promise<any>)
      .then(async (res: any) => {
        if (!res.body) return;
        const reader = res.body.getReader();
        let buffer = '';
        while (true) {
          const { done, value }: { done: boolean; value: Uint8Array } = await reader.read();
          if (done) break;
          buffer += (value as Uint8Array).reduce((s: string, b: number) => s + String.fromCharCode(b), '');
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) { if (line.startsWith('data: ')) { onUpdate(); break; } }
        }
        if (!controller.signal.aborted) setTimeout(connect, 3_000);
      })
      .catch(() => { if (!controller.signal.aborted) setTimeout(connect, 5_000); });
  };
  connect();
  return () => controller.abort();
};

// ─── Calendar Modal ───────────────────────────────────────────────────────────

type CalendarMode = 'single' | 'range';

interface CalendarModalProps {
  visible: boolean;
  mode: CalendarMode;
  title: string;
  // single mode
  value?: string;
  onSelect?: (date: string) => void;
  // range mode
  startDate?: string;
  endDate?: string;
  onRangeSelect?: (start: string, end: string) => void;
  onClose: () => void;
  minDate?: string;
}

const toMarked = (start: string, end: string) => {
  const marked: Record<string, any> = {};
  if (!start) return marked;

  marked[start] = {
    startingDay: true,
    color: COLORS.primary,
    textColor: '#fff',
  };

  if (!end || end === start) {
    marked[start] = { selected: true, selectedColor: COLORS.primary };
    return marked;
  }

  // fill days between
  const s = new Date(start);
  const e = new Date(end);
  const cur = new Date(s);
  cur.setDate(cur.getDate() + 1);
  while (cur < e) {
    const key = cur.toISOString().split('T')[0];
    marked[key] = { color: COLORS.primary + '33', textColor: COLORS.primary };
    cur.setDate(cur.getDate() + 1);
  }
  marked[end] = { endingDay: true, color: COLORS.primary, textColor: '#fff' };
  return marked;
};

const CalendarModal: FC<CalendarModalProps> = ({
  visible, mode, title, value, onSelect,
  startDate, endDate, onRangeSelect, onClose, minDate,
}) => {
  const [rangeStart, setRangeStart] = useState(startDate ?? '');
  const [rangeEnd,   setRangeEnd]   = useState(endDate ?? '');
  const [picking,    setPicking]    = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (visible) {
      setRangeStart(startDate ?? '');
      setRangeEnd(endDate ?? '');
      setPicking('start');
    }
  }, [visible, startDate, endDate]);

  const markedDates = useMemo(() => {
    if (mode === 'single' && value) return { [value]: { selected: true, selectedColor: COLORS.primary } };
    return toMarked(rangeStart, rangeEnd);
  }, [mode, value, rangeStart, rangeEnd]);

  const onDayPress = (day: DateData) => {
    if (mode === 'single') {
      onSelect?.(day.dateString);
      onClose();
      return;
    }
    // range mode
    if (picking === 'start' || (rangeStart && day.dateString < rangeStart)) {
      setRangeStart(day.dateString);
      setRangeEnd('');
      setPicking('end');
    } else {
      setRangeEnd(day.dateString);
      setPicking('start');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={calStyles.container}>
        {/* Header */}
        <View style={calStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={calStyles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={calStyles.title}>{title}</Text>
          {mode === 'range' ? (
            <TouchableOpacity
              onPress={() => {
                if (rangeStart && rangeEnd) {
                  onRangeSelect?.(rangeStart, rangeEnd);
                  onClose();
                } else {
                  Alert.alert('Select both dates', 'Please pick a check-in and check-out date.');
                }
              }}
            >
              <Text style={calStyles.done}>Done</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>

        {/* Range hint */}
        {mode === 'range' && (
          <View style={calStyles.rangeRow}>
            <View style={[calStyles.rangeChip, picking === 'start' && calStyles.rangeChipActive]}>
              <Icon name="login" size={14} color={picking === 'start' ? '#fff' : COLORS.textMuted} />
              <Text style={[calStyles.rangeChipText, picking === 'start' && calStyles.rangeChipTextActive]}>
                {rangeStart ? rangeStart : 'Check-in'}
              </Text>
            </View>
            <Icon name="arrow-right" size={16} color={COLORS.textMuted} />
            <View style={[calStyles.rangeChip, picking === 'end' && calStyles.rangeChipActive]}>
              <Icon name="logout" size={14} color={picking === 'end' ? '#fff' : COLORS.textMuted} />
              <Text style={[calStyles.rangeChipText, picking === 'end' && calStyles.rangeChipTextActive]}>
                {rangeEnd ? rangeEnd : 'Check-out'}
              </Text>
            </View>
          </View>
        )}

        <Calendar
          onDayPress={onDayPress}
          {...{ markingType: mode === 'range' ? 'period' : 'dot' }}
          markedDates={markedDates}
          minDate={minDate ?? today}
          enableSwipeMonths
          renderArrow={(direction: 'left' | 'right') => (
            <Icon
              name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
              size={22}
              color={COLORS.primary}
            />
          )}
          theme={{
            todayTextColor:          COLORS.primary,
            arrowColor:              COLORS.primary,
            selectedDayBackgroundColor: COLORS.primary,
            selectedDayTextColor:    '#fff',
            dotColor:                COLORS.primary,
            textDayFontFamily:       FONTS.body,
            textMonthFontFamily:     FONTS.bold,
            textDayHeaderFontFamily: FONTS.bold,
            monthTextColor:          COLORS.textDark,
            dayTextColor:            COLORS.textDark,
            textDisabledColor:       COLORS.border,
            calendarBackground:      COLORS.surface,
          }}
          style={calStyles.calendar}
        />
      </View>
    </Modal>
  );
};

const calStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'ios' ? 56 : SPACING.md,
  },
  title:  { fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  cancel: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body, width: 60 },
  done:   { fontSize: 14, color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700', width: 50, textAlign: 'right' },
  rangeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.md, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rangeChip:          { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  rangeChipActive:    { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  rangeChipText:      { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '600', color: COLORS.textMuted },
  rangeChipTextActive:{ color: '#fff' },
  calendar: { marginTop: SPACING.sm },
});

// ─── Date Field ───────────────────────────────────────────────────────────────

const DateField: FC<{
  label: string;
  value: string;          // already-formatted display string OR raw ISO date for single
  placeholder: string;
  icon: string;
  isSingle?: boolean;     // if true, format as long date
  onPress: () => void;
}> = ({ label, value, placeholder, icon, isSingle, onPress }) => {
  const display = value
    ? isSingle
      ? new Date(value).toLocaleDateString('en-PH', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
      : value
    : placeholder;

  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.dateField} onPress={onPress} activeOpacity={0.75}>
        <Icon name={icon} size={18} color={value ? COLORS.primary : COLORS.textMuted} />
        <Text style={[styles.dateFieldText, !value && styles.dateFieldPlaceholder]} numberOfLines={1}>
          {display}
        </Text>
        <Icon name="chevron-down" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

// ─── Filter Pill ──────────────────────────────────────────────────────────────

const StatCard: FC<{ label: string; count: number; color: string; icon: string; active: boolean; onPress: () => void }> =
  ({ label, count, icon, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterPill, active && styles.filterPillActive]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Icon name={icon} size={13} color={active ? '#fff' : COLORS.textMuted} />
    <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{label}</Text>
    <View style={[styles.filterPillBadge, active && styles.filterPillBadgeActive]}>
      <Text style={styles.filterPillBadgeText}>{count}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Reservation Card ─────────────────────────────────────────────────────────

const ReservationCard: FC<{ item: Reservation; onPay: (r: Reservation) => void; onShare: (r: Reservation) => void; onReschedule: (r: Reservation) => void; payments: any[]; isShared: boolean; isRescheduled: boolean }> = ({ item, onPay, onShare, onReschedule, payments, isShared, isRescheduled }) => {
  const meta    = TYPE_META[item.serviceType] ?? TYPE_META.room;
  const sColor  = statusColor(item.status);
  const pColor  = paymentColor(item.paymentStatus);
  const dateLabel = item.serviceType === 'tour' ? 'Tour date' : 'Check-in';
  const date      = item.serviceType === 'tour' ? item.tourDate : item.checkInDate;
  const guests    = item.serviceType === 'tour' ? item.tourParticipants : item.numberOfGuests;

  const resIRI         = `/api/reservations/${item.id}`;
  const resPayments    = payments.filter(p => p.reservation === resIRI || p.reservation?.id === item.id);
  const hasPending     = resPayments.some(p => p.status === 'PENDING');
  const hasRejected    = resPayments.some(p => (p.status === 'REJECTED' || p.status === 'CANCELLED'));
  const latestRejected = resPayments.find(p => p.status === 'REJECTED' || p.status === 'CANCELLED');

  return (
    <View style={styles.card}>
      {/* Left accent */}
      <View style={[styles.cardAccent, { backgroundColor: meta.color }]} />

      <View style={styles.cardInner}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={[styles.cardIconWrap, { backgroundColor: meta.color + '15' }]}>
            <Icon name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={styles.cardType}>{meta.label}</Text>
            {item.reservationCode ? (
              <Text style={styles.cardCode}>#{item.reservationCode}</Text>
            ) : (
              <Text style={styles.cardCode}>REF-{item.id}</Text>
            )}
          </View>
          {/* Status pill */}
          <View style={[styles.statusPill, { backgroundColor: sColor + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: sColor }]} />
            <Text style={[styles.statusText, { color: sColor }]}>{item.status}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Info rows */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Icon name="calendar" size={13} color={COLORS.textMuted} />
            <View>
              <Text style={styles.infoLabel}>{dateLabel}</Text>
              <Text style={styles.infoValue}>{formatDate(date)}</Text>
            </View>
          </View>
          {item.checkOutDate && item.serviceType !== 'tour' && (
            <View style={styles.infoCell}>
              <Icon name="calendar-check" size={13} color={COLORS.textMuted} />
              <View>
                <Text style={styles.infoLabel}>Check-out</Text>
                <Text style={styles.infoValue}>{formatDate(item.checkOutDate)}</Text>
              </View>
            </View>
          )}
          {guests ? (
            <View style={styles.infoCell}>
              <Icon name="account-group" size={13} color={COLORS.textMuted} />
              <View>
                <Text style={styles.infoLabel}>Guests</Text>
                <Text style={styles.infoValue}>{guests} pax</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.infoCell}>
            <Icon name="clock-outline" size={13} color={COLORS.textMuted} />
            <View>
              <Text style={styles.infoLabel}>Booked</Text>
              <Text style={styles.infoValue}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          {hasRejected ? (
            <View style={[styles.payPill, { backgroundColor: '#c6282815' }]}>
              <Icon name="close-circle-outline" size={11} color="#c62828" />
              <Text style={[styles.payText, { color: '#c62828' }]}>Payment Rejected</Text>
            </View>
          ) : hasPending ? (
            <View style={[styles.payPill, { backgroundColor: '#f57f1715' }]}>
              <Icon name="clock-outline" size={11} color="#f57f17" />
              <Text style={[styles.payText, { color: '#f57f17' }]}>Under Review</Text>
            </View>
          ) : (
            <View style={[styles.payPill, { backgroundColor: pColor + '18' }]}>
              <Icon name={item.paymentStatus?.toUpperCase() === 'PAID' ? 'check-circle' : 'clock-outline'} size={11} color={pColor} />
              <Text style={[styles.payText, { color: pColor }]}>
                {item.paymentStatus || 'UNPAID'}
              </Text>
            </View>
          )}
          <Text style={styles.cardAmount}>
            {item.totalAmount ? `₱${Number(item.totalAmount).toLocaleString()}` : '—'}
          </Text>
        </View>

        {/* Rejection reason banner */}
        {hasRejected && latestRejected?.rejectionReason ? (
          <View style={styles.rejectionBanner}>
            <Icon name="information-outline" size={13} color="#c62828" />
            <Text style={styles.rejectionText} numberOfLines={2}>{latestRejected.rejectionReason}</Text>
          </View>
        ) : null}

        {/* Pay Now — hide while a payment is pending; show if rejected so they can resubmit */}
        {item.paymentStatus?.toUpperCase() !== 'PAID' && item.status?.toUpperCase() !== 'CANCELLED' && !hasPending && (
          <TouchableOpacity style={styles.payNowBtn} onPress={() => onPay(item)} activeOpacity={0.85}>
            <Icon name="credit-card-outline" size={15} color="#fff" />
            <Text style={styles.payNowText}>{hasRejected ? 'Resubmit Payment' : 'Pay Now'}</Text>
          </TouchableOpacity>
        )}

        {/* Reschedule action — available for pending / confirmed, only if not already rescheduled */}
        {(item.status?.toUpperCase() === 'PENDING' || item.status?.toUpperCase() === 'CONFIRMED') && !isRescheduled && (
          <TouchableOpacity style={styles.rescheduleBtn} onPress={() => onReschedule(item)} activeOpacity={0.85}>
            <Icon name="calendar-edit" size={15} color="#00838f" />
            <Text style={styles.rescheduleBtnText}>Request Reschedule</Text>
          </TouchableOpacity>
        )}

        {/* Rescheduled banner — shown when locally tracked OR backend status is RESCHEDULED */}
        {isRescheduled && (
          <View style={styles.rescheduledBanner}>
            <Icon name="calendar-clock" size={14} color="#6a1b9a" />
            <Text style={styles.rescheduledBannerText}>Reschedule Requested — Awaiting Confirmation</Text>
          </View>
        )}

        {/* Share Experience — shown only on completed, not-yet-shared reservations */}
        {item.status?.toUpperCase() === 'COMPLETED' && (
          isShared ? (
            <View style={styles.sharedBadge}>
              <Icon name="check-circle" size={15} color={COLORS.success} />
              <Text style={styles.sharedBadgeText}>Experience Shared</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.shareExpBtn} onPress={() => onShare(item)} activeOpacity={0.85}>
              <Icon name="star-outline" size={15} color={COLORS.primary} />
              <Text style={styles.shareExpText}>Rate & Share Experience</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: FC<{ filter: StatusFilter; onBook: () => void }> = ({ filter, onBook }) => (
  <View style={styles.emptyWrap}>
    <Icon name="calendar-blank-outline" size={64} color={COLORS.border} />
    <Text style={styles.emptyTitle}>
      {filter === 'ALL' ? 'No reservations yet' : `No ${filter.toLowerCase()} reservations`}
    </Text>
    <Text style={styles.emptySub}>
      {filter === 'ALL' ? 'Start by booking a room, tour, or package.' : 'Try a different filter.'}
    </Text>
    {filter === 'ALL' && (
      <TouchableOpacity style={styles.emptyBtn} onPress={onBook} activeOpacity={0.85}>
        <Icon name="plus" size={16} color="#fff" />
        <Text style={styles.emptyBtnText}>Book Now</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const BookingsScreen: FC = () => {
  const { data, token } = useSelector((state: any) => state.auth);
  const sharedReservationIds: number[]     = useSelector((state: any) => state.wall.sharedReservationIds);
  const rescheduledReservationIds: number[] = useSelector((state: any) => state.wall.rescheduledReservationIds);
  const userId: number  = data?.user?.id ?? data?.id ?? 0;
  const route           = useRoute<RouteProp<any>>();
  const dispatch        = useDispatch();
  const prevReservationsRef = useRef<Reservation[]>([]);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments,     setPayments]     = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');

  // Booking modal
  const [modalOpen,     setModalOpen]     = useState(false);
  const [step,          setStep]          = useState<Step>('pick_type');
  const [serviceType,   setServiceType]   = useState<ServiceType>('room');
  const [items,         setItems]         = useState<any[]>([]);
  const [itemsLoading,  setItemsLoading]  = useState(false);
  const [selectedItem,  setSelectedItem]  = useState<ServiceItem | null>(null);
  const [checkIn,       setCheckIn]       = useState('');
  const [checkOut,      setCheckOut]      = useState('');
  const [tourDate,      setTourDate]      = useState('');
  const [guests,        setGuests]        = useState('2');
  const [phone,         setPhone]         = useState('');
  const [specialReqs,   setSpecialReqs]   = useState('');
  const [submitting,    setSubmitting]    = useState(false);

  // Calendar modal state
  const [calVisible,    setCalVisible]    = useState(false);
  const [calMode,       setCalMode]       = useState<'single' | 'range'>('single');
  const [calTitle,      setCalTitle]      = useState('');
  const [calContext,    setCalContext]     = useState<'booking' | 'reschedule'>('booking');

  // Payment modal
  const [payModal,       setPayModal]       = useState(false);
  const [payReservation, setPayReservation] = useState<Reservation | null>(null);
  const [payMethod,      setPayMethod]      = useState('GCASH');
  const [payAmount,      setPayAmount]      = useState('');
  const [payRef,         setPayRef]         = useState('');
  const [payNotes,       setPayNotes]       = useState('');
  const [paying,         setPaying]         = useState(false);

  // Share Experience modal
  const [shareModal,           setShareModal]           = useState(false);
  const [shareReservation,     setShareReservation]     = useState<Reservation | null>(null);
  const [shareRating,          setShareRating]          = useState(5);
  const [shareCaption,         setShareCaption]         = useState('');
  const [shareImage,           setShareImage]           = useState('');
  const [shareFromGallery,     setShareFromGallery]     = useState(false);
  const [shareGalleryMeta,     setShareGalleryMeta]     = useState<{ fileName: string; mimeType: string } | null>(null);
  const [shareSubmitting,      setShareSubmitting]      = useState(false);
  // Success modal
  const [successConfig, setSuccessConfig] = useState<SuccessModalConfig | null>(null);

  // Reschedule modal
  const [rescheduleModal,       setRescheduleModal]       = useState(false);
  const [rescheduleReservation, setRescheduleReservation] = useState<Reservation | null>(null);
  const [rescheduleCheckIn,     setRescheduleCheckIn]     = useState('');
  const [rescheduleCheckOut,    setRescheduleCheckOut]    = useState('');
  const [rescheduleTourDate,    setRescheduleTourDate]    = useState('');
  const [rescheduling,          setRescheduling]          = useState(false);

  // ─── Preselect from ServiceDetailScreen ──────────────────────────────────

  useEffect(() => {
    const preselect = route.params?.preselect;
    if (preselect?.item && preselect?.type) {
      setServiceType(preselect.type as ServiceType);
      setSelectedItem({
        id:    preselect.item.id,
        name:  preselect.item.name || preselect.item.roomNumber,
        price: Number(preselect.item.pricePerNight || preselect.item.packagePrice || preselect.item.price || 0),
      });
      setStep('fill_form');
      setModalOpen(true);
    }
  }, [route.params?.preselect]);

  // ─── Rebuild sharedReservationIds from server on mount ───────────────────

  useEffect(() => {
    if (!token || !userId) return;
    getMyWallPosts(token)
      .then((res: any) => {
        const posts: any[] = res?.posts ?? [];
        const ids = posts
          .filter((p: any) => p.reservationId != null)
          .map((p: any) => Number(p.reservationId));
        dispatch(setSharedReservationIds(ids));
      })
      .catch(() => {});
  }, [token, userId, dispatch]);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchReservations = useCallback(async () => {
    try {
      const pick = (r: any): any[] =>
        r?.['hydra:member'] ?? r?.member ?? r?.data ?? (Array.isArray(r) ? r : []);
      const [resRes, payRes] = await Promise.all([
        getReservations(token),
        getPayments(token),
      ]);
      const members = pick(resRes);
      const pays    = pick(payRes);
      console.log('[Bookings] reservations:', members.length, 'payments:', pays.length);

      // Dispatch in-app notification for any status changes since last fetch
      if (prevReservationsRef.current.length > 0) {
        members.forEach((newRes: any) => {
          const old = prevReservationsRef.current.find(r => r.id === newRes.id);
          if (old && old.status !== newRes.status) {
            dispatch(addNotification({
              id:        `status-${newRes.id}-${newRes.status}`,
              title:     'Booking Status Updated',
              body:      `Your ${newRes.serviceType || 'reservation'} booking is now ${(newRes.status || '').toLowerCase()}.`,
              type:      'booking',
              read:      false,
              createdAt: new Date().toISOString(),
            }));
          }
        });
      }
      prevReservationsRef.current = members;

      setReservations(members);
      setPayments(pays);
    } catch (e: any) {
      console.error('[Bookings] fetch error:', e.message);
      setReservations([]);
    }
  }, [token, dispatch]);

  useEffect(() => {
    setLoading(true);
    fetchReservations().finally(() => setLoading(false));

    let cleanup: (() => void) | undefined;
    getMercureToken(token)
      .then((res: any) => { cleanup = subscribeToMercure(res.hubUrl, res.token, fetchReservations); })
      .catch(() => { const p = setInterval(fetchReservations, 30_000); cleanup = () => clearInterval(p); });

    return () => cleanup?.();
  }, [fetchReservations, token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  }, [fetchReservations]);

  // ─── Stats ────────────────────────────────────────────────────────────────

  const isRescheduledItem = useCallback((r: Reservation) =>
    r.status?.toUpperCase() === 'RESCHEDULED' || rescheduledReservationIds.includes(r.id),
  [rescheduledReservationIds]);

  // A reservation still needs attention if:
  // • reservation status is PENDING (admin hasn't approved yet), OR
  // • payment is UNPAID and the booking isn't done/cancelled, OR
  // • customer submitted a payment that admin hasn't approved yet
  const isPendingAction = useCallback((r: Reservation): boolean => {
    const s = r.status?.toUpperCase();
    if (s === 'CANCELLED' || s === 'COMPLETED' || isRescheduledItem(r)) return false;
    if (s === 'PENDING') return true;
    if (r.paymentStatus?.toUpperCase() === 'UNPAID') return true;
    const resIRI = `/api/reservations/${r.id}`;
    const rPays = payments.filter(p => p.reservation === resIRI || p.reservation?.id === r.id);
    return rPays.some(p => p.status === 'PENDING');
  }, [payments, isRescheduledItem]);

  const stats = useMemo(() => ({
    total:       reservations.length,
    pending:     reservations.filter(r => isPendingAction(r)).length,
    confirmed:   reservations.filter(r => r.status?.toUpperCase() === 'CONFIRMED' && !isPendingAction(r) && !isRescheduledItem(r)).length,
    completed:   reservations.filter(r => r.status?.toUpperCase() === 'COMPLETED').length,
    rescheduled: reservations.filter(r => isRescheduledItem(r)).length,
    cancelled:   reservations.filter(r => r.status?.toUpperCase() === 'CANCELLED').length,
  }), [reservations, isPendingAction, isRescheduledItem]);

  const filtered = useMemo(() => {
    let list: Reservation[];
    if (activeFilter === 'ALL') {
      list = [...reservations];
    } else if (activeFilter === 'RESCHEDULED') {
      list = reservations.filter(r => isRescheduledItem(r));
    } else if (activeFilter === 'PENDING') {
      list = reservations.filter(r => isPendingAction(r));
    } else if (activeFilter === 'CONFIRMED') {
      list = reservations.filter(r => r.status?.toUpperCase() === 'CONFIRMED' && !isPendingAction(r) && !isRescheduledItem(r));
    } else {
      list = reservations.filter(r => r.status?.toUpperCase() === activeFilter);
    }
    return list.sort((a, b) => {
      const oa = isRescheduledItem(a) ? STATUS_ORDER.RESCHEDULED
               : isPendingAction(a)   ? STATUS_ORDER.PENDING
               : (STATUS_ORDER[a.status?.toUpperCase()] ?? 99);
      const ob = isRescheduledItem(b) ? STATUS_ORDER.RESCHEDULED
               : isPendingAction(b)   ? STATUS_ORDER.PENDING
               : (STATUS_ORDER[b.status?.toUpperCase()] ?? 99);
      return oa - ob;
    });
  }, [reservations, activeFilter, isPendingAction, isRescheduledItem]);

  // ─── Booking modal helpers ────────────────────────────────────────────────

  const openCalendar = (mode: 'single' | 'range', title: string) => {
    setCalContext('booking');
    setCalMode(mode);
    setCalTitle(title);
    setCalVisible(true);
  };

  const openBooking = () => {
    setStep('pick_type'); setServiceType('room'); setSelectedItem(null);
    setCheckIn(''); setCheckOut(''); setTourDate('');
    setGuests('2'); setPhone(''); setSpecialReqs('');
    setModalOpen(true);
  };

  const loadItems = async (type: ServiceType) => {
    setItemsLoading(true); setItems([]);
    try {
      let res: any;
      if (type === 'room')         res = await getRooms(token);
      else if (type === 'tour')    res = await getTours(token);
      else if (type === 'spa')     res = await getSpaServices(token);
      else                         res = await getPackages(token);
      const raw: any[] = res?.['hydra:member'] ?? res?.member ?? res?.data ?? (Array.isArray(res) ? res : []);
      setItems(raw.map(r => ({
        ...r,
        name:  r.name || r.roomNumber || r.title || `Item ${r.id}`,
        price: Number(r.pricePerNight || r.packagePrice || r.price || 0),
      })));
    } catch { setItems([]); }
    finally { setItemsLoading(false); }
  };

  const selectType = (type: ServiceType) => { setServiceType(type); setStep('pick_item'); loadItems(type); };
  const selectItem = (item: ServiceItem) => { setSelectedItem(item); setStep('fill_form'); };

  const submit = async () => {
    if (!selectedItem) return;
    if (serviceType === 'tour') {
      if (!tourDate || !phone) { Alert.alert('Missing fields', 'Tour date and phone are required.'); return; }
    } else {
      if (!checkIn || !checkOut || !phone) { Alert.alert('Missing fields', 'Check-in, check-out, and phone are required.'); return; }
    }
    setSubmitting(true);
    try {
      const payload: any = {
        serviceType,
        numberOfGuests:  parseInt(guests, 10) || 1,
        contactPhone:    phone,
        specialRequests: specialReqs,
      };
      if (userId > 0) payload.guest = `/api/users/${userId}`;
      if (serviceType === 'room') {
        payload.room         = `/api/rooms/${selectedItem.id}`;
        payload.checkInDate  = checkIn;
        payload.checkOutDate = checkOut;
      } else if (serviceType === 'tour') {
        payload.tour             = `/api/tours/${selectedItem.id}`;
        payload.tourDate         = tourDate;
        payload.tourParticipants = parseInt(guests, 10) || 1;
      } else if (serviceType === 'spa') {
        payload.spa          = `/api/spas/${selectedItem.id}`;
        payload.checkInDate  = checkIn;
        payload.checkOutDate = checkOut;
      } else {
        payload.package      = `/api/packages/${selectedItem.id}`;
        payload.checkInDate  = checkIn;
        payload.checkOutDate = checkOut;
      }
      await createReservation(payload, token);
      dispatch(addNotification({
        id:        `booking-${Date.now()}`,
        title:     'Booking Submitted!',
        body:      `Your ${serviceType} reservation is pending confirmation. We'll notify you when it's reviewed.`,
        type:      'booking',
        read:      false,
        createdAt: new Date().toISOString(),
      }));
      setModalOpen(false);
      setSuccessConfig({
        icon:           'calendar-check',
        iconBg:         '#e8f5e9',
        iconColor:      '#2e7d32',
        title:          'Booking Submitted!',
        message:        `Your ${serviceType} reservation is pending confirmation. We'll notify you as soon as it's reviewed.`,
        primaryLabel:   'View My Bookings',
        onPrimary:      () => setSuccessConfig(null),
        secondaryLabel: 'Book Another',
        onSecondary:    () => { setSuccessConfig(null); openBooking(); },
      });
      fetchReservations();
    } catch (e: any) {
      if (isAuthError(e)) {
        dispatch(userLogout());
        Alert.alert('Session expired', 'Please log in again to continue.');
        return;
      }
      Alert.alert('Error', e.message ?? 'Could not submit booking.');
    } finally { setSubmitting(false); }
  };

  // ─── Share Experience helpers ─────────────────────────────────────────────

  const PHOTO_SEEDS = ['baroro-room', 'baroro-tour', 'baroro-spa', 'baroro-dining', 'travel1', 'travel2'];

  const openShare = (reservation: Reservation) => {
    setShareReservation(reservation);
    setShareRating(5);
    setShareCaption('');
    setShareImage('');
    setShareFromGallery(false);
    setShareGalleryMeta(null);
    setShareModal(true);
  };

  const pickGalleryForShare = async () => {
    if (Platform.OS === 'android') {
      try {
        const sdkVersion = Platform.Version as number;
        const permission = sdkVersion >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const result = await PermissionsAndroid.request(permission, {
          title: 'Photo Library Access',
          message: 'Allow Baroro to access your photos to share with your review.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        });
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission needed', 'Please allow photo access in Settings.');
          return;
        }
      } catch (_) { /* let picker handle it */ }
    }
    try {
      const response = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets?.[0];
      if (asset?.uri) {
        setShareImage(asset.uri);
        setShareFromGallery(true);
        setShareGalleryMeta({
          fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
          mimeType: asset.type     ?? 'image/jpeg',
        });
      }
    } catch (err: any) {
      Alert.alert('Could not open gallery', err?.message ?? 'Rebuild the app and try again.');
    }
  };

  const submitShare = async () => {
    if (!shareReservation || !shareCaption.trim()) {
      Alert.alert('Write something', 'Please share your experience before posting.');
      return;
    }
    setShareSubmitting(true);
    try {
      let imageUri: string | undefined = shareImage || undefined;
      if (shareFromGallery && imageUri) {
        imageUri = await uploadWallImage(
          imageUri,
          token,
          shareGalleryMeta?.fileName,
          shareGalleryMeta?.mimeType,
        );
      }
      await createWallPost(
        {
          caption:       shareCaption.trim(),
          imageUri,
          serviceTag:    shareReservation.serviceType,
          reservationId: shareReservation.id,
        },
        token,
      );
      dispatch(markReservationShared(shareReservation.id));
      setShareModal(false);
      setSuccessConfig({
        icon:         'star-circle',
        iconBg:       '#fff8e1',
        iconColor:    '#f57f17',
        title:        'Experience Shared!',
        message:      'Your review is now live on the Community Wall. Thank you for sharing your moment!',
        primaryLabel: 'Awesome!',
        onPrimary:    () => setSuccessConfig(null),
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not post your experience. Try again.');
    } finally {
      setShareSubmitting(false);
    }
  };

  // ─── Reschedule helpers ───────────────────────────────────────────────────

  const openReschedule = (reservation: Reservation) => {
    setRescheduleReservation(reservation);
    setRescheduleCheckIn(reservation.checkInDate ?? '');
    setRescheduleCheckOut(reservation.checkOutDate ?? '');
    setRescheduleTourDate(reservation.tourDate ?? '');
    setRescheduleModal(true);
  };

  const submitReschedule = async () => {
    if (!rescheduleReservation) return;
    const isTour = rescheduleReservation.serviceType === 'tour';
    if (isTour && !rescheduleTourDate) {
      Alert.alert('Missing date', 'Please pick a new tour date.'); return;
    }
    if (!isTour && (!rescheduleCheckIn || !rescheduleCheckOut)) {
      Alert.alert('Missing dates', 'Please pick both check-in and check-out dates.'); return;
    }
    setRescheduling(true);
    try {
      const payload = isTour
        ? { tourDate: rescheduleTourDate, status: 'RESCHEDULED' }
        : { checkInDate: rescheduleCheckIn, checkOutDate: rescheduleCheckOut, status: 'RESCHEDULED' };
      await apiReschedule(rescheduleReservation.id, payload, token);
      dispatch(markReservationRescheduled(rescheduleReservation.id));
      setRescheduleModal(false);
      setSuccessConfig({
        icon:         'calendar-clock',
        iconBg:       '#ede7f6',
        iconColor:    '#6a1b9a',
        title:        'Reschedule Requested',
        message:      'Your new dates have been submitted for review. We\'ll confirm your updated schedule shortly.',
        primaryLabel: 'Got It',
        onPrimary:    () => setSuccessConfig(null),
      });
      fetchReservations();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not reschedule. Please try again.');
    } finally {
      setRescheduling(false);
    }
  };

  // ─── Payment helpers ──────────────────────────────────────────────────────

  const openPayment = (reservation: Reservation) => {
    setPayReservation(reservation);
    setPayMethod('GCASH');
    setPayAmount(String(reservation.totalAmount ?? ''));
    setPayRef('');
    setPayNotes('');
    setPayModal(true);
  };

  const submitPaymentForm = async () => {
    if (!payReservation) return;
    const total     = Number(payReservation.totalAmount ?? 0);
    const entered   = parseFloat(payAmount) || 0;
    if (entered <= 0) { Alert.alert('Invalid amount', 'Please enter a valid payment amount.'); return; }
    if (entered > total) { Alert.alert('Invalid amount', `Amount cannot exceed ₱${total.toLocaleString()}.`); return; }
    if (payMethod !== 'CASH' && !payRef.trim()) {
      Alert.alert('Reference required', 'Please enter the transaction/reference number for cashless payments.');
      return;
    }
    setPaying(true);
    try {
      const paymentPayload: any = {
        reservation:     `/api/reservations/${payReservation.id}`,
        amount:          String(entered),
        paymentMethod:   payMethod,
        referenceNumber: payMethod === 'CASH' ? (payRef.trim() || 'N/A') : payRef.trim(),
        guestNotes:      payNotes,
      };
      if (userId > 0) paymentPayload.paidBy = `/api/users/${userId}`;
      await submitPayment(paymentPayload, token);
      setPayModal(false);
      setSuccessConfig({
        icon:         'credit-card-check-outline',
        iconBg:       '#e3f2fd',
        iconColor:    '#1565c0',
        title:        'Payment Sent!',
        message:      'Your payment is under review. We\'ll notify you once it\'s approved by our team.',
        primaryLabel: 'Got It',
        onPrimary:    () => setSuccessConfig(null),
      });
      fetchReservations();
    } catch (e: any) {
      if (isAuthError(e)) {
        dispatch(userLogout());
        Alert.alert('Session expired', 'Please log in again to continue.');
        return;
      }
      Alert.alert('Error', e.message ?? 'Could not submit payment.');
    } finally { setPaying(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSub}>Track your bookings & payments</Text>
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={openBooking} activeOpacity={0.85}>
          <Icon name="plus" size={16} color="#fff" />
          <Text style={styles.bookBtnText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* ── Filter Pills ── */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <StatCard label="All"          count={stats.total}       color="#455a64" icon="calendar-multiple"    active={activeFilter === 'ALL'}         onPress={() => setActiveFilter('ALL')} />
          <StatCard label="Pending"      count={stats.pending}     color="#f57f17" icon="clock-outline"        active={activeFilter === 'PENDING'}     onPress={() => setActiveFilter('PENDING')} />
          <StatCard label="Confirmed"    count={stats.confirmed}   color="#2e7d32" icon="check-circle-outline" active={activeFilter === 'CONFIRMED'}   onPress={() => setActiveFilter('CONFIRMED')} />
          <StatCard label="Done"         count={stats.completed}   color="#1565c0" icon="flag-checkered"       active={activeFilter === 'COMPLETED'}   onPress={() => setActiveFilter('COMPLETED')} />
          <StatCard label="Rescheduled"  count={stats.rescheduled} color="#6a1b9a" icon="calendar-clock"       active={activeFilter === 'RESCHEDULED'} onPress={() => setActiveFilter('RESCHEDULED')} />
          <StatCard label="Cancelled"    count={stats.cancelled}   color="#c62828" icon="close-circle-outline" active={activeFilter === 'CANCELLED'}   onPress={() => setActiveFilter('CANCELLED')} />
        </ScrollView>
      </View>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={<EmptyState filter={activeFilter} onBook={openBooking} />}
          renderItem={({ item }) => <ReservationCard item={item} onPay={openPayment} onShare={openShare} onReschedule={openReschedule} payments={payments} isShared={sharedReservationIds.includes(item.id)} isRescheduled={isRescheduledItem(item)} />}
        />
      )}

      {/* ── Booking Modal ── */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalIconBtn} onPress={() =>
                step === 'pick_type' ? setModalOpen(false) :
                setStep(step === 'fill_form' ? 'pick_item' : 'pick_type')
              }>
                <Icon name={step === 'pick_type' ? 'close' : 'arrow-left'} size={20} color={COLORS.textDark} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {step === 'pick_type' ? 'What to book?' :
                 step === 'pick_item' ? `Pick a ${serviceType}` : 'Booking details'}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {step === 'pick_type' && (
              <ScrollView contentContainerStyle={styles.typeGrid}>
                {([
                  { key: 'room',    icon: 'bed',            label: 'Room',    sub: 'Overnight stay',    color: '#1565c0' },
                  { key: 'tour',    icon: 'map-marker-path',label: 'Tour',    sub: 'Guided experience', color: '#2e7d32' },
                  { key: 'package', icon: 'gift',           label: 'Package', sub: 'Bundle deal',       color: '#6a1b9a' },
                  { key: 'spa',     icon: 'spa',            label: 'Spa',     sub: 'Wellness session',  color: '#ad1457' },
                ] as { key: ServiceType; icon: string; label: string; sub: string; color: string }[]).map(t => (
                  <TouchableOpacity key={t.key} style={styles.typeCard} onPress={() => selectType(t.key)} activeOpacity={0.8}>
                    <View style={[styles.typeIconWrap, { backgroundColor: t.color + '15' }]}>
                      <Icon name={t.icon} size={32} color={t.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.typeLabel}>{t.label}</Text>
                      <Text style={styles.typeSub}>{t.sub}</Text>
                    </View>
                    <Icon name="chevron-right" size={22} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {step === 'pick_item' && (
              itemsLoading
                ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} size="large" />
                : items.length === 0
                  ? <Text style={styles.noItems}>No {serviceType}s available right now.</Text>
                  : <ScrollView contentContainerStyle={styles.itemCardList}>
                      {items.map(item => {
                        const imgSeed = `${serviceType}${item.id}`;
                        const imgUri  = resolveImg(item.mainImage || item.image || item.imageUrl, imgSeed, serviceType);
                        const priceLabel = serviceType === 'room'
                          ? `₱${Number(item.price).toLocaleString()}/night`
                          : `₱${Number(item.price).toLocaleString()}`;
                        const capacityLabel = item.capacity ? `Up to ${item.capacity} guests` : null;
                        const durationLabel = item.duration ?? null;
                        const locationLabel = item.location ?? null;
                        const pkgType       = item.packageType ?? null;
                        const discount      = item.discountPercentage ?? null;
                        const rawFeatures: string | null = item.features ?? null;
                        const featureChips = rawFeatures
                          ? rawFeatures.split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 3)
                          : [];

                        return (
                          <View key={item.id} style={styles.itemCard}>
                            {/* ── Image ── */}
                            <Image
                              source={{ uri: imgUri }}
                              style={styles.itemCardImage}
                              resizeMode="cover"
                            />

                            {/* ── Price badge ── */}
                            <View style={styles.itemCardPriceBadge}>
                              <Text style={styles.itemCardPriceText}>{priceLabel}</Text>
                            </View>

                            {/* ── Discount badge ── */}
                            {discount ? (
                              <View style={styles.itemCardDiscountBadge}>
                                <Text style={styles.itemCardDiscountText}>{discount}% OFF</Text>
                              </View>
                            ) : null}

                            {/* ── Content ── */}
                            <View style={styles.itemCardContent}>
                              <Text style={styles.itemCardName}>{item.name}</Text>

                              {/* Key attributes */}
                              <View style={styles.itemCardAttrs}>
                                {capacityLabel ? (
                                  <View style={styles.itemCardAttr}>
                                    <Icon name="account-group-outline" size={12} color={COLORS.textMuted} />
                                    <Text style={styles.itemCardAttrText}>{capacityLabel}</Text>
                                  </View>
                                ) : null}
                                {durationLabel ? (
                                  <View style={styles.itemCardAttr}>
                                    <Icon name="clock-outline" size={12} color={COLORS.textMuted} />
                                    <Text style={styles.itemCardAttrText}>{durationLabel}</Text>
                                  </View>
                                ) : null}
                                {locationLabel ? (
                                  <View style={styles.itemCardAttr}>
                                    <Icon name="map-marker-outline" size={12} color={COLORS.textMuted} />
                                    <Text style={styles.itemCardAttrText}>{locationLabel}</Text>
                                  </View>
                                ) : null}
                                {pkgType ? (
                                  <View style={styles.itemCardAttr}>
                                    <Icon name="tag-outline" size={12} color={COLORS.textMuted} />
                                    <Text style={styles.itemCardAttrText}>{pkgType}</Text>
                                  </View>
                                ) : null}
                              </View>

                              {/* Description */}
                              {item.description ? (
                                <Text style={styles.itemCardDesc} numberOfLines={2}>{item.description}</Text>
                              ) : null}

                              {/* Feature chips (rooms) */}
                              {featureChips.length > 0 ? (
                                <View style={styles.itemCardChips}>
                                  {featureChips.map((f: string) => (
                                    <View key={f} style={styles.itemCardChip}>
                                      <Icon name="check-circle-outline" size={10} color={COLORS.primary} />
                                      <Text style={styles.itemCardChipText}>{f}</Text>
                                    </View>
                                  ))}
                                </View>
                              ) : null}

                              {/* Select button */}
                              <TouchableOpacity
                                style={styles.itemCardSelectBtn}
                                onPress={() => selectItem(item)}
                                activeOpacity={0.85}
                              >
                                <Icon name="calendar-check" size={16} color="#fff" />
                                <Text style={styles.itemCardSelectText}>Select & Book</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
            )}

            {step === 'fill_form' && selectedItem && (
              <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedLabel}>Selected {serviceType}</Text>
                  <Text style={styles.selectedName}>{selectedItem.name}</Text>
                  <Text style={styles.selectedPrice}>₱{Number(selectedItem.price).toLocaleString()}</Text>
                </View>

                {serviceType === 'tour' ? (
                  <>
                    <DateField
                      label="Tour Date *"
                      value={tourDate}
                      placeholder="Tap to pick a date"
                      icon="calendar-month"
                      isSingle
                      onPress={() => openCalendar('single', 'Select Tour Date')}
                    />
                    <Text style={styles.fieldLabel}>Number of Participants</Text>
                    <TextInput style={styles.input} value={guests} onChangeText={setGuests} keyboardType="number-pad" placeholder="2" placeholderTextColor={COLORS.textMuted} />
                  </>
                ) : (
                  <>
                    <DateField
                      label="Check-in & Check-out *"
                      value={checkIn && checkOut
                        ? `${new Date(checkIn).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}  →  ${new Date(checkOut).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : checkIn
                          ? `${new Date(checkIn).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} → pick check-out`
                          : ''}
                      placeholder="Tap to pick check-in & check-out"
                      icon="calendar-range"
                      onPress={() => openCalendar('range', 'Select Stay Dates')}
                    />
                    <Text style={styles.fieldLabel}>Number of Guests</Text>
                    <TextInput style={styles.input} value={guests} onChangeText={setGuests} keyboardType="number-pad" placeholder="2" placeholderTextColor={COLORS.textMuted} />
                  </>
                )}

                <Text style={styles.fieldLabel}>Contact Phone *</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="09XXXXXXXXX" placeholderTextColor={COLORS.textMuted} />

                <Text style={styles.fieldLabel}>Special Requests (optional)</Text>
                <TextInput style={[styles.input, styles.textArea]} value={specialReqs} onChangeText={setSpecialReqs} multiline numberOfLines={3} placeholder="Any notes or requests..." placeholderTextColor={COLORS.textMuted} />

                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting} activeOpacity={0.85}>
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><Icon name="calendar-check" size={18} color="#fff" /><Text style={styles.submitText}>Confirm Booking</Text></>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Calendar Picker ── */}
      <CalendarModal
        visible={calVisible}
        mode={calMode}
        title={calTitle}
        value={calContext === 'reschedule' ? rescheduleTourDate : tourDate}
        startDate={calContext === 'reschedule' ? rescheduleCheckIn : checkIn}
        endDate={calContext === 'reschedule' ? rescheduleCheckOut : checkOut}
        onSelect={date => {
          if (calContext === 'reschedule') setRescheduleTourDate(date);
          else setTourDate(date);
        }}
        onRangeSelect={(start, end) => {
          if (calContext === 'reschedule') { setRescheduleCheckIn(start); setRescheduleCheckOut(end); }
          else { setCheckIn(start); setCheckOut(end); }
        }}
        onClose={() => setCalVisible(false)}
      />

      {/* ── Payment Modal ── */}
      <Modal visible={payModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPayModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalIconBtn} onPress={() => setPayModal(false)}>
                <Icon name="close" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Submit Payment</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {payReservation ? (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedLabel}>Reservation</Text>
                  <Text style={styles.selectedName}>#{payReservation.reservationCode ?? payReservation.id}</Text>
                  <Text style={styles.selectedPrice}>Total: ₱{Number(payReservation.totalAmount ?? 0).toLocaleString()}</Text>
                </View>
              ) : null}

              {/* Amount input */}
              {(() => {
                const total   = Number(payReservation?.totalAmount ?? 0);
                const entered = parseFloat(payAmount) || 0;
                const overMax = entered > total;
                return (
                  <>
                    <Text style={styles.fieldLabel}>Amount to Pay *</Text>
                    <TextInput
                      style={[styles.input, overMax && { borderColor: COLORS.error }]}
                      value={payAmount}
                      onChangeText={v => {
                        const num = parseFloat(v);
                        if (!v || isNaN(num)) { setPayAmount(v); return; }
                        setPayAmount(num > total ? String(total) : v);
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textMuted}
                    />
                    {overMax && (
                      <Text style={{ color: COLORS.error, fontSize: 11, marginBottom: 4 }}>
                        Cannot exceed ₱{total.toLocaleString()}
                      </Text>
                    )}
                  </>
                );
              })()}

              <Text style={styles.fieldLabel}>Payment Method</Text>
              <View style={styles.methodGrid}>
                {(['GCASH', 'MAYA', 'CASH', 'BANK_TRANSFER', 'PAYPAL'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodBtn, payMethod === m && styles.methodBtnActive]}
                    onPress={() => setPayMethod(m)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.methodText, payMethod === m && styles.methodTextActive]}>
                      {m.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Reference Number {payMethod === 'CASH' ? '(optional)' : '*'}</Text>
              <TextInput style={styles.input} value={payRef} onChangeText={setPayRef} placeholder={payMethod === 'CASH' ? 'N/A' : 'Transaction ID'} placeholderTextColor={COLORS.textMuted} />

              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput style={[styles.input, styles.textArea]} value={payNotes} onChangeText={setPayNotes} multiline numberOfLines={3} placeholder="Any payment notes..." placeholderTextColor={COLORS.textMuted} />

              {(() => {
                const total    = Number(payReservation?.totalAmount ?? 0);
                const entered  = parseFloat(payAmount) || 0;
                const needsRef = payMethod !== 'CASH' && !payRef.trim();
                const disabled = paying || entered <= 0 || entered > total || needsRef;
                return (
                  <TouchableOpacity
                    style={[styles.submitBtn, disabled && { opacity: 0.5 }]}
                    onPress={submitPaymentForm}
                    disabled={disabled}
                    activeOpacity={0.85}
                  >
                    {paying
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Icon name="credit-card-outline" size={18} color="#fff" /><Text style={styles.submitText}>Record Payment</Text></>}
                  </TouchableOpacity>
                );
              })()}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Reschedule Modal ── */}
      <Modal visible={rescheduleModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRescheduleModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalIconBtn} onPress={() => setRescheduleModal(false)}>
                <Icon name="close" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Reschedule</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {rescheduleReservation && (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedLabel}>{rescheduleReservation.serviceType} — {rescheduleReservation.status}</Text>
                  <Text style={styles.selectedName}>#{rescheduleReservation.reservationCode ?? rescheduleReservation.id}</Text>
                </View>
              )}

              {rescheduleReservation?.serviceType === 'tour' ? (
                <>
                  <DateField
                    label="New Tour Date *"
                    value={rescheduleTourDate}
                    placeholder="Tap to pick a new date"
                    icon="calendar-month"
                    isSingle
                    onPress={() => {
                      setCalContext('reschedule');
                      setCalMode('single');
                      setCalTitle('Select New Tour Date');
                      setCalVisible(true);
                    }}
                  />
                </>
              ) : (
                <DateField
                  label="New Check-in & Check-out *"
                  value={rescheduleCheckIn && rescheduleCheckOut
                    ? `${new Date(rescheduleCheckIn).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}  →  ${new Date(rescheduleCheckOut).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : rescheduleCheckIn
                      ? `${new Date(rescheduleCheckIn).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} → pick check-out`
                      : ''}
                  placeholder="Tap to pick new dates"
                  icon="calendar-range"
                  onPress={() => {
                    setCalContext('reschedule');
                    setCalMode('range');
                    setCalTitle('Select New Stay Dates');
                    setCalVisible(true);
                  }}
                />
              )}

              <View style={styles.rescheduleNote}>
                <Icon name="information-outline" size={14} color={COLORS.info} />
                <Text style={styles.rescheduleNoteText}>
                  Your request will be reviewed by the admin. You'll be notified once confirmed.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, rescheduling && { opacity: 0.6 }]}
                onPress={submitReschedule}
                disabled={rescheduling}
                activeOpacity={0.85}
              >
                {rescheduling
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Icon name="calendar-check" size={18} color="#fff" /><Text style={styles.submitText}>Request Reschedule</Text></>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Success Modal ── */}
      <SuccessModal config={successConfig} />

      {/* ── Share Experience Modal ── */}
      <Modal visible={shareModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShareModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalIconBtn} onPress={() => setShareModal(false)}>
                <Icon name="close" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Share Your Experience</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {/* Service tag */}
              {shareReservation && (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedLabel}>{shareReservation.serviceType} — Completed Stay</Text>
                  <Text style={styles.selectedName}>#{shareReservation.reservationCode ?? shareReservation.id}</Text>
                </View>
              )}

              {/* Star rating */}
              <Text style={styles.fieldLabel}>Your Rating *</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setShareRating(star)} activeOpacity={0.7}>
                    <Icon
                      name={star <= shareRating ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= shareRating ? '#f57f17' : COLORS.border}
                    />
                  </TouchableOpacity>
                ))}
                <Text style={styles.ratingLabel}>
                  {shareRating === 5 ? 'Excellent!' : shareRating === 4 ? 'Very Good' : shareRating === 3 ? 'Good' : shareRating === 2 ? 'Fair' : 'Poor'}
                </Text>
              </View>

              {/* Caption */}
              <Text style={styles.fieldLabel}>Your Review *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { height: 110 }]}
                value={shareCaption}
                onChangeText={t => setShareCaption(t.slice(0, 500))}
                multiline
                placeholder="Share your experience — what did you love? Any tips for future guests?"
                placeholderTextColor={COLORS.textMuted}
              />
              <Text style={styles.charCount}>{shareCaption.length}/500</Text>

              {/* Photo picker */}
              <Text style={styles.fieldLabel}>Add a Photo (optional)</Text>

              {/* Gallery button */}
              <TouchableOpacity style={styles.galleryPickerBtn} onPress={pickGalleryForShare} activeOpacity={0.8}>
                <Icon name="image-plus" size={20} color={COLORS.primary} />
                <Text style={styles.galleryPickerText}>
                  {shareFromGallery ? 'Change Photo from Gallery' : 'Choose from Gallery'}
                </Text>
              </TouchableOpacity>

              {/* Large preview if gallery photo selected */}
              {shareFromGallery && shareImage ? (
                <View style={styles.galleryPreviewWrap}>
                  <Image source={{ uri: shareImage }} style={styles.galleryPreviewImg} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.galleryPreviewRemove}
                    onPress={() => { setShareImage(''); setShareFromGallery(false); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="close-circle" size={26} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.galleryOrLabel}>or pick a preset</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
                    <View style={styles.photoPickerRow}>
                      {PHOTO_SEEDS.map(seed => {
                        const uri = `https://picsum.photos/seed/${seed}/400/240`;
                        return (
                          <TouchableOpacity
                            key={seed}
                            style={[styles.photoThumb, shareImage === uri && styles.photoThumbActive]}
                            onPress={() => setShareImage(shareImage === uri ? '' : uri)}
                            activeOpacity={0.8}
                          >
                            <Icon name="image-outline" size={20} color={shareImage === uri ? COLORS.primary : COLORS.textMuted} />
                            <Text style={[styles.photoSeedLabel, shareImage === uri && { color: COLORS.primary }]}>
                              {seed.replace('baroro-', '').replace('travel', 'Travel ')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, (!shareCaption.trim() || shareSubmitting) && { opacity: 0.5 }]}
                onPress={submitShare}
                disabled={!shareCaption.trim() || shareSubmitting}
                activeOpacity={0.85}
              >
                {shareSubmitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Icon name="share-variant" size={18} color="#fff" /><Text style={styles.submitText}>Post to Community Wall</Text></>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...SHADOW.brand,
  },
  headerTitle: { fontSize: 22, fontFamily: FONTS.display, color: '#fff', fontWeight: '700' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.body, marginTop: 2 },
  bookBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  bookBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13, fontWeight: '700' },

  // Filter pills (matches Share Wall filter bar design)
  filterBar:           { backgroundColor: COLORS.surface, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterScroll:        { paddingHorizontal: SPACING.md, gap: 8 },
  filterPill:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  filterPillActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterPillText:      { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '600', color: COLORS.textMuted },
  filterPillTextActive:{ color: '#fff' },
  filterPillBadge:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  filterPillBadgeActive:{ backgroundColor: 'rgba(255,255,255,0.3)' },
  filterPillBadgeText: { fontSize: 9, fontFamily: FONTS.bold, fontWeight: '700', color: '#fff' },

  // List
  list: { padding: SPACING.md, paddingBottom: 110 },

  // Reservation card
  card:         { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, marginBottom: SPACING.sm, overflow: 'hidden', ...SHADOW.sm },
  cardAccent:   { width: 5 },
  cardInner:    { flex: 1, padding: SPACING.md },
  cardTop:      { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  cardIconWrap: { width: 38, height: 38, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  cardType:     { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  cardCode:     { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body },
  statusPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
  statusText:   { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', textTransform: 'uppercase' },
  divider:      { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  infoGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  infoCell:     { flexDirection: 'row', alignItems: 'flex-start', gap: 5, width: (width - SPACING.md * 2 - SPACING.md * 2 - 5 * 2 - 10) / 2 },
  infoLabel:    { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.body },
  infoValue:    { fontSize: 12, color: COLORS.textDark, fontFamily: FONTS.bold, fontWeight: '600' },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  payPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 4 },
  payText:      { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', textTransform: 'uppercase' },
  cardAmount:   { fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark },
  payNowBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.sm, marginTop: SPACING.sm, ...SHADOW.brand },
  payNowText:   { color: '#fff', fontFamily: FONTS.bold, fontSize: 13, fontWeight: '700' },
  shareExpBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: RADIUS.full, paddingVertical: SPACING.sm, marginTop: SPACING.xs, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  shareExpText:  { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 13, fontWeight: '700' },
  sharedBadge:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: RADIUS.full, paddingVertical: SPACING.sm, marginTop: SPACING.xs, backgroundColor: COLORS.success + '15' },
  sharedBadgeText:{ color: COLORS.success, fontFamily: FONTS.bold, fontSize: 13, fontWeight: '700' },
  rescheduleBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: RADIUS.full, paddingVertical: SPACING.sm, marginTop: SPACING.xs, borderWidth: 1.5, borderColor: '#00838f', backgroundColor: '#00838f12' },
  rescheduleBtnText:  { color: '#00838f', fontFamily: FONTS.bold, fontSize: 13, fontWeight: '700' },
  rescheduledBanner:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#6a1b9a15', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 9, marginTop: SPACING.xs, borderWidth: 1, borderColor: '#6a1b9a30' },
  rescheduledBannerText: { flex: 1, fontSize: 12, fontFamily: FONTS.bold, fontWeight: '600', color: '#6a1b9a' },
  rescheduleNote:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.info + '12', borderRadius: RADIUS.sm, padding: 12, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  rescheduleNoteText: { flex: 1, fontSize: 12, fontFamily: FONTS.body, color: COLORS.info, lineHeight: 18 },
  rejectionBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#fce4ec', borderRadius: RADIUS.sm, padding: 8, marginTop: SPACING.xs },
  rejectionText: { flex: 1, fontSize: 11, fontFamily: FONTS.body, color: '#c62828', lineHeight: 16 },

  // Empty
  emptyWrap:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, marginTop: 60, gap: 10 },
  emptyTitle:   { fontSize: 18, fontFamily: FONTS.display, color: COLORS.textDark, fontWeight: '700' },
  emptySub:     { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.full, ...SHADOW.brand, marginTop: SPACING.sm },
  emptyBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, fontWeight: '700' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: 16, paddingBottom: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalTitle: { flex: 1, fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textDark, fontWeight: '700', textAlign: 'center' },

  // Type picker
  typeGrid: { padding: SPACING.md, gap: SPACING.sm },
  typeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md, ...SHADOW.sm, marginBottom: SPACING.sm },
  typeIconWrap: { width: 56, height: 56, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.textDark, fontWeight: '700' },
  typeSub:   { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },

  // Item picker cards
  itemCardList: { padding: SPACING.md, paddingBottom: 40, gap: SPACING.md },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  itemCardImage: { width: '100%', height: 185 },
  itemCardPriceBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 5,
    ...SHADOW.sm,
  },
  itemCardPriceText: { color: '#fff', fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700' },
  itemCardDiscountBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#e65100',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  itemCardDiscountText: { color: '#fff', fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700' },
  itemCardContent: { padding: SPACING.md, gap: 8 },
  itemCardName: { fontSize: 17, fontFamily: FONTS.display, fontWeight: '700', color: COLORS.textDark },
  itemCardAttrs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itemCardAttr: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 4 },
  itemCardAttrText: { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted },
  itemCardDesc: { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted, lineHeight: 19 },
  itemCardChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemCardChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryFaded, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  itemCardChipText: { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '600', color: COLORS.primary },
  itemCardSelectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: 13, marginTop: 4,
    ...SHADOW.brand,
  },
  itemCardSelectText: { color: '#fff', fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700' },
  noItems:   { textAlign: 'center', color: COLORS.textMuted, marginTop: 60, fontFamily: FONTS.body, fontSize: 14 },

  // Form
  form:          { padding: SPACING.md, paddingBottom: 60 },
  selectedInfo:  { backgroundColor: COLORS.primaryFaded, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg },
  selectedLabel: { fontSize: 11, color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  selectedName:  { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textDark, fontWeight: '700', marginBottom: 2 },
  selectedPrice: { fontSize: 14, color: COLORS.primary, fontFamily: FONTS.medium },
  fieldLabel:    { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textDark, fontWeight: '700', marginBottom: 6, marginTop: SPACING.sm },
  input:         { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  textArea:      { height: 80, textAlignVertical: 'top' },
  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 17, marginTop: SPACING.lg, ...SHADOW.brand },
  submitText:    { color: '#fff', fontFamily: FONTS.bold, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  // Payment method
  methodGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  methodBtn:        { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  methodBtnActive:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  methodText:       { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted, fontWeight: '600' },
  methodTextActive: { color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700' },

  // Share experience
  starsRow:           { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  ratingLabel:        { fontSize: 13, fontFamily: FONTS.bold, color: '#f57f17', fontWeight: '700', marginLeft: 4 },
  charCount:          { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginBottom: SPACING.sm },
  galleryPickerBtn:   {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.primaryFaded,
    borderWidth: 1.5, borderColor: COLORS.primary + '40', borderStyle: 'dashed',
    borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10,
  },
  galleryPickerText:  { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  galleryOrLabel:     { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted, marginBottom: 6 },
  galleryPreviewWrap: { position: 'relative', borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.md },
  galleryPreviewImg:  { width: '100%', height: 200 },
  galleryPreviewRemove:{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 13 },
  photoPickerRow:     { flexDirection: 'row', gap: SPACING.sm, paddingVertical: 4 },
  photoThumb:         { alignItems: 'center', justifyContent: 'center', width: 80, height: 60, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border, gap: 4 },
  photoThumbActive:   { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  photoSeedLabel:     { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.textMuted, textTransform: 'capitalize', textAlign: 'center' },

  // Date picker field
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    marginBottom: 4,
  },
  dateFieldText:        { flex: 1, fontSize: 14, fontFamily: FONTS.medium, fontWeight: '600', color: COLORS.textDark },
  dateFieldPlaceholder: { color: COLORS.textMuted, fontWeight: '400', fontFamily: FONTS.body },
});

export default BookingsScreen;
