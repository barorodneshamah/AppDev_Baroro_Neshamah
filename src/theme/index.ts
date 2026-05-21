// src/theme/index.ts

import { Platform } from 'react-native';

export const COLORS = {
  // Brand
  primary:        '#c24a16',
  primaryLight:   '#e85d04',
  primaryDark:    '#9a3a10',
  primaryFaded:   'rgba(194, 74, 22, 0.12)',

  // Neutrals
  background:     '#faf9f7',
  surface:        '#ffffff',
  surfaceAlt:     '#f5f3f0',
  border:         '#ece9e4',

  // Text
  textDark:       '#2f2f2f',
  textMuted:      '#888888',
  textLight:      '#ffffff',

  // Status
  success:        '#2e7d32',
  successFaded:   'rgba(46,125,50,0.12)',
  error:          '#c62828',
  errorFaded:     'rgba(198,40,40,0.12)',
  warning:        '#f57f17',
  warningFaded:   'rgba(245,127,23,0.12)',
  info:           '#1565c0',
  infoFaded:      'rgba(21,101,192,0.12)',

  // Role badges
  roleAdmin:      '#c62828',
  roleStaff:      '#ef6c00',
  roleGuest:      '#2e7d32',

  // Overlay
  overlay:        'rgba(0,0,0,0.45)',
  overlayLight:   'rgba(0,0,0,0.15)',
};

export const FONTS = {
  display:  Platform.OS === 'ios' ? 'Georgia'        : 'serif',
  body:     Platform.OS === 'ios' ? 'Avenir'         : 'sans-serif',
  medium:   Platform.OS === 'ios' ? 'Avenir-Medium'  : 'sans-serif-medium',
  bold:     Platform.OS === 'ios' ? 'Avenir-Heavy'   : 'sans-serif-condensed',
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   18,
  xl:   24,
  full: 999,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 10,
  },
  brand: {
    shadowColor: '#c24a16',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 8,
  },
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

// Role display helpers
export const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'ROLE_ADMIN':  return 'Admin';
    case 'ROLE_STAFF':  return 'Staff';
    case 'ROLE_GUEST':  return 'Guest';
    default:            return role.replace('ROLE_', '');
  }
};

export const getRoleColor = (role: string): string => {
  switch (role) {
    case 'ROLE_ADMIN':  return COLORS.roleAdmin;
    case 'ROLE_STAFF':  return COLORS.roleStaff;
    case 'ROLE_GUEST':  return COLORS.roleGuest;
    default:            return COLORS.textMuted;
  }
};

export const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'available':  return COLORS.success;
    case 'booked':
    case 'unavailable': return COLORS.error;
    case 'maintenance': return COLORS.warning;
    default:            return COLORS.textMuted;
  }
};