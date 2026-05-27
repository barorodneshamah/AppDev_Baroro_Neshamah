// src/app/reducers/wall.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WallComment {
  id: string;
  authorId: number;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface WallPost {
  id: string;
  authorId: number;
  authorName: string;
  authorRole: string;
  caption: string;
  imageUri?: string;
  serviceTag?: string;
  rating?: number;
  likedBy: number[];
  savedBy: number[];
  comments: WallComment[];
  createdAt: string;
}

interface WallState {
  posts: WallPost[];
  sharedReservationIds: number[];
  rescheduledReservationIds: number[];
}

const wallSlice = createSlice({
  name: 'wall',
  initialState: { posts: [], sharedReservationIds: [], rescheduledReservationIds: [] } as WallState,
  reducers: {
    addPost: (state, action: PayloadAction<WallPost>) => {
      state.posts.unshift(action.payload);
    },
    toggleLike: (state, action: PayloadAction<{ postId: string; userId: number }>) => {
      const post = state.posts.find(p => p.id === action.payload.postId);
      if (!post) return;
      const idx = post.likedBy.indexOf(action.payload.userId);
      if (idx === -1) post.likedBy.push(action.payload.userId);
      else post.likedBy.splice(idx, 1);
    },
    toggleSave: (state, action: PayloadAction<{ postId: string; userId: number }>) => {
      const post = state.posts.find(p => p.id === action.payload.postId);
      if (!post) return;
      const idx = post.savedBy.indexOf(action.payload.userId);
      if (idx === -1) post.savedBy.push(action.payload.userId);
      else post.savedBy.splice(idx, 1);
    },
    addComment: (state, action: PayloadAction<{ postId: string; comment: WallComment }>) => {
      const post = state.posts.find(p => p.id === action.payload.postId);
      if (post) post.comments.push(action.payload.comment);
    },
    removePost: (state, action: PayloadAction<string>) => {
      state.posts = state.posts.filter(p => p.id !== action.payload);
    },
    markReservationShared: (state, action: PayloadAction<number>) => {
      if (!state.sharedReservationIds.includes(action.payload)) {
        state.sharedReservationIds.push(action.payload);
      }
    },
    setSharedReservationIds: (state, action: PayloadAction<number[]>) => {
      state.sharedReservationIds = action.payload;
    },
    markReservationRescheduled: (state, action: PayloadAction<number>) => {
      if (!state.rescheduledReservationIds.includes(action.payload)) {
        state.rescheduledReservationIds.push(action.payload);
      }
    },
  },
});

export const { addPost, toggleLike, toggleSave, addComment, removePost, markReservationShared, setSharedReservationIds, markReservationRescheduled } = wallSlice.actions;
export default wallSlice.reducer;
