import { applyMiddleware, combineReducers, createStore, Store } from 'redux';
import { persistReducer, persistStore, Persistor } from 'redux-persist';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '../reducers/auth';

interface RootState {
  auth: any;
}

interface StoreConfig {
  store: Store<RootState>;
  persistor: Persistor;
  runSaga: SagaMiddleware['run'];
}

const sagaMiddleware = createSagaMiddleware<RootState>();

const rootPersistConfig = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: ['auth'],
};

const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  blacklist: [],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, auth),
});

const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

export default (): StoreConfig => {
  let store = createStore(persistedReducer, applyMiddleware(sagaMiddleware));
  let persistor = persistStore(store);
  const runSaga = sagaMiddleware.run;
  return { store, persistor, runSaga };
};
