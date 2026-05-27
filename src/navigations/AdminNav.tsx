// src/navigations/AdminNav.tsx
import React, { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { RouteProp }                from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ROUTES from '../utils';
import { RootState } from '../store';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { getAdminReservations, getAdminPayments } from '../app/api/api';

// ── Screens ────────────────────────────────────────────────────────────────────
import AdminDashboardScreen    from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen        from '../screens/admin/AdminUsersScreen';
import AdminUserFormScreen     from '../screens/admin/AdminUserFormScreen';
import AdminUserDetailScreen   from '../screens/admin/AdminUserDetailScreen';
import AdminActivityLogsScreen from '../screens/admin/AdminActivityLogsScreen';
import AdminActivityLogDetailScreen from '../screens/admin/AdminActivityLogDetailScreen';

import ServicesScreen          from '../screens/shared/ServicesScreen';
import ServiceDetailScreen     from '../screens/shared/ServiceDetailScreen';
import ServiceFormScreen       from '../screens/shared/ServiceFormScreen';

import ReservationsScreen      from '../screens/shared/ReservationsScreen';
import ReservationDetailScreen from '../screens/shared/ReservationDetailScreen';

import PaymentsScreen          from '../screens/shared/PaymentsScreen';
import PaymentDetailScreen     from '../screens/shared/PaymentDetailScreen';

import MessagesScreen          from '../screens/shared/MessagesScreen';
import MessageDetailScreen     from '../screens/shared/MessageDetailScreen';

import ManageProfileScreen     from '../screens/shared/ManageProfileScreen';
import NotificationsScreen     from '../screens/NotificationsScreen';
import ShareWallScreen         from '../screens/ShareWallScreen';

const ACCENT = COLORS.primary;

// ─── Stack navigators ──────────────────────────────────────────────────────────

const DashStack = createStackNavigator();
const DashStackNav: FC = () => (
  <DashStack.Navigator screenOptions={{ headerShown: false }}>
    <DashStack.Screen name="AdminDashMain"       component={AdminDashboardScreen} />
    <DashStack.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
  </DashStack.Navigator>
);

const UsersStack = createStackNavigator();
const UsersStackNav: FC = () => (
  <UsersStack.Navigator screenOptions={{ headerShown: false }}>
    <UsersStack.Screen name={ROUTES.ADMIN_USERS}         component={AdminUsersScreen} />
    <UsersStack.Screen name={ROUTES.ADMIN_USER_DETAIL}   component={AdminUserDetailScreen} />
    <UsersStack.Screen name={ROUTES.ADMIN_USER_FORM}     component={AdminUserFormScreen} />
    <UsersStack.Screen name={ROUTES.ADMIN_ACTIVITY_LOGS} component={AdminActivityLogsScreen} />
    <UsersStack.Screen name={ROUTES.ADMIN_ACTIVITY_LOG_DETAIL} component={AdminActivityLogDetailScreen} />
  </UsersStack.Navigator>
);

const ServicesStack = createStackNavigator();
const ServicesStackNav: FC = () => (
  <ServicesStack.Navigator screenOptions={{ headerShown: false }}>
    <ServicesStack.Screen name={ROUTES.ADMIN_SERVICES}
      children={() => <ServicesScreen canEdit accentColor={ACCENT} />} />
    <ServicesStack.Screen name={ROUTES.ROOM_DETAIL}
      children={() => <ServiceDetailScreen canEdit accentColor={ACCENT} />} />
    <ServicesStack.Screen name={ROUTES.ROOM_FORM}
      children={() => <ServiceFormScreen accentColor={ACCENT} />} />
    <ServicesStack.Screen name={ROUTES.TOUR_DETAIL}
      children={() => <ServiceDetailScreen canEdit accentColor={ACCENT} />} />
    <ServicesStack.Screen name={ROUTES.TOUR_FORM}
      children={() => <ServiceFormScreen accentColor={ACCENT} />} />
    <ServicesStack.Screen name={ROUTES.FOOD_DETAIL}
      children={() => <ServiceDetailScreen canEdit accentColor={ACCENT} />} />
    <ServicesStack.Screen name={ROUTES.FOOD_FORM}
      children={() => <ServiceFormScreen accentColor={ACCENT} />} />
    <ServicesStack.Screen name={ROUTES.PACKAGE_DETAIL}
      children={() => <ServiceDetailScreen canEdit accentColor={ACCENT} />} />
    <ServicesStack.Screen name={ROUTES.PACKAGE_FORM}
      children={() => <ServiceFormScreen accentColor={ACCENT} />} />
    <ServicesStack.Screen name={ROUTES.SPA_DETAIL}
      children={() => <ServiceDetailScreen canEdit accentColor={ACCENT} />} />
    <ServicesStack.Screen name={ROUTES.SPA_FORM}
      children={() => <ServiceFormScreen accentColor={ACCENT} />} />
  </ServicesStack.Navigator>
);

// ── Reservations tab (dedicated) ──────────────────────────────────────────────
const ReservationsStack = createStackNavigator();
const ReservationsStackNav: FC = () => (
  <ReservationsStack.Navigator screenOptions={{ headerShown: false }}>
    <ReservationsStack.Screen name={ROUTES.ADMIN_RESERVATIONS}
      children={() => <ReservationsScreen accentColor={ACCENT} detailRoute={ROUTES.ADMIN_RESERVATION_DETAIL} fetchFn={getAdminReservations} />} />
    <ReservationsStack.Screen name={ROUTES.ADMIN_RESERVATION_DETAIL}
      children={() => <ReservationDetailScreen accentColor={ACCENT} />} />
  </ReservationsStack.Navigator>
);

// ── Payments tab (dedicated) ──────────────────────────────────────────────────
const PaymentsStack = createStackNavigator();
const PaymentsStackNav: FC = () => (
  <PaymentsStack.Navigator screenOptions={{ headerShown: false }}>
    <PaymentsStack.Screen name={ROUTES.ADMIN_PAYMENTS}
      children={() => <PaymentsScreen accentColor={ACCENT} detailRoute={ROUTES.ADMIN_PAYMENT_DETAIL} fetchFn={getAdminPayments} />} />
    <PaymentsStack.Screen name={ROUTES.ADMIN_PAYMENT_DETAIL}
      children={() => <PaymentDetailScreen accentColor={ACCENT} />} />
  </PaymentsStack.Navigator>
);

const MessagesStack = createStackNavigator();
const MessagesStackNav: FC = () => (
  <MessagesStack.Navigator screenOptions={{ headerShown: false }}>
    <MessagesStack.Screen name={ROUTES.ADMIN_MESSAGES}
      children={() => <MessagesScreen accentColor={ACCENT} detailRoute={ROUTES.ADMIN_MESSAGE_DETAIL} />} />
    <MessagesStack.Screen name={ROUTES.ADMIN_MESSAGE_DETAIL}
      children={() => <MessageDetailScreen accentColor={ACCENT} />} />
  </MessagesStack.Navigator>
);

const ProfileStack = createStackNavigator();
const ProfileStackNav: FC = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name={ROUTES.ADMIN_PROFILE}
      children={() => <ManageProfileScreen accentColor={ACCENT} />} />
  </ProfileStack.Navigator>
);

// ─── Tab navigator ─────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, string> = {
  DashTab:         'view-dashboard',
  UsersTab:        'account-group',
  ServicesTab:     'format-list-bulleted',
  ReservationsTab: 'calendar-check',
  PaymentsTab:     'credit-card-outline',
  WallTab:         'image-multiple-outline',
  MessagesTab:     'email-outline',
  ProfileTab:      'account-circle',
};

type TabParamList = { [key: string]: undefined };
const Tab = createBottomTabNavigator<TabParamList>();

const badgeValue = (count: number) => count > 99 ? '99+' : count || undefined;

const AdminNavigation: FC = () => {
  const notifications = useSelector((state: RootState) => state.notifications.items);
  const unreadCount = notifications.filter(n => !n.read).length;
  const unreadMessages = notifications.filter(n => !n.read && n.type === 'message').length;
  const unreadReservations = notifications.filter(n => !n.read && n.type === 'reservation').length;
  const unreadPayments = notifications.filter(n => !n.read && n.type === 'payment').length;

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: RouteProp<TabParamList> }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor:   ACCENT,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBadgeStyle: styles.tabBadge,
        tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
          <View style={[styles.iconWrapper, focused && styles.iconActive]}>
            <Icon name={TAB_ICONS[route.name] ?? 'circle'} size={17} color={color} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="DashTab"         component={DashStackNav}         options={{ title: 'Dashboard', tabBarBadge: badgeValue(unreadCount) }} />
      <Tab.Screen name="UsersTab"        component={UsersStackNav}        options={{ title: 'Users' }} />
      <Tab.Screen name="ServicesTab"     component={ServicesStackNav}     options={{ title: 'Services' }} />
      <Tab.Screen name="ReservationsTab" component={ReservationsStackNav} options={{ title: 'Reservation', tabBarBadge: badgeValue(unreadReservations) }} />
      <Tab.Screen name="PaymentsTab"     component={PaymentsStackNav}     options={{ title: 'Payments', tabBarBadge: badgeValue(unreadPayments) }} />
      <Tab.Screen name="WallTab"         component={ShareWallScreen}      options={{ title: 'Wall' }} />
      <Tab.Screen name="MessagesTab"     component={MessagesStackNav}     options={{ title: 'Messages', tabBarBadge: badgeValue(unreadMessages) }} />
      <Tab.Screen name="ProfileTab"      component={ProfileStackNav}      options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: Platform.OS === 'ios' ? 82 : 64,
    backgroundColor: COLORS.surface,
    borderTopWidth: 0,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    ...SHADOW.md,
  },
  tabLabel:   { fontSize: 9, fontFamily: FONTS.bold, fontWeight: '600', marginTop: 2 },
  iconWrapper:{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: RADIUS.md },
  iconActive: { backgroundColor: COLORS.primaryFaded },
  tabBadge: {
    backgroundColor: COLORS.error,
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 9,
    fontWeight: '800',
    minWidth: 16,
    height: 16,
    lineHeight: 14,
  },
});

export default AdminNavigation;
