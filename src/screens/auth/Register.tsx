import React, { useEffect, useState, FC } from 'react';
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
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { ROUTES } from '../../utils';
import { userRegister, resetRegister } from '../../app/reducers/auth';

const LogoImg = require('../../../images/3.png');

const COLORS = {
  primary: '#c45114',
  background: '#ffffff',
  inputBg: '#e2e8f0',
  textDark: '#333333',
  textLight: '#ffffff',
};

const Register: FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigation = useNavigation<NavigationProp<any>>();
  const dispatch = useDispatch();
  const { isLoading, isError, isSuccess } = useSelector(
    (state: any) => state.auth.register,
  );

  useEffect(() => {
    if (isSuccess) {
      dispatch(resetRegister());
      navigation.navigate(ROUTES.LOGIN);
    }
  }, [isSuccess, dispatch, navigation]);

  const handleRegister = () => {
    if (username === '' || email === '' || password === '') return;
    dispatch(userRegister({ username, email, password }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
        {/* TOP SECTION */}
        <View style={styles.topSection}>
          <Text style={styles.welcomeText}>Start New Journey!</Text>
          <View style={styles.logoCard}>
            <Image source={LogoImg} style={styles.logoImage} />
          </View>
        </View>

        {/* BOTTOM SECTION */}
        <View style={styles.bottomSection}>
          <Text style={styles.formTitle}>Register</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#888"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputContainer, isError && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {isError && (
            <Text style={styles.errorText}>Registration failed. Try again.</Text>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Registering...' : 'Register'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.LOGIN)}>
              <Text style={styles.footerLink}>Sign in</Text>
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
  },
  topSection: {
    backgroundColor: COLORS.primary,
    height: '45%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 60,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  welcomeText: {
    color: COLORS.textLight,
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  logoCard: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
  },
  logoImage: {
    width: 180,
    height: 130,
    borderRadius: 25,
    resizeMode: 'cover',
  },
  bottomSection: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 30,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    marginBottom: 15,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  inputError: {
    borderWidth: 1,
    borderColor: 'red',
  },
  input: {
    fontSize: 16,
    color: COLORS.textDark,
    height: '100%',
  },
  errorText: {
    color: 'red',
    alignSelf: 'flex-start',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: COLORS.primary,
    width: '50%',
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  buttonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default Register;
