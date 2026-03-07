import React from 'react';
import { View } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import configureStore from './src/app/reducers/index';
import rootSaga from './src/app/sagas/index';
import AppNavigationNi from './src/navigations';

const { store, persistor, runSaga } = configureStore();
runSaga(rootSaga);

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <View style={{ flex: 1 }}>
          <AppNavigationNi />
        </View>
      </PersistGate>
    </Provider>
  );
};

export default App;