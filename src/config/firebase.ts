// src/config/firebase.ts
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import API_BASE_URL from './api.config';

const GOOGLE_WEB_CLIENT_ID = '9775216433-s460m29pgodjk0dpla09aled3esfujlu.apps.googleusercontent.com';

export { API_BASE_URL };

let googleConfigured = false;

export const configureGoogleSignIn = () => {
  if (!googleConfigured) {
    console.log('Configuring Google Sign-In...');
    console.log('Web Client ID:', GOOGLE_WEB_CLIENT_ID);
    
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      scopes: ['email', 'profile'],
    });
    
    googleConfigured = true;
  }
};

export const signInWithGoogle = async () => {
  configureGoogleSignIn();
  
  try {
    // Sign out first to force account picker every time
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      // Ignore if already signed out
    }
    
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // This shows the account picker
    const userInfo = await GoogleSignin.signIn();
    
    const idToken = (userInfo as any).idToken || (userInfo as any).data?.idToken;
    const user = (userInfo as any).user || (userInfo as any).data?.user;
    
    console.log('Account selected:', {
      email: user?.email,
      name: user?.name,
    });
    
    if (!idToken) {
      throw new Error('No ID token received');
    }
    
    await logEvent('google_signin_start', { email: user?.email });
    
    return { idToken, user };
    
  } catch (error: any) {
    // User cancelled account selection
    if (error.code === 'SIGN_IN_CANCELLED') {
      console.log('User cancelled account selection');
      return null;
    }
    
    console.error('Google Sign-In Error:', {
      code: error.code,
      message: error.message,
    });
    
    recordError(error, 'GoogleSignInError');
    throw error;
  }
};

export const authenticateWithBackend = async (idToken: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();
    
    console.log('Backend Response:', {
      status: response.status,
      ok: response.ok,
      hasToken: !!data.token,
      message: data.message,
    });
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Backend authentication failed');
    }

    await logEvent('google_login_success', { email: data.email });
    
    return data;
  } catch (error: any) {
    console.error('Backend auth error:', error.message);
    recordError(error, 'BackendAuthError');
    throw error;
  }
};

export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    await logEvent('google_signout', {});
  } catch (error) {
    console.error('Sign out error:', error);
  }
};

export const getCurrentGoogleUser = async () => {
  try {
    return await GoogleSignin.getCurrentUser();
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

export const logEvent = async (eventName: string, params?: Record<string, any>) => {
  try {
    await analytics().logEvent(eventName, params);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

export const logScreen = async (screenName: string) => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch (error) {
    console.error('Screen tracking error:', error);
  }
};

export const logCrashlytics = (message: string) => {
  crashlytics().log(message);
};

export const recordError = (error: Error, jsErrorName?: string) => {
  crashlytics().recordError(error, jsErrorName);
};

export const setUserForCrashlytics = (userId: string) => {
  crashlytics().setUserId(userId);
};

export { analytics, crashlytics, GoogleSignin };