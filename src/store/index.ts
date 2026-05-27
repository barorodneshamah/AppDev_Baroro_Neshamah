// src/store/index.ts
import { configureStore }        from '@reduxjs/toolkit';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import auth                      from '../app/reducers/auth';
import notifications             from '../app/reducers/notifications';
import wall                      from '../app/reducers/wall';
import wsStatus                  from '../app/reducers/wsStatus';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: { auth, notifications, wall, wsStatus },
  middleware: (getDefault) =>
    getDefault({ thunk: false, serializableCheck: false }).concat(sagaMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export const runSaga = sagaMiddleware.run as SagaMiddleware['run'];
