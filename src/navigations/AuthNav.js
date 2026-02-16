import { createStackNavigator } from '@react-navigation/stack';
import { ROUTES } from '../utils';

import Login from '../screens/auth/Login';
import HomeScreen from '../screens/HomeScreen';

const Stack = createStackNavigator();

const AuthNavigation = () => {
  return (
    <Stack.Navigator initialRouteName={ROUTES.LOGIN}>
      <Stack.Screen name={ROUTES.LOGIN} component={Login} />
      <Stack.Screen name={ROUTES.HOME} component={HomeScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigation;
