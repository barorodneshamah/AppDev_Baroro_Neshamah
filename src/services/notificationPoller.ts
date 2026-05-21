// src/services/notificationPoller.ts
// Polls /api/contact_replies every 30 s and dispatches in-app notifications
// when new replies appear for the logged-in user's messages.
// This is the reliable fallback for when the WS server does not push events.

import { store } from '../store';
import { addNotification } from '../app/reducers/notifications';
import { getContactMessages, getContactReplies } from '../app/api/api';

const seenReplyIds = new Set<number>();
const seenMsgIds   = new Set<number>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isFirstPoll = true;

const poll = async (): Promise<void> => {
  const state = store.getState();
  const token = state.auth.token;
  const email = (state.auth.data as any)?.email as string | undefined;
  const userId: number | null = (state.auth.data as any)?.id ?? null;
  const roles: string[] = (state.auth.data as any)?.roles ?? [];
  const isAdminOrStaff = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_STAFF');

  if (!token) return;

  try {
    const [msgRes, repRes] = await Promise.all([
      getContactMessages(token),
      getContactReplies(token),
    ]);

    const pick = (r: any): any[] =>
      r?.['hydra:member'] ?? r?.data ?? (Array.isArray(r) ? r : []);

    const msgs: any[] = pick(msgRes);
    const reps: any[] = pick(repRes);

    if (isFirstPoll) {
      msgs.forEach(m => seenMsgIds.add(m.id));
      reps.forEach(r => seenReplyIds.add(r.id));
      isFirstPoll = false;
      return;
    }

    if (isAdminOrStaff) {
      // Notify admin/staff of any new customer message
      const newMsgs = msgs.filter(m => !seenMsgIds.has(m.id));
      msgs.forEach(m => seenMsgIds.add(m.id));
      newMsgs.forEach(m => {
        const preview = (m.subject ?? m.message ?? '').slice(0, 60);
        store.dispatch(addNotification({
          id:        `new-msg-${m.id}-${Date.now()}`,
          title:     'New Customer Message',
          body:      `${m.fullName ?? m.name ?? 'Customer'}: ${preview}`,
          type:      'message',
          read:      false,
          createdAt: m.createdAt ?? new Date().toISOString(),
          data:      { messageId: m.id },
        }));
        console.log('[Poller] new customer message notification, id:', m.id);
      });
    } else {
      // Notify customer of new replies to their own messages
      const myMsgIRIs = new Set(
        msgs
          .filter(m => !email || m.email === email)
          .map(m => `/api/contact_messages/${m.id}`),
      );

      const myIRI = userId ? `/api/users/${userId}` : null;

      const newReplies = reps.filter(r => {
        if (seenReplyIds.has(r.id)) return false;
        // Don't notify the customer about their own replies
        const repliedByIRI =
          typeof r.repliedBy === 'string' ? r.repliedBy : `/api/users/${r.repliedBy?.id}`;
        if (myIRI && repliedByIRI === myIRI) return false;
        const iri =
          typeof r.contactMessage === 'string'
            ? r.contactMessage
            : `/api/contact_messages/${r.contactMessage?.id}`;
        return myMsgIRIs.has(iri);
      });

      reps.forEach(r => seenReplyIds.add(r.id));

      newReplies.forEach(r => {
        store.dispatch(addNotification({
          id:        `reply-${r.id}-${Date.now()}`,
          title:     'New Reply from Support',
          body:      r.replyMessage ?? 'You have a new reply from our team.',
          type:      'message',
          read:      false,
          createdAt: r.createdAt ?? new Date().toISOString(),
        }));
        console.log('[Poller] new reply notification dispatched, id:', r.id);
      });
    }
  } catch (e) {
    // silent — network may be unavailable
  }
};

export const startPolling = (): void => {
  if (pollTimer) return;
  isFirstPoll = true;
  seenReplyIds.clear();

  // First poll after 3 s so auth/token has fully settled
  setTimeout(poll, 3_000);

  // Then every 30 s
  pollTimer = setInterval(poll, 30_000);
  console.log('[Poller] started');
};

export const stopPolling = (): void => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  seenReplyIds.clear();
  seenMsgIds.clear();
  isFirstPoll = true;
  console.log('[Poller] stopped');
};