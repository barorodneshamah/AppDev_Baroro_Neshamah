// src/navigations/MainNav.tsx
import React, { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ROUTES from '../utils';
import { RootState } from '../store';
import HomeScreen          from '../screens/HomeScreen';
import ProfileScreen       from '../screens/ProfileScreen';
import BookingsScreen      from '../screens/BookingsScreen';
import ExploreScreen       from '../screens/ExploreScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MessagesScreen      from '../screens/MessagesScreen';
import ShareWallScreen     from '../screens/ShareWallScreen';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';

// ─── Tab icons ────────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, string> = {
  [ROUTES.HOME]:       'home',
  [ROUTES.EXPLORE]:    'magnify',
  [ROUTES.BOOKINGS]:   'calendar-month',
  [ROUTES.SHARE_WALL]: 'image-multiple-outline',
  [ROUTES.MESSAGES]:   'chat-outline',
  [ROUTES.PROFILE]:    'account',
};

// ─── Home stack ───────────────────────────────────────────────────────────────

const HomeStack = createStackNavigator();
const HomeStackNav: FC = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeMain"              component={HomeScreen} />
    <HomeStack.Screen name={ROUTES.SERVICE_DETAIL} component={ServiceDetailScreen} />
    <HomeStack.Screen name={ROUTES.NOTIFICATIONS}  component={NotificationsScreen} />
  </HomeStack.Navigator>
);

// ─── Explore stack ────────────────────────────────────────────────────────────

const ExploreStack = createStackNavigator();
const ExploreStackNav: FC = () => (
  <ExploreStack.Navigator screenOptions={{ headerShown: false }}>
    <ExploreStack.Screen name="ExploreMain"         component={ExploreScreen} />
    <ExploreStack.Screen name={ROUTES.SERVICE_DETAIL} component={ServiceDetailScreen} />
  </ExploreStack.Navigator>
);

// ─── Bottom tab navigator ─────────────────────────────────────────────────────

type TabParamList = { [key: string]: undefined };
const Tab = createBottomTabNavigator<TabParamList>();

const badgeValue = (count: number) => count > 99 ? '99+' : count || undefined;

const MainNavigation: FC = () => {
  const notifications = useSelector((state: RootState) => state.notifications.items);
  const unreadCount = notifications.filter(n => !n.read).length;
  const unreadMessages = notifications.filter(n => !n.read && n.type === 'message').length;
  const unreadBookings = notifications.filter(n =>
    !n.read && ['reservation', 'booking', 'cancellation', 'payment'].includes(n.type)
  ).length;

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: RouteProp<TabParamList> }): BottomTabNavigationOptions => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBadgeStyle: styles.tabBadge,
        tabBarIcon: ({ focused, color }: { focused: boolean; color: string; size: number }) => (
          <View style={[styles.tabIconWrapper, focused && styles.tabIconActive]}>
            <Icon name={TAB_ICONS[route.name] ?? 'circle'} size={18} color={color} />
          </View>
        ),
      })}
    >
      <Tab.Screen name={ROUTES.HOME}       component={HomeStackNav}    options={{ title: 'Home', tabBarBadge: badgeValue(unreadCount) }} />
      <Tab.Screen name={ROUTES.EXPLORE}    component={ExploreStackNav} options={{ title: 'Explore' }} />
      <Tab.Screen name={ROUTES.BOOKINGS}   component={BookingsScreen}  options={{ title: 'Bookings', tabBarBadge: badgeValue(unreadBookings) }} />
      <Tab.Screen name={ROUTES.SHARE_WALL} component={ShareWallScreen} options={{ title: 'Wall' }} />
      <Tab.Screen name={ROUTES.MESSAGES}   component={MessagesScreen}  options={{ title: 'Messages', tabBarBadge: badgeValue(unreadMessages) }} />
      <Tab.Screen name={ROUTES.PROFILE}    component={ProfileScreen}   options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: Platform.OS === 'ios' ? 82 : 64,
    backgroundColor: COLORS.surface,
    borderTopWidth: 0,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    ...SHADOW.md,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIconWrapper: {
    width: 36, height: 36,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabIconActive: {
    backgroundColor: COLORS.primaryFaded,
  },
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

export default MainNavigation;
