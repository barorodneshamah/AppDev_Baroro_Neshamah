// src/screens/BookingsScreen.tsx
import React, { FC, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
  ScrollView, Platform, KeyboardAvoidingView, StatusBar, Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Calendar, DateData } from 'react-native-calendars';
import {
  getRooms, getTours, getPackages, getReservations, getPayments,
  createReservation, getMercureToken, submitPayment, getSpaServices,
} from '../app/api/api';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';

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
type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL',       label: 'All' },
  { key: 'PENDING',   label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
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
    case 'CONFIRMED':  return '#2e7d32';
    case 'PENDING':    return '#f57f17';
    case 'CANCELLED':  return '#c62828';
    case 'COMPLETED':  return '#1565c0';
    default:           return COLORS.textMuted;
  }
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

// ─── Stats Card ───────────────────────────────────────────────────────────────

const StatCard: FC<{ label: string; count: number; color: string; icon: string; active: boolean; onPress: () => void }> =
  ({ label, count, color, icon, active, onPress }) => (
  <TouchableOpacity
    style={[styles.statCard, active && { borderColor: color, borderWidth: 2 }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
      <Icon name={icon} size={18} color={color} />
    </View>
    <Text style={[styles.statCount, { color }]}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─── Reservation Card ─────────────────────────────────────────────────────────

const ReservationCard: FC<{ item: Reservation; onPay: (r: Reservation) => void; payments: any[] }> = ({ item, onPay, payments }) => {
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
  const userId: number  = data?.user?.id ?? data?.id ?? 0;
  const route           = useRoute<RouteProp<any>>();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments,     setPayments]     = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');

  // Booking modal
  const [modalOpen,     setModalOpen]     = useState(false);
  const [step,          setStep]          = useState<Step>('pick_type');
  const [serviceType,   setServiceType]   = useState<ServiceType>('room');
  const [items,         setItems]         = useState<ServiceItem[]>([]);
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

  // Payment modal
  const [payModal,       setPayModal]       = useState(false);
  const [payReservation, setPayReservation] = useState<Reservation | null>(null);
  const [payMethod,      setPayMethod]      = useState('GCASH');
  const [payAmount,      setPayAmount]      = useState('');
  const [payRef,         setPayRef]         = useState('');
  const [payNotes,       setPayNotes]       = useState('');
  const [paying,         setPaying]         = useState(false);

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
      setReservations(members);
      setPayments(pays);
    } catch (e: any) {
      console.error('[Bookings] fetch error:', e.message);
      setReservations([]);
    }
  }, [token]);

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

  const stats = useMemo(() => ({
    total:     reservations.length,
    pending:   reservations.filter(r => r.status?.toUpperCase() === 'PENDING').length,
    confirmed: reservations.filter(r => r.status?.toUpperCase() === 'CONFIRMED').length,
    completed: reservations.filter(r => r.status?.toUpperCase() === 'COMPLETED').length,
    cancelled: reservations.filter(r => r.status?.toUpperCase() === 'CANCELLED').length,
  }), [reservations]);

  const filtered = useMemo(() =>
    activeFilter === 'ALL'
      ? reservations
      : reservations.filter(r => r.status?.toUpperCase() === activeFilter),
  [reservations, activeFilter]);

  // ─── Booking modal helpers ────────────────────────────────────────────────

  const openCalendar = (mode: 'single' | 'range', title: string) => {
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
      setItems(res?.data ?? res?.['hydra:member'] ?? []);
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
      setModalOpen(false);
      Alert.alert('Booking submitted!', 'Your reservation is pending confirmation.');
      fetchReservations();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not submit booking.');
    } finally { setSubmitting(false); }
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
      Alert.alert('Payment submitted!', 'Your payment is pending admin approval.');
      fetchReservations();
    } catch (e: any) {
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

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        <StatCard label="Total"     count={stats.total}     color="#455a64" icon="calendar-multiple"     active={activeFilter === 'ALL'}       onPress={() => setActiveFilter('ALL')} />
        <StatCard label="Pending"   count={stats.pending}   color="#f57f17" icon="clock-outline"         active={activeFilter === 'PENDING'}   onPress={() => setActiveFilter('PENDING')} />
        <StatCard label="Confirmed" count={stats.confirmed} color="#2e7d32" icon="check-circle-outline"  active={activeFilter === 'CONFIRMED'} onPress={() => setActiveFilter('CONFIRMED')} />
        <StatCard label="Done"      count={stats.completed} color="#1565c0" icon="flag-checkered"        active={activeFilter === 'COMPLETED'} onPress={() => setActiveFilter('COMPLETED')} />
        <StatCard label="Cancelled" count={stats.cancelled} color="#c62828" icon="close-circle-outline"  active={activeFilter === 'CANCELLED'} onPress={() => setActiveFilter('CANCELLED')} />
      </View>

      {/* ── Filter Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsWrap}
        contentContainerStyle={styles.tabsContent}
      >
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.tab, activeFilter === f.key && styles.tabActive]}
            onPress={() => setActiveFilter(f.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, activeFilter === f.key && styles.tabTextActive]}>{f.label}</Text>
            {f.key !== 'ALL' && (
              <View style={[styles.tabCount, activeFilter === f.key && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, activeFilter === f.key && styles.tabCountTextActive]}>
                  {f.key === 'PENDING'   ? stats.pending   :
                   f.key === 'CONFIRMED' ? stats.confirmed :
                   f.key === 'COMPLETED' ? stats.completed : stats.cancelled}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

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
          renderItem={({ item }) => <ReservationCard item={item} onPay={openPayment} payments={payments} />}
        />
      )}

      {/* ── Booking Modal ── */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() =>
                step === 'pick_type' ? setModalOpen(false) :
                setStep(step === 'fill_form' ? 'pick_item' : 'pick_type')
              }>
                <Text style={styles.modalBack}>{step === 'pick_type' ? '✕ Close' : '← Back'}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {step === 'pick_type' ? 'What to book?' :
                 step === 'pick_item' ? `Pick a ${serviceType}` : 'Booking details'}
              </Text>
              <View style={{ width: 60 }} />
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
                  : <ScrollView contentContainerStyle={styles.itemList}>
                      {items.map(item => (
                        <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => selectItem(item)} activeOpacity={0.8}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{item.name}</Text>
                          </View>
                          <Text style={styles.itemPrice}>₱{Number(item.price).toLocaleString()}</Text>
                          <Icon name="chevron-right" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      ))}
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
        value={tourDate}
        startDate={checkIn}
        endDate={checkOut}
        onSelect={date => setTourDate(date)}
        onRangeSelect={(start, end) => { setCheckIn(start); setCheckOut(end); }}
        onClose={() => setCalVisible(false)}
      />

      {/* ── Payment Modal ── */}
      <Modal visible={payModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPayModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setPayModal(false)}>
                <Text style={styles.modalBack}>✕ Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Submit Payment</Text>
              <View style={{ width: 60 }} />
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

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.xs },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', gap: 4, ...SHADOW.sm, borderWidth: 1.5, borderColor: 'transparent' },
  statIconWrap: { width: 32, height: 32, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  statCount: { fontSize: 18, fontFamily: FONTS.display, fontWeight: '700' },
  statLabel: { fontSize: 9, fontFamily: FONTS.bold, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },

  // Filter tabs
  tabsWrap:    { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 48 },
  tabsContent: { paddingHorizontal: SPACING.md, alignItems: 'center', gap: SPACING.xs },
  tab:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, gap: 5 },
  tabActive:   { backgroundColor: COLORS.primary },
  tabText:     { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#fff' },
  tabCount:    { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textMuted },
  tabCountTextActive: { color: '#fff' },

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
  modalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalBack:      { color: COLORS.primary, fontFamily: FONTS.medium, fontSize: 14, width: 70 },
  modalTitle:     { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textDark, fontWeight: '700', textAlign: 'center' },

  // Type picker
  typeGrid: { padding: SPACING.md, gap: SPACING.sm },
  typeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md, ...SHADOW.sm, marginBottom: SPACING.sm },
  typeIconWrap: { width: 56, height: 56, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.textDark, fontWeight: '700' },
  typeSub:   { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },

  // Item picker
  itemList:  { padding: SPACING.md },
  itemRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
  itemName:  { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textDark, fontWeight: '600' },
  itemPrice: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.primary, fontWeight: '700', marginRight: SPACING.sm },
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
  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, padding: SPACING.md, marginTop: SPACING.lg, ...SHADOW.brand },
  submitText:    { color: '#fff', fontFamily: FONTS.bold, fontSize: 16, fontWeight: '700' },

  // Payment method
  methodGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  methodBtn:        { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  methodBtnActive:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  methodText:       { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted, fontWeight: '600' },
  methodTextActive: { color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700' },

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
