import React from 'react';
import { View } from 'react-native';
import { Provider } from 'react-redux';
import { store, runSaga } from './src/store';
import rootSaga from './src/app/sagas/index';
import AppNavigationNi from './src/navigations';
import ErrorBoundary from './src/components/ErrorBoundary';

runSaga(rootSaga);

const App = () => (
  <ErrorBoundary>
    <Provider store={store}>
      <View style={{ flex: 1 }}>
        <AppNavigationNi />
      </View>
    </Provider>
  </ErrorBoundary>
);

export default App;
