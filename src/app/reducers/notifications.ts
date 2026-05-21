// src/app/reducers/notifications.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppNotification {
  id:        string;
  title:     string;
  body:      string;
  type:      string;
  read:      boolean;
  createdAt: string;
  data?:     Record<string, any>;
}

interface NotificationsState {
  items: AppNotification[];
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [] } as NotificationsState,
  reducers: {
    addNotification: (state, action: PayloadAction<AppNotification>) => {
      // Avoid duplicates by id
      if (!state.items.find(n => n.id === action.payload.id)) {
        state.items.unshift(action.payload);
      }
    },
    markRead: (state, action: PayloadAction<string>) => {
      const n = state.items.find(i => i.id === action.payload);
      if (n) n.read = true;
    },
    markAllRead: (state) => {
      state.items.forEach(i => { i.read = true; });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.items = [];
    },
  },
});

export const {
  addNotification,
  markRead,
  markAllRead,
  removeNotification,
  clearNotifications,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;