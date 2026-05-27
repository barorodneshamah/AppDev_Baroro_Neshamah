// src/services/notificationPoller.ts
// Polls backend notification endpoints and dispatches in-app notifications
// when new replies appear for the logged-in user's messages.
// This is the reliable fallback for when the WS server does not push events.

import { Vibration } from 'react-native';
import { store } from '../store';
import { addNotification } from '../app/reducers/notifications';
import {
  getAdminPendingNotifications,
  getContactMessages,
  getContactReplies,
  getPayments,
  getReservations,
} from '../app/api/api';

const seenReplyIds = new Set<number>();
const seenMsgIds   = new Set<number>();
const seenAdminNotificationIds = new Set<string>();
const seenAdminReplyIds = new Set<number>();
const seenReservationStatuses = new Map<number, string>();
const seenPaymentStatuses = new Map<number, string>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isFirstPoll = true;
let lastAdminPollSeconds = 0;
let pollStartedSeconds = 0;

const notificationIdFor = (item: any): string => `${item.type ?? 'general'}-${item.id}`;

const collectionOf = (response: any): any[] =>
  response?.['hydra:member'] ?? response?.member ?? response?.data ?? (Array.isArray(response) ? response : []);

const resourceId = (value: any): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const id = value.match(/\/(\d+)$/)?.[1] ?? value;
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value?.id != null) return resourceId(value.id);
  if (value?.['@id']) return resourceId(value['@id']);
  return undefined;
};

const resourceIri = (value: any, collection: string): string | undefined => {
  if (typeof value === 'string') return value;
  const id = resourceId(value);
  return id ? `/api/${collection}/${id}` : undefined;
};

const dispatchAdminNotification = (item: any): void => {
  const id = notificationIdFor(item);
  if (seenAdminNotificationIds.has(id)) return;

  seenAdminNotificationIds.add(id);
  store.dispatch(addNotification({
    id,
    title:     item.type === 'payment'
      ? 'New Customer Payment'
      : item.type === 'reservation'
        ? 'New Customer Reservation'
        : 'New Customer Message',
    body:      [item.message, item.detail].filter(Boolean).join(' - '),
    type:      item.type ?? 'general',
    read:      false,
    createdAt: item.createdAt ?? new Date().toISOString(),
    data:      {
      itemId: item.id,
      url: item.url,
      reservationId: item.type === 'reservation' ? item.id : undefined,
      paymentId: item.type === 'payment' ? item.id : undefined,
      messageId: item.type === 'message' ? item.id : undefined,
    },
  }));
  Vibration.vibrate(250);
  console.log('[Poller] admin notification dispatched:', id);
};

const dispatchNewCustomerMessage = (message: any): void => {
  const messageId = Number(message?.id);
  if (!messageId) return;

  dispatchAdminNotification({
    type: 'message',
    id: messageId,
    message: `New message from ${message?.fullName || 'Guest'}`,
    detail: message?.subject || 'No subject',
    createdAt: message?.createdAt ?? new Date().toISOString(),
    url: `/dashboard/messages/${messageId}`,
  });
};

const replyContactMessageId = (reply: any): number | undefined => {
  return resourceId(reply?.contactMessage);
};

const replyAuthorId = (reply: any): number | undefined => {
  return resourceId(reply?.repliedBy);
};

const replyText = (reply: any): string =>
  String(reply?.replyMessage ?? reply?.message ?? reply?.body ?? '').trim();

const dispatchCustomerReplyToStaff = (reply: any, messagesById: Map<number, any>, currentUserId: number | null): void => {
  const replyId = Number(reply?.id);
  if (!replyId || seenAdminReplyIds.has(replyId)) return;

  const messageId = replyContactMessageId(reply);
  if (!messageId) return;

  const authorId = replyAuthorId(reply);
  if (currentUserId && authorId === currentUserId) {
    seenAdminReplyIds.add(replyId);
    return;
  }

  const message = messagesById.get(messageId);
  const authorEmail = typeof reply?.repliedBy === 'object' ? reply.repliedBy?.email : undefined;
  const isCustomerReply = !authorEmail || !message?.email || authorEmail === message.email;
  if (!isCustomerReply) {
    seenAdminReplyIds.add(replyId);
    return;
  }

  seenAdminReplyIds.add(replyId);
  store.dispatch(addNotification({
    id:        `customer-reply-${replyId}`,
    title:     'Customer Replied',
    body:      `${message?.fullName ?? 'Customer'}: ${replyText(reply) || 'New reply'}`,
    type:      'message',
    read:      false,
    createdAt: reply.createdAt ?? new Date().toISOString(),
    data:      { messageId },
  }));
  Vibration.vibrate(250);
  console.log('[Poller] customer reply notification dispatched:', replyId);
};

const poll = async (): Promise<void> => {
  const state = store.getState();
  const token = state.auth.token;
  const email = (state.auth.data as any)?.email as string | undefined;
  const userId: number | null = (state.auth.data as any)?.id ?? null;
  const roles: string[] = (state.auth.data as any)?.roles ?? [];
  const isAdminOrStaff = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_STAFF');

  if (!token) return;

  try {
    if (isAdminOrStaff) {
      const [adminRes, msgRes, repRes] = await Promise.all([
        getAdminPendingNotifications(lastAdminPollSeconds || undefined, token),
        getContactMessages(token),
        getContactReplies(token),
      ]);
      const notifications: any[] = adminRes?.notifications ?? [];
      const messages = collectionOf(msgRes);
      const replies = collectionOf(repRes);
      const messagesById = new Map(messages.map((message: any) => [Number(message.id), message]));
      const pollStartedAt = Math.floor(Date.now() / 1000);

      notifications.forEach(dispatchAdminNotification);
      messages
        .filter(message => {
          const createdSeconds = Math.floor(new Date(message?.createdAt ?? 0).getTime() / 1000);
          return createdSeconds >= lastAdminPollSeconds;
        })
        .forEach(dispatchNewCustomerMessage);
      replies
        .filter(reply => {
          const createdSeconds = Math.floor(new Date(reply?.createdAt ?? 0).getTime() / 1000);
          return createdSeconds >= lastAdminPollSeconds;
        })
        .forEach(reply => dispatchCustomerReplyToStaff(reply, messagesById, userId));

      isFirstPoll = false;
      lastAdminPollSeconds = pollStartedAt - 1;
      return;
    }

    const [msgRes, repRes, resRes, payRes] = await Promise.all([
      getContactMessages(token),
      getContactReplies(token),
      getReservations(token),
      getPayments(token),
    ]);

    const msgs: any[] = collectionOf(msgRes);
    const reps: any[] = collectionOf(repRes);
    const reservations: any[] = collectionOf(resRes);
    const payments: any[] = collectionOf(payRes);

    if (isFirstPoll) {
      msgs.forEach(m => seenMsgIds.add(m.id));
      reps
        .filter(r => Math.floor(new Date(r?.createdAt ?? 0).getTime() / 1000) < pollStartedSeconds)
        .forEach(r => seenReplyIds.add(r.id));
      reservations.forEach(r => seenReservationStatuses.set(Number(r.id), String(r.status ?? '')));
      payments.forEach(p => seenPaymentStatuses.set(Number(p.id), String(p.status ?? '')));
      isFirstPoll = false;
    }

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
        const repliedByIRI = resourceIri(r.repliedBy, 'users');
        if (myIRI && repliedByIRI === myIRI) return false;
        const iri = resourceIri(r.contactMessage, 'contact_messages');
        return !!iri && myMsgIRIs.has(iri);
      });

      reps.forEach(r => seenReplyIds.add(r.id));

      newReplies.forEach(r => {
        const msgId = replyContactMessageId(r);
        store.dispatch(addNotification({
          id:        `reply-${r.id}`,
          title:     'New Reply from Support',
          body:      r.replyMessage ?? 'You have a new reply from our team.',
          type:      'message',
          read:      false,
          createdAt: r.createdAt ?? new Date().toISOString(),
          data:      { messageId: msgId },
        }));
        Vibration.vibrate(250);
        console.log('[Poller] new reply notification dispatched, id:', r.id);
      });

      reservations.forEach(r => {
        const id = Number(r.id);
        const nextStatus = String(r.status ?? '');
        const previousStatus = seenReservationStatuses.get(id);
        seenReservationStatuses.set(id, nextStatus);
        if (!previousStatus || previousStatus === nextStatus) return;

        store.dispatch(addNotification({
          id:        `reservation-${id}-${nextStatus}`,
          title:     'Reservation Updated',
          body:      `Your reservation ${r.reservationCode ?? `#${id}`} is now ${nextStatus.toLowerCase()}.`,
          type:      'reservation',
          read:      false,
          createdAt: new Date().toISOString(),
          data:      { reservationId: id },
        }));
        Vibration.vibrate(250);
      });

      payments.forEach(p => {
        const id = Number(p.id);
        const nextStatus = String(p.status ?? '');
        const previousStatus = seenPaymentStatuses.get(id);
        seenPaymentStatuses.set(id, nextStatus);
        if (!previousStatus || previousStatus === nextStatus) return;

        store.dispatch(addNotification({
          id:        `payment-${id}-${nextStatus}`,
          title:     'Payment Updated',
          body:      `Your payment ${p.transactionReference ?? p.transactionRef ?? `#${id}`} is now ${nextStatus.toLowerCase()}.`,
          type:      'payment',
          read:      false,
          createdAt: new Date().toISOString(),
          data:      { paymentId: id },
        }));
        Vibration.vibrate(250);
      });
  } catch (e) {
    // silent — network may be unavailable
  }
};

export const startPolling = (): void => {
  if (pollTimer) return;
  isFirstPoll = true;
  seenReplyIds.clear();
  seenAdminNotificationIds.clear();
  seenAdminReplyIds.clear();
  lastAdminPollSeconds = Math.floor(Date.now() / 1000) - 5;
  pollStartedSeconds = lastAdminPollSeconds;

  // First poll after 3 s so auth/token has fully settled
  setTimeout(poll, 3_000);

  // Then keep the mobile bell close to real-time even when push or WS is unavailable.
  pollTimer = setInterval(poll, 15_000);
  console.log('[Poller] started');
};

export const stopPolling = (): void => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  seenReplyIds.clear();
  seenMsgIds.clear();
  seenAdminNotificationIds.clear();
  seenAdminReplyIds.clear();
  seenReservationStatuses.clear();
  seenPaymentStatuses.clear();
  isFirstPoll = true;
  lastAdminPollSeconds = 0;
  pollStartedSeconds = 0;
  console.log('[Poller] stopped');
};
