// src/services/authService.ts
// Auth token is managed exclusively in the Redux store.
// Use the Redux selector `state.auth.token` wherever the token is needed.
export { signInWithGoogle, authenticateWithBackend } from '../config/firebase';
