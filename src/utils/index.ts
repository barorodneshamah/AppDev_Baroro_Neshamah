// src/utils/index.ts
export const ROUTES = {
  // Auth
  LOGIN:           'Login',
  REGISTER:        'Register',
  FORGOT_PASSWORD: 'ForgotPassword',

  // Guest tabs
  HOME:     'Home',
  EXPLORE:  'Explore',
  BOOKINGS: 'Bookings',
  PROFILE:  'Profile',

  // ── Admin tabs ────────────────────────────────────────────────────────────
  ADMIN_DASHBOARD:          'AdminDashboard',
  ADMIN_USERS:              'AdminUsers',
  ADMIN_USER_DETAIL:        'AdminUserDetail',
  ADMIN_USER_FORM:          'AdminUserForm',
  ADMIN_SERVICES:           'AdminServices',
  ADMIN_RESERVATIONS:       'AdminReservations',
  ADMIN_RESERVATION_DETAIL: 'AdminReservationDetail',
  ADMIN_PAYMENTS:           'AdminPayments',
  ADMIN_PAYMENT_DETAIL:     'AdminPaymentDetail',
  ADMIN_MESSAGES:           'AdminMessages',
  ADMIN_MESSAGE_DETAIL:     'AdminMessageDetail',
  ADMIN_ACTIVITY_LOGS:      'AdminActivityLogs',
  ADMIN_ACTIVITY_LOG_DETAIL:'AdminActivityLogDetail',
  ADMIN_PROFILE:            'AdminProfile',

  // ── Staff tabs ────────────────────────────────────────────────────────────
  STAFF_DASHBOARD:          'StaffDashboard',
  STAFF_SERVICES:           'StaffServices',
  STAFF_RESERVATIONS:       'StaffReservations',
  STAFF_RESERVATION_DETAIL: 'StaffReservationDetail',
  STAFF_PAYMENTS:           'StaffPayments',
  STAFF_PAYMENT_DETAIL:     'StaffPaymentDetail',
  STAFF_MESSAGES:           'StaffMessages',
  STAFF_MESSAGE_DETAIL:     'StaffMessageDetail',
  STAFF_PROFILE:            'StaffProfile',

  // ── Notifications ─────────────────────────────────────────────────────────
  NOTIFICATIONS: 'Notifications',
  MESSAGES:      'Messages',

  // ── Customer service detail ───────────────────────────────────────────────
  SERVICE_DETAIL: 'ServiceDetail',

  // ── Shared service screens (used in both Admin & Staff stacks) ────────────
  ROOM_LIST:      'RoomList',
  ROOM_DETAIL:    'RoomDetail',
  ROOM_FORM:      'RoomForm',
  TOUR_LIST:      'TourList',
  TOUR_DETAIL:    'TourDetail',
  TOUR_FORM:      'TourForm',
  FOOD_LIST:      'FoodList',
  FOOD_DETAIL:    'FoodDetail',
  FOOD_FORM:      'FoodForm',
  PACKAGE_LIST:   'PackageList',
  PACKAGE_DETAIL: 'PackageDetail',
  PACKAGE_FORM:   'PackageForm',
};

export default ROUTES;