// src/navigations/index.tsx
import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, FC } from 'react';
import { Platform, StatusBar, useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import AuthNav  from './AuthNav';
import MainNav  from './MainNav';
import AdminNav from './AdminNav';
import StaffNav from './StaffNav';
import { connect as wsConnect, disconnect as wsDisconnect } from '../services/websocketService';
import { startPolling, stopPolling } from '../services/notificationPoller';

const Navigation: FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const { data, token } = useSelector((state: any) => state.auth);
  const isLoggedIn = !!data;
  const roles: string[] = data?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isStaff = roles.includes('ROLE_STAFF');

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#000000', true);
    }
    StatusBar.setBarStyle('dark-content', true);
  }, [isDarkMode]);

  // Connect WebSocket + start reply poller when authenticated
  useEffect(() => {
    if (isLoggedIn && token) {
      wsConnect(token);
      startPolling();
    } else {
      wsDisconnect();
      stopPolling();
    }
    return () => {
      wsDisconnect();
      stopPolling();
    };
  }, [isLoggedIn, token]);

  return (
    <NavigationContainer>
      {!isLoggedIn ? <AuthNav /> :
       isAdmin     ? <AdminNav /> :
       isStaff     ? <StaffNav /> :
                     <MainNav />}
    </NavigationContainer>
  );
};

export default Navigation;