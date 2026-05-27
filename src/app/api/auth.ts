import { Platform } from "react-native";
import API_BASE_URL from '../../config/api.config';

const BASE_URL = `${API_BASE_URL}/api`;

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

interface ApiResponse {
  [key: string]: any;
}

const options = {
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
};

export async function authLogin({ username, password }: LoginCredentials): Promise<ApiResponse> {
  const url = BASE_URL + '/login';
  console.log('authLogin attempting fetch to:', url, 'with payload:', { username, password });
  try {
    const response = await fetch(url, {
      method: 'POST',
      ...options,
      body: JSON.stringify({
        username,
        password,
      }),
    });
    console.log('authLogin response status:', response.status);
    const data: ApiResponse = await response.json();
    console.log('authLogin response data:', data);
    if (response.ok) {
      return data;
    } else {
      throw new Error(data.error || data.message || 'Login failed');
    }
  } catch (error) {
    console.error('authLogin fetch error:', error);
    throw error;
  }
}

export async function authRegister({ username, email, password }: RegisterCredentials): Promise<ApiResponse> {
  const url = BASE_URL + '/register';
  console.log('authRegister attempting fetch to:', url, 'with payload:', { username, email, password });
  try {
    const response = await fetch(url, {
      method: 'POST',
      ...options,
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    });
    console.log('authRegister response status:', response.status);
    const data: ApiResponse = await response.json();
    console.log('authRegister response data:', data);
    if (response.ok) {
      return data;
    } else {
      throw new Error(data.error || data.message || 'Registration failed');
    }
  } catch (error) {
    console.error('authRegister fetch error:', error);
    throw error;
  }
}
