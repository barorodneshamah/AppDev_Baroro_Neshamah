// src/app/sagas/index.ts
import { all } from 'redux-saga/effects';
import { watchUserLogin, watchUserRegister, watchUserGoogleLogin } from './auth';

export default function* rootSaga() {
  yield all([
    watchUserLogin(),
    watchUserRegister(),
    watchUserGoogleLogin(),
  ]);
}