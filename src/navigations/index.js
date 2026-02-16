import { NavigationContainer } from '@react-navigation/native';
import { useEffect } from 'react';
import { Platform, StatusBar, useColorScheme } from 'react-native';

import AuthNav from './AuthNav';

export default () => {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#000000', true);
    }

    StatusBar.setBarStyle('dark-content', true);
  }, [isDarkMode]);

  return (
    <NavigationContainer>
      <AuthNav />
    </NavigationContainer>
  );
};
