import { all, SagaIterator } from 'redux-saga/effects';
import { userLogin, userRegister } from './auth';

export default function* rootSaga(): SagaIterator {
  yield all([userLogin(), userRegister()]);
}
