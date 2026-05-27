// src/navigations/AuthNav.tsx
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import ROUTES from '../utils';
import LandingScreen from '../screens/auth/LandingScreen';
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register';
import React, { FC } from 'react';

const Stack = createStackNavigator();

type AuthNavigationProp = StackNavigationProp<any>;

const AuthNavigation: FC = () => {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.LANDING}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name={ROUTES.LANDING}  component={LandingScreen} />
      <Stack.Screen name={ROUTES.LOGIN}    component={Login} />
      <Stack.Screen name={ROUTES.REGISTER} component={Register} />
    </Stack.Navigator>
  );
};

export default AuthNavigation;