// src/app/reducers/wsStatus.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WsStatusState {
  connected:    boolean;
  reconnecting: boolean;
}

const wsStatusSlice = createSlice({
  name: 'wsStatus',
  initialState: { connected: false, reconnecting: false } as WsStatusState,
  reducers: {
    setWsConnected: (state, action: PayloadAction<boolean>) => {
      state.connected    = action.payload;
      state.reconnecting = false;
    },
    setWsReconnecting: (state) => {
      state.connected    = false;
      state.reconnecting = true;
    },
  },
});

export const { setWsConnected, setWsReconnecting } = wsStatusSlice.actions;
export default wsStatusSlice.reducer;
