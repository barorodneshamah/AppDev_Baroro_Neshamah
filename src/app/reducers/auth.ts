// src/app/reducers/auth.ts
import {
  USER_LOGIN, USER_LOGIN_COMPLETED, USER_LOGIN_ERROR,
  USER_LOGIN_REQUEST, USER_LOGIN_RESET,
  USER_REGISTER, USER_REGISTER_COMPLETED, USER_REGISTER_ERROR,
  USER_REGISTER_REQUEST, USER_REGISTER_RESET,
} from '../actions';

interface RegisterState {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  errorMessage: string | null;
}

interface AuthState {
  data: any | null;
  token: string | null;
  isLoading: boolean;
  isError: boolean;
  register: RegisterState;
}

interface AuthAction {
  type: string;
  payload?: any;
  [key: string]: any;
}

const INITIAL_STATE: AuthState = {
  data: null,
  token: null,
  isLoading: false,
  isError: false,
  register: {
    isLoading: false,
    isError: false,
    isSuccess: false,
    errorMessage: null,
  },
};

export default function reducer(state = INITIAL_STATE, action: AuthAction): AuthState {
  console.log('Auth Action:', action.type);
  console.log('Auth Payload:', action.payload);
  
  switch (action.type) {
    case USER_LOGIN_REQUEST:
      return { ...state, data: null, isLoading: true, isError: false };
    case USER_LOGIN_COMPLETED: {
      const p = action.payload ?? {};
      console.log('LOGIN_COMPLETED payload keys:', Object.keys(p), '| id:', p.id, '| user?.id:', p.user?.id);
      // Normalize: expose id at top-level regardless of nesting
      const userId = p.id ?? p.user?.id ?? p.userId ?? p.data?.id ?? null;
      const normalized = userId !== null ? { ...p, id: userId } : p;
      return { ...state, data: normalized, token: p.token ?? null, isLoading: false, isError: false };
    }
    case USER_LOGIN_ERROR:
      return { ...state, data: null, isLoading: false, isError: true };
    case USER_LOGIN_RESET:
      return INITIAL_STATE;

    case USER_REGISTER_REQUEST:
      return { ...state, register: { isLoading: true, isError: false, isSuccess: false, errorMessage: null } };
    case USER_REGISTER_COMPLETED:
      return { ...state, register: { isLoading: false, isError: false, isSuccess: true, errorMessage: null } };
    case USER_REGISTER_ERROR:
      return { ...state, register: { isLoading: false, isError: true, isSuccess: false, errorMessage: action.payload ?? 'Registration failed' } };
    case USER_REGISTER_RESET:
      return { ...state, register: { isLoading: false, isError: false, isSuccess: false, errorMessage: null } };

    default:
      return state;
  }
}

export const userLogin = (payload: any) => ({
  type: USER_LOGIN,
  payload,
});

export const userRegister = (payload: any) => ({
  type: USER_REGISTER,
  payload,
});

export const userGoogleLoginSuccess = (payload: any) => ({
  type: USER_LOGIN_COMPLETED,
  payload,
});

export const resetLogin = () => ({
  type: USER_LOGIN_RESET,
});

export const resetRegister = () => ({
  type: USER_REGISTER_RESET,
});

export const userLogout = () => ({
  type: USER_LOGIN_RESET,
});