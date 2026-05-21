// src/app/actions.ts
// User Login Actions
export const USER_LOGIN = 'USER_LOGIN';
export const USER_LOGIN_REQUEST = 'USER_LOGIN_REQUEST';
export const USER_LOGIN_COMPLETED = 'USER_LOGIN_COMPLETED';
export const USER_LOGIN_ERROR = 'USER_LOGIN_ERROR';
export const USER_LOGIN_RESET = 'USER_LOGIN_RESET';

// User Register Actions
export const USER_REGISTER = 'USER_REGISTER';
export const USER_REGISTER_REQUEST = 'USER_REGISTER_REQUEST';
export const USER_REGISTER_COMPLETED = 'USER_REGISTER_COMPLETED';
export const USER_REGISTER_ERROR = 'USER_REGISTER_ERROR';
export const USER_REGISTER_RESET = 'USER_REGISTER_RESET';

// Google Login Action (add this)
export const USER_GOOGLE_LOGIN = 'USER_GOOGLE_LOGIN';
export const USER_GOOGLE_LOGIN_SUCCESS = 'USER_GOOGLE_LOGIN_SUCCESS';

// Login action creators
export const userLogin = (payload: any) => ({
  type: USER_LOGIN,
  payload,
});

export const userLoginRequest = () => ({
  type: USER_LOGIN_REQUEST,
});

export const userLoginCompleted = (payload: any) => ({
  type: USER_LOGIN_COMPLETED,
  payload,
});

export const userLoginError = (payload: any) => ({
  type: USER_LOGIN_ERROR,
  payload,
});

export const userLoginReset = () => ({
  type: USER_LOGIN_RESET,
});

// Register action creators
export const userRegister = (payload: any) => ({
  type: USER_REGISTER,
  payload,
});

export const userRegisterRequest = () => ({
  type: USER_REGISTER_REQUEST,
});

export const userRegisterCompleted = (payload: any) => ({
  type: USER_REGISTER_COMPLETED,
  payload,
});

export const userRegisterError = (payload: any) => ({
  type: USER_REGISTER_ERROR,
  payload,
});

export const userRegisterReset = () => ({
  type: USER_REGISTER_RESET,
});

// Google Login action creators
export const userGoogleLogin = (payload: any) => ({
  type: USER_GOOGLE_LOGIN,
  payload,
});

export const userGoogleLoginSuccess = (payload: any) => ({
  type: USER_LOGIN_COMPLETED,  
  payload,
});