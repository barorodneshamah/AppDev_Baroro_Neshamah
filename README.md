# Baroro Mobile App

React Native mobile app for La Casa Gaudencia. The app supports customers, staff, and admins from the same codebase with role-based navigation and API access.

Backend companion project: `la_casa_gaudencia`  
Backend stack: Symfony, API Platform, MySQL, JWT auth

## Requirements

- Node.js 20 or newer
- npm
- Android Studio for Android builds
- Xcode and CocoaPods for iOS builds
- Running La Casa Gaudencia backend API
- Phone/emulator connected to the same network as the backend server when testing on device

## Quick Start

Install dependencies:

```bash
npm install
```

Set the API server URL in:

```text
src/config/api.config.ts
```

Use your computer LAN IP when testing on a physical phone, for example:

```ts
export const API_BASE_URL = 'http://192.168.1.10:8000';
```

Start Metro:

```bash
npm start
```

Run Android:

```bash
npm run android
```

Run iOS:

```bash
cd ios
pod install
cd ..
npm run ios
```

## Backend Startup

From the Symfony backend project:

```bash
symfony serve --allow-all-ip --port=8000 --no-tls or
symfony server:start
php -S 0.0.0.0:8000 -t public
```

Start the WebSocket server if real-time notifications are needed:

```bash
cd websocket-server
node server.js
```

The mobile app also has a polling fallback for notifications, so the app can still detect new messages, reservation updates, and payment updates if push or WebSocket delivery is unavailable.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start Metro bundler |
| `npm run android` | Build and run Android app |
| `npm run ios` | Build and run iOS app |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest |

## Main Features

### Customer

- Browse rooms, tours, dining, spa services, and packages
- View service details, pricing, photos, and reviews
- Create reservations
- Submit payments with proof upload
- Request reschedules and extensions
- Track booking and payment status
- Message support and view reply threads
- Receive notifications for replies, reservations, and payments
- Share posts on the community Share Wall

### Staff

- Dashboard for operational status
- Manage services: rooms, tours, dining, spa, and packages
- Upload service images from device gallery
- Approve, reject, complete, and mark reservations paid
- Review and approve payments
- Reply to customer messages
- Receive highlighted message notifications
- Moderate Share Wall posts

### Admin

- All staff capabilities
- Manage users
- View user details
- View activity logs
- Admin dashboard statistics
- Admin message notification highlighting
- Full Share Wall moderation

## Project Structure

```text
src/
  app/
    api/                 API clients and fetch wrappers
    reducers/            Redux slices
    sagas/               Auth side effects
  components/            Shared UI components and app modals
  config/                API and Firebase configuration
  navigations/           Auth, customer, staff, and admin navigators
  screens/
    auth/                Login, register, landing
    admin/               Admin-only screens
    staff/               Staff-only screens
    shared/              Admin/staff shared management screens
  services/              Notifications, WebSocket, auth helpers
  store/                 Redux store
  theme/                 Colors, fonts, spacing, radius, shadows
  utils/                 Routes and helpers
```

## Important Files

| File | Purpose |
| --- | --- |
| `src/config/api.config.ts` | Backend API base URL |
| `src/app/api/api.ts` | Main API functions |
| `src/navigations/index.tsx` | Role-based root navigation |
| `src/navigations/MainNav.tsx` | Customer tabs |
| `src/navigations/StaffNav.tsx` | Staff tabs |
| `src/navigations/AdminNav.tsx` | Admin tabs |
| `src/screens/shared/ServiceFormScreen.tsx` | Admin/staff create/edit services |
| `src/screens/shared/ReservationDetailScreen.tsx` | Reservation approval and reschedule actions |
| `src/screens/shared/MessagesScreen.tsx` | Admin/staff message list |
| `src/screens/MessagesScreen.tsx` | Customer support messages |
| `src/screens/ShareWallScreen.tsx` | Community wall and moderation |
| `src/services/notificationPoller.ts` | Notification fallback polling |
| `src/services/websocketService.ts` | WebSocket notifications |

## Authentication

The app uses JWT authentication from the Symfony backend.

- Login and registration are handled through Redux Saga.
- Authenticated requests send `Authorization: Bearer <token>`.
- Navigation is selected by role:
  - customer/user: `MainNav`
  - staff: `StaffNav`
  - admin: `AdminNav`

## API Notes

Common endpoints used by the app:

| Area | Endpoint |
| --- | --- |
| Login | `POST /api/login` |
| Register | `POST /api/register` |
| Current user | `GET /api/me` |
| Rooms | `GET /api/services/rooms` |
| Tours | `GET /api/services/tours` |
| Dining | `GET /api/services/food` |
| Spa | `GET /api/spas` |
| Packages | `GET /api/services/packages` |
| Reservations | `GET /api/reservations` |
| Payments | `GET /api/payments` |
| Messages | `GET /api/contact_messages` |
| Replies | `GET /api/contact_replies` |
| Share Wall | `GET /api/wall/posts` |

Collections may be returned as `hydra:member`, `member`, `data`, or plain arrays depending on the backend route. The mobile API helpers and screens normalize these shapes where needed.

## Notifications

The app supports several notification paths:

- Firebase Cloud Messaging for push notifications
- WebSocket notifications from the backend server
- `notificationPoller.ts` fallback for:
  - new customer messages for admin/staff
  - customer replies
  - reservation status changes
  - payment status changes

Admin/staff message lists highlight new or unread customer messages with a light warning color and a new-message badge.

## Service Management

Admin and staff can create and update:

- Rooms
- Tours
- Dining items
- Spa and wellness services
- Packages

Service images can be picked from the device gallery and uploaded through the backend. Packages can include available services and calculate package pricing from selected items.

## Troubleshooting

### App cannot connect to backend

- Make sure the backend is running with `--allow-all-ip`.
- Use the computer LAN IP in `src/config/api.config.ts`, not `localhost`, when using a phone.
- Confirm phone and computer are on the same WiFi network.
- Check Windows firewall if the phone cannot reach port `8000`.

### Image upload fails

- Confirm the user role is staff or admin.
- Confirm the backend route allows authenticated staff/admin upload.
- Rebuild the app after changing Android permissions or native dependencies.

### New messages are not highlighted

- Confirm `notificationPoller.ts` is running after login.
- Confirm the admin/staff account has `ROLE_STAFF` or `ROLE_ADMIN`.
- Pull to refresh the Messages tab.
- Check that `/api/admin/notifications/pending` and `/api/contact_messages` are reachable.

### Metro shows old UI

Reload the app bundle:

```bash
npm start -- --reset-cache
```

Then rebuild or reload the app.

## Development Checklist

- Backend running on port `8000`
- WebSocket server running on port `9090` if testing real-time updates
- `API_BASE_URL` points to the correct server IP
- Metro running
- Android emulator or physical device connected
- Test customer, staff, and admin accounts available

