// src/screens/auth/Login.tsx
import React, { useState, useRef, FC } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  ImageSourcePropType,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Path } from 'react-native-svg';
import ROUTES from '../../utils';
import { userLogin, userGoogleLoginSuccess } from '../../app/reducers/auth';
import { signInWithGoogle, authenticateWithBackend, logEvent } from '../../config/firebase';

const { height } = Dimensions.get('window');

const GoogleG = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </Svg>
);

const COLORS = {
  primary: '#c45114',
  background: '#ffffff',
  inputBg: '#e2e8f0',
  textDark: '#333333',
  textLight: '#ffffff',
};


const Login: FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [googlePressed, setGooglePressed] = useState(false);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const liftAnim   = useRef(new Animated.Value(0)).current;

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const translateY = liftAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });

  const onGooglePressIn = () => {
    setGooglePressed(true);
    Animated.parallel([
      Animated.timing(rotateAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(liftAnim,   { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => rotateAnim.setValue(0));
  };

  const onGooglePressOut = () => {
    setGooglePressed(false);
    Animated.timing(liftAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  const navigation = useNavigation<NavigationProp<any>>();
  const dispatch = useDispatch();
  const { isLoading, isError } = useSelector(
    (state: { auth: { isLoading: boolean; isError: boolean } }) => state.auth
  );

  const handleLogin = (): void => {
    if (username === '' || password === '') {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    dispatch(userLogin({ username, password }));
  };

  const handleGoogleLogin = async (): Promise<void> => {
    setGoogleLoading(true);
    
    try {
      // Show account picker and get user info
      const result = await signInWithGoogle();
      
      // If user cancelled account selection
      if (!result) {
        setGoogleLoading(false);
        return;
      }
      
      const { idToken, user } = result;
      
      if (!idToken) {
        Alert.alert(
          'Google Sign-In Failed',
          'Could not retrieve token from Google.\n\n' +
          'Please check:\n' +
          '1. Web Client ID in firebase.ts is correct\n' +
          '2. Google Sign-In is enabled in Firebase Console\n' +
          '3. You are using a WEB application client ID'
        );
        return;
      }
      
      console.log('Account selected:', user?.email);
      console.log('ID Token length:', idToken.length);
      
      await logEvent('google_login_attempt', { email: user?.email });
      
      // Exchange token with backend
      const backendResponse = await authenticateWithBackend(idToken);
      
      // Store in Redux — triggers navigation to MainNav
      dispatch(userGoogleLoginSuccess(backendResponse));
      
      await logEvent('google_login_complete', { email: backendResponse.email });
      
    } catch (error: any) {
      console.error('Google Login Error:', error);
      
      let errorMessage = 'An unexpected error occurred.';
      if (error.message?.includes('audience mismatch')) {
        errorMessage = 'Client ID mismatch. Please contact support.';
      } else if (error.message?.includes('DEVELOPER_ERROR')) {
        errorMessage = 'Configuration error. Please check SHA-1 fingerprint and Client IDs.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Google Sign-In Failed', errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  const LogoImg: ImageSourcePropType = require('../../../images/3.png');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* TOP SECTION */}
        <View style={styles.topSection}>
          <Text style={styles.welcomeText}>Welcome Back, User!</Text>
          <View style={styles.logoCard}>
            <Image source={LogoImg} style={styles.logoImage} />
          </View>
        </View>

        {/* BOTTOM SECTION */}
        <View style={styles.bottomSection}>
          <Text style={styles.formTitle}>Sign In</Text>

          <View style={[styles.inputContainer, focusedField === 'username' && styles.inputFocused]}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#888"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!isLoading}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={[styles.inputContainer, isError && styles.inputError, focusedField === 'password' && styles.inputFocused]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In Button */}
          <Animated.View
            style={[
              styles.googleButton,
              { transform: [{ translateY }] },
              googlePressed && styles.googleButtonActive,
            ]}
          >
            <TouchableOpacity
              style={styles.googleButtonInner}
              onPress={handleGoogleLogin}
              onPressIn={onGooglePressIn}
              onPressOut={onGooglePressOut}
              activeOpacity={1}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#4285F4" size="small" />
              ) : (
                <>
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <GoogleG size={22} />
                  </Animated.View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.REGISTER)}>
              <Text style={styles.footerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: height,
  },
  topSection: {
    backgroundColor: COLORS.primary,
    minHeight: height * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 50,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
  },
  welcomeText: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  logoCard: {
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
  },
  logoImage: {
    width: 140,
    height: 100,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  bottomSection: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 25,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    marginBottom: 12,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: 'red',
  },
  input: {
    fontSize: 16,
    color: COLORS.textDark,
    flex: 1,
    height: '100%',
  },
  button: {
    backgroundColor: COLORS.primary,
    width: '60%',
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e8e8e8',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  googleButton: {
    width: '100%',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonActive: {
    borderColor: '#FF5722',
    shadowColor: '#FF5722',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 50,
    paddingHorizontal: 16,
  },
  googleButtonText: {
    color: '#3c4043',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  footerText: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: '500',
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default Login;