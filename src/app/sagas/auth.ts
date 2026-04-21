import { call, put, takeEvery, SagaIterator } from 'redux-saga/effects';
import { authLogin, authRegister } from '../api/auth';
import {
  USER_LOGIN, USER_LOGIN_COMPLETED, USER_LOGIN_ERROR, USER_LOGIN_REQUEST,
  USER_REGISTER, USER_REGISTER_COMPLETED, USER_REGISTER_ERROR, USER_REGISTER_REQUEST,
} from '../actions';

interface LoginAction {
  type: string;
  payload: {
    username: string;
    password: string;
  };
}

interface RegisterAction {
  type: string;
  payload: {
    username: string;
    email: string;
    password: string;
  };
}

export function* userLoginAsync(action: LoginAction): SagaIterator {
  yield put({ type: USER_LOGIN_REQUEST });
  try {
    console.log("Saga calling API with:", action.payload);
    const response: any = yield call(authLogin, action.payload);
    console.log("API Response Success:", response);
    yield put({ type: USER_LOGIN_COMPLETED, payload: response });
  } catch (error: any) {
    console.error("SAGA LOGIN ERROR:", error);
    yield put({ type: USER_LOGIN_ERROR, payload: error.message });
  }
}

export function* userLogin(): SagaIterator {
  yield takeEvery(USER_LOGIN, userLoginAsync);
}

export function* userRegisterAsync(action: RegisterAction): SagaIterator {
  yield put({ type: USER_REGISTER_REQUEST });
  try {
    console.log("Saga calling register API with:", action.payload);
    const response: any = yield call(authRegister, action.payload);
    console.log("API Register Response Success:", response);
    yield put({ type: USER_REGISTER_COMPLETED, payload: response });
  } catch (error: any) {
    console.error("SAGA REGISTER ERROR:", error);
    yield put({ type: USER_REGISTER_ERROR, payload: error.message });
  }
}

export function* userRegister(): SagaIterator {
  yield takeEvery(USER_REGISTER, userRegisterAsync);
}
