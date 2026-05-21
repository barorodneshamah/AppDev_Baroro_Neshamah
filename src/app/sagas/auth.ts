// src/app/sagas/auth.ts
import { call, put, takeEvery } from 'redux-saga/effects';
import { authLogin, authRegister, getMe, getUserByUsername } from '../api/api';
import { signInWithGoogle, authenticateWithBackend } from '../../config/firebase';
import {
  USER_LOGIN,           USER_LOGIN_COMPLETED,  USER_LOGIN_ERROR,  USER_LOGIN_REQUEST,
  USER_REGISTER,        USER_REGISTER_COMPLETED, USER_REGISTER_ERROR, USER_REGISTER_REQUEST,
  USER_GOOGLE_LOGIN,
} from '../actions';

// ─── Login ────────────────────────────────────────────────────────────────────

const enrichWithProfile = async (loginResponse: any): Promise<any> => {
  const token = loginResponse.token;

  // Try /api/me first
  try {
    const me = await getMe(token);
    if (me?.id) return { ...loginResponse, ...me };
  } catch {}

  // Backend doesn't expose /api/me — search by username to get the numeric ID
  if (loginResponse.username) {
    try {
      const result = await getUserByUsername(loginResponse.username, token);
      const members: any[] = result?.['hydra:member'] ?? result?.data ?? [];
      const match = members.find((u: any) => u.username === loginResponse.username);
      if (match?.id) return { ...loginResponse, id: match.id };
    } catch {}
  }

  return loginResponse;
};

function* userLoginAsync(
  action: { type: string; payload: { username: string; password: string } }
): Generator {
  yield put({ type: USER_LOGIN_REQUEST });
  try {
    const response: any = yield call(authLogin, action.payload);
    const enriched: any = yield call(enrichWithProfile, response);
    console.log('Enriched login payload keys:', Object.keys(enriched), '| id:', enriched.id);
    yield put({ type: USER_LOGIN_COMPLETED, payload: enriched });
  } catch (error: any) {
    yield put({ type: USER_LOGIN_ERROR, payload: error.message });
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────

function* userRegisterAsync(
  action: { type: string; payload: { username: string; email: string; password: string } }
): Generator {
  yield put({ type: USER_REGISTER_REQUEST });
  try {
    const response: any = yield call(authRegister, action.payload);
    yield put({ type: USER_REGISTER_COMPLETED, payload: response });
  } catch (error: any) {
    yield put({ type: USER_REGISTER_ERROR, payload: error.message });
  }
}

// ─── Google Login ─────────────────────────────────────────────────────────────

function* userGoogleLoginAsync(): Generator {
  yield put({ type: USER_LOGIN_REQUEST });
  try {
    const result: any = yield call(signInWithGoogle);

    if (!result) {
      yield put({ type: USER_LOGIN_ERROR, payload: 'Google sign-in cancelled' });
      return;
    }

    const idToken = result.idToken ?? result.data?.idToken;
    if (!idToken) throw new Error('Could not retrieve idToken from Google');

    const backendResponse: any = yield call(authenticateWithBackend, idToken);
    const enriched: any = yield call(enrichWithProfile, backendResponse);
    yield put({ type: USER_LOGIN_COMPLETED, payload: enriched });

  } catch (error: any) {
    yield put({ type: USER_LOGIN_ERROR, payload: error.message });
  }
}

// ─── Watchers ─────────────────────────────────────────────────────────────────

export function* watchUserLogin(): Generator {
  yield takeEvery(USER_LOGIN, userLoginAsync);
}

export function* watchUserRegister(): Generator {
  yield takeEvery(USER_REGISTER, userRegisterAsync);
}

export function* watchUserGoogleLogin(): Generator {
  yield takeEvery(USER_GOOGLE_LOGIN, userGoogleLoginAsync);
}