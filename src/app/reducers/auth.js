import {
  USER_LOGIN, USER_LOGIN_COMPLETED, USER_LOGIN_ERROR,
  USER_LOGIN_REQUEST, USER_LOGIN_RESET,
  USER_REGISTER, USER_REGISTER_COMPLETED, USER_REGISTER_ERROR,
  USER_REGISTER_REQUEST, USER_REGISTER_RESET,
} from '../actions';

const INITIAL_STATE = {
  data: null,
  isLoading: false,
  isError: false,
  register: {
    isLoading: false,
    isError: false,
    isSuccess: false,
  },
};

export default function reducer(state = INITIAL_STATE, action) {
  switch (action.type) {
    case USER_LOGIN_REQUEST:
      return { ...state, data: null, isLoading: true, isError: false };
    case USER_LOGIN_COMPLETED:
      return { ...state, data: action.payload, isLoading: false, isError: false };
    case USER_LOGIN_ERROR:
      return { ...state, data: null, isLoading: false, isError: true };
    case USER_LOGIN_RESET:
      return INITIAL_STATE;

    case USER_REGISTER_REQUEST:
      return { ...state, register: { isLoading: true, isError: false, isSuccess: false } };
    case USER_REGISTER_COMPLETED:
      return { ...state, register: { isLoading: false, isError: false, isSuccess: true } };
    case USER_REGISTER_ERROR:
      return { ...state, register: { isLoading: false, isError: true, isSuccess: false } };
    case USER_REGISTER_RESET:
      return { ...state, register: { isLoading: false, isError: false, isSuccess: false } };

    default:
      return state;
  }
}

export const userLogin = payload => ({ type: USER_LOGIN, payload });
export const resetLogin = () => ({ type: USER_LOGIN_RESET });
export const userRegister = payload => ({ type: USER_REGISTER, payload });
export const resetRegister = () => ({ type: USER_REGISTER_RESET });