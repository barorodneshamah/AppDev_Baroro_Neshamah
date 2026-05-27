// src/components/AppModals.tsx
import React, { FC, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme';

// ─── Success Modal ─────────────────────────────────────────────────────────────

export interface SuccessModalConfig {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export const SuccessModal: FC<{ config: SuccessModalConfig | null }> = ({ config }) => {
  const scale   = useRef(new Animated.Value(0.72)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (config) {
      scale.setValue(0.72);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 16,
          stiffness: 260,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [config]);

  return (
    <Modal
      visible={!!config}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => config?.onPrimary()}
    >
      <View style={S.overlay}>
        <Animated.View style={[S.card, { opacity, transform: [{ scale }] }]}>
          {/* Decorative rings */}
          {config && (
            <>
              <View style={[S.ring, S.ringTR, { borderColor: config.iconColor + '18' }]} />
              <View style={[S.ring, S.ringBL, { borderColor: config.iconColor + '10' }]} />
            </>
          )}

          {/* Icon */}
          {config && (
            <View style={[S.iconOuter, { backgroundColor: config.iconColor + '18' }]}>
              <View style={[S.iconInner, { backgroundColor: config.iconBg }]}>
                <Icon name={config.icon} size={42} color={config.iconColor} />
              </View>
            </View>
          )}

          <Text style={S.title}>{config?.title}</Text>
          <Text style={S.message}>{config?.message}</Text>

          {/* Primary CTA */}
          {config && (
            <TouchableOpacity
              style={[S.primaryBtn, { backgroundColor: config.iconColor }]}
              onPress={config.onPrimary}
              activeOpacity={0.85}
            >
              <Text style={S.primaryText}>{config.primaryLabel}</Text>
            </TouchableOpacity>
          )}

          {/* Secondary (text-only) */}
          {config?.secondaryLabel && (
            <TouchableOpacity
              style={S.secondaryBtn}
              onPress={config.onSecondary ?? config.onPrimary}
              activeOpacity={0.7}
            >
              <Text style={S.secondaryText}>{config.secondaryLabel}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

export interface ConfirmModalConfig {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  dangerous?: boolean;
}

export const ConfirmModal: FC<{ config: ConfirmModalConfig | null }> = ({ config }) => {
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (config) {
      scale.setValue(0.8);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 280,
      }).start();
    }
  }, [config]);

  const confirmColor = config?.dangerous ? '#c62828' : config?.iconColor ?? COLORS.primary;

  return (
    <Modal
      visible={!!config}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => config?.onCancel()}
    >
      <View style={S.overlay}>
        <Animated.View style={[S.card, { transform: [{ scale }] }]}>
          {config && (
            <>
              <View style={[S.ring, S.ringTR, { borderColor: confirmColor + '14' }]} />
              <View style={[S.ring, S.ringBL, { borderColor: confirmColor + '0c' }]} />
            </>
          )}

          {config && (
            <View style={[S.iconOuter, { backgroundColor: confirmColor + '14' }]}>
              <View style={[S.iconInner, { backgroundColor: config.iconBg }]}>
                <Icon name={config.icon} size={42} color={confirmColor} />
              </View>
            </View>
          )}

          <Text style={S.title}>{config?.title}</Text>
          <Text style={S.message}>{config?.message}</Text>

          <View style={S.confirmRow}>
            {/* Cancel */}
            <TouchableOpacity
              style={S.cancelBtn}
              onPress={config?.onCancel}
              activeOpacity={0.8}
            >
              <Text style={S.cancelText}>{config?.cancelLabel ?? 'Cancel'}</Text>
            </TouchableOpacity>

            {/* Confirm */}
            <TouchableOpacity
              style={[S.confirmBtn, { backgroundColor: confirmColor }]}
              onPress={config?.onConfirm}
              activeOpacity={0.85}
            >
              {config && <Icon name={config.icon} size={15} color="#fff" />}
              <Text style={S.confirmText}>{config?.confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Validation Modal ──────────────────────────────────────────────────────────

const FIELD_ICONS: Record<string, string> = {
  username:          'account',
  email:             'email-outline',
  password:          'lock-outline',
  caption:           'text',
  phone:             'phone-outline',
  'check-in date':   'calendar-arrow-right',
  'check-out date':  'calendar-arrow-left',
  'tour date':       'calendar-star',
  'spa date':        'calendar-heart',
  date:              'calendar-outline',
  'reference number':'pound-box-outline',
  amount:            'currency-php',
  message:           'message-outline',
  subject:           'text-subject',
  name:              'account-outline',
};

const fieldIcon = (label: string) =>
  FIELD_ICONS[label.toLowerCase()] ?? 'alert-circle-outline';

export const ValidationModal: FC<{
  visible: boolean;
  title?:  string;
  fields:  string[];
  onClose: () => void;
}> = ({ visible, title = 'Missing Information', fields, onClose }) => {
  const scale   = useRef(new Animated.Value(0.78)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const listY   = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.78);
      opacity.setValue(0);
      listY.setValue(12);
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 260 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(listY,   { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const AMBER = '#f59e0b';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[SV.overlay, { opacity }]}>
        <Animated.View style={[SV.card, { transform: [{ scale }] }]}>

          {/* Decorative rings */}
          <View style={[SV.ring, SV.ringTR, { borderColor: AMBER + '20' }]} />
          <View style={[SV.ring, SV.ringBL, { borderColor: AMBER + '14' }]} />

          {/* Icon */}
          <View style={[SV.iconOuter, { backgroundColor: AMBER + '18' }]}>
            <View style={[SV.iconInner, { backgroundColor: AMBER + 'ee' }]}>
              <Icon name="clipboard-alert-outline" size={40} color="#fff" />
            </View>
          </View>

          <Text style={SV.title}>{title}</Text>
          <Text style={SV.subtitle}>
            Please fill in the following {fields.length === 1 ? 'field' : 'fields'} before continuing:
          </Text>

          {/* Field list */}
          <Animated.View style={[SV.fieldList, { opacity, transform: [{ translateY: listY }] }]}>
            {fields.map((f, i) => (
              <View key={i} style={SV.fieldRow}>
                <View style={SV.fieldIconWrap}>
                  <Icon name={fieldIcon(f)} size={15} color={AMBER} />
                </View>
                <Text style={SV.fieldLabel}>{f}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Button */}
          <TouchableOpacity
            style={[SV.btn, { backgroundColor: AMBER }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Icon name="check-circle-outline" size={17} color="#fff" />
            <Text style={SV.btnText}>Got It, Fix Now</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const SV = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.54)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 30,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...SHADOW.lg,
  },

  ring: {
    position: 'absolute',
    borderRadius: 75,
    borderWidth: 28,
  },
  ringTR: { width: 140, height: 140, top: -50, right: -50 },
  ringBL: { width: 160, height: 160, bottom: -55, left: -55, borderRadius: 80, borderWidth: 32 },

  iconOuter: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  iconInner: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },

  title: {
    fontSize: 21,
    fontFamily: FONTS.display,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 4,
  },

  fieldList: {
    width: '100%',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  fieldIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f59e0b18',
    alignItems: 'center', justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '600',
    color: COLORS.textDark,
    flex: 1,
  },

  btn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: RADIUS.full,
    ...SHADOW.brand,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...SHADOW.lg,
  },

  // Decorative rings
  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 30,
  },
  ringTR: { top: -55, right: -55 },
  ringBL: { bottom: -55, left: -55, width: 170, height: 170, borderRadius: 85, borderWidth: 34 },

  // Icon
  iconOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text
  title: {
    fontSize: 22,
    fontFamily: FONTS.display,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 4,
  },

  // Success buttons
  primaryBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    marginBottom: 10,
    ...SHADOW.brand,
  },
  primaryText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },

  // Confirm buttons
  confirmRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 15,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.brand,
  },
  confirmText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
});
