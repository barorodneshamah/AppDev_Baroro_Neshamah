# Baroro — Customer Mobile App

React Native 0.83 mobile app for La Casa Gaudencia guests, staff, and admins.  
Backend: Symfony 6 + API Platform · Database: MySQL · Auth: JWT

---

## Requirements

- Node.js 20+
- npm or yarn
- Android Studio (for Android) or Xcode (for iOS)
- A running instance of the La Casa Gaudencia backend API

---

## Setup & Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure the backend URL
# Edit src/config/api.config.ts and set API_BASE_URL to your server IP, e.g.:
#   export const API_BASE_URL = 'http://192.168.1.x:8000';

# 3. Start Metro bundler
npm start

# 4a. Run on Android
npm run android

# 4b. Run on iOS (Mac only)
cd ios && pod install && cd ..
npm run ios
```

> **Important:** The Symfony backend must be started with:
> ```bash
> symfony server:start --allow-all-ip
> ```
> so devices on the same local network can reach it.  
> The WebSocket notification server runs separately on port 9090.

---

## Features by Role

### Guest (Customer)
- Browse rooms, tours, packages, food & spa services (Home + Explore)
- Search and filter all services by keyword or category
- View service detail pages with image gallery and reviews
- Create reservations with date selection and guest details
- View all own reservations with real-time status tracking
- Submit payment with proof of payment upload
- Message support team and view reply threads
- Update profile and change password
- Receive in-app notifications for booking updates and support replies

### Staff
- View and manage reservations (approve / reject / complete)
- View and manage payments (approve / reject / refund)
- Manage services (rooms, tours, food, packages, spa)
- Reply to customer messages
- Dashboard with service statistics and notification bell

### Admin
- All Staff capabilities
- User management (create / edit / delete)
- Activity log viewer
- Sales overview and system statistics

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Username + password login |
| POST | `/api/register` | New customer registration |
| POST | `/api/auth/google` | Google OAuth2 sign-in |

- **Token storage:** JWT token stored **in Redux only** — no AsyncStorage or local storage
- **Token usage:** Sent as `Authorization: Bearer <token>` header on every protected request
- **Session lifetime:** Token lives in memory; logging out clears Redux state entirely
- **Protected navigation:** Unauthenticated users see only Login/Register screens

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── api.ts          # All API call functions
│   │   └── apiFetch.ts     # Generic authenticated fetch wrapper
│   ├── reducers/
│   │   ├── auth.ts         # JWT token + user data state
│   │   └── notifications.ts # In-app notification state
│   └── sagas/
│       ├── auth.ts         # Login / register / logout side effects
│       └── index.ts        # Root saga
├── config/
│   ├── api.config.ts       # ← Change API_BASE_URL here
│   └── firebase.ts         # Firebase + Google Sign-In setup
├── navigations/
│   ├── index.tsx           # Role-based root navigator
│   ├── AuthNav.tsx         # Login / Register stack
│   ├── MainNav.tsx         # Customer tab navigator
│   ├── AdminNav.tsx        # Admin tab navigator (7 tabs)
│   └── StaffNav.tsx        # Staff tab navigator (6 tabs)
├── screens/
│   ├── auth/               # Login.tsx, Register.tsx
│   ├── admin/              # AdminDashboardScreen.tsx
│   ├── staff/              # StaffDashboardScreen.tsx
│   ├── shared/             # Screens shared by Admin + Staff
│   ├── HomeScreen.tsx
│   ├── ExploreScreen.tsx
│   ├── BookingsScreen.tsx
│   ├── MessagesScreen.tsx
│   ├── NotificationsScreen.tsx
│   └── ProfileScreen.tsx
├── services/
│   ├── websocketService.ts   # WS client for real-time push
│   └── notificationPoller.ts # 30-second fallback poller
├── store/                  # Redux store + RootState type
└── theme/                  # COLORS, FONTS, RADIUS, SHADOW, SPACING
```

---

## Scripts

| Command | Action |
|---------|--------|
| `npm start` | Start Metro bundler |
| `npm run android` | Build and run on Android |
| `npm run ios` | Build and run on iOS |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |

---

## API Reference

Base URL: `http://<server-ip>:8000`  
All protected endpoints require: `Authorization: Bearer <JWT>`  
All responses are JSON. Collections use the **Hydra** format: `{ "hydra:member": [...], "hydra:totalItems": n }`

---

### 1. Authentication

#### POST `/api/login`
Login with username and password.

**Request**
```json
{
  "username": "john_doe",
  "password": "secret123"
}
```

**Response 200**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
}
```

**Response 401**
```json
{
  "error": "Invalid credentials."
}
```

---

#### POST `/api/register`
Register a new customer account.

**Request**
```json
{
  "username": "jane_doe",
  "email": "jane@example.com",
  "password": "password123"
}
```

**Response 201**
```json
{
  "message": "Registration successful",
  "user": {
    "id": 42,
    "username": "jane_doe",
    "email": "jane@example.com",
    "roles": ["ROLE_GUEST"]
  }
}
```

**Response 400** — Validation failure
```json
{
  "violations": [
    { "propertyPath": "email", "message": "This value is not a valid email address." }
  ]
}
```

---

#### GET `/api/me` 🔒
Get the currently authenticated user's profile.

**Response 200**
```json
{
  "id": 42,
  "username": "jane_doe",
  "email": "jane@example.com",
  "fullName": "Jane Doe",
  "roles": ["ROLE_GUEST"],
  "createdAt": "2025-01-15T08:30:00+08:00"
}
```

---

### 2. Services (Customer — Browse)

#### GET `/api/services/rooms` 🔒
List all available rooms.

**Response 200**
```json
{
  "hydra:member": [
    {
      "id": 1,
      "name": "Deluxe Suite",
      "description": "Spacious suite with garden view",
      "pricePerNight": "3500.00",
      "capacity": 2,
      "status": "Available",
      "mainImage": "/uploads/rooms/deluxe.jpg",
      "category": "Suite"
    }
  ],
  "hydra:totalItems": 8
}
```

---

#### GET `/api/services/tours` 🔒
List all available tours.

**Response 200**
```json
{
  "hydra:member": [
    {
      "id": 3,
      "name": "Waterfall Trek",
      "description": "Half-day guided trek to the falls",
      "price": "800.00",
      "duration": "4 hours",
      "maxParticipants": 15,
      "status": "Available",
      "mainImage": "/uploads/tours/waterfall.jpg"
    }
  ],
  "hydra:totalItems": 5
}
```

---

#### GET `/api/services/packages` 🔒
List all resort packages.

#### GET `/api/services/food` 🔒
List all dining menu items.

#### GET `/api/spas` 🔒
List all spa & wellness services.

**Response 200**
```json
{
  "hydra:member": [
    {
      "id": 2,
      "name": "Deep Tissue Massage",
      "description": "Therapeutic 60-minute massage",
      "price": "1200.00",
      "duration": "60 mins",
      "capacity": 1,
      "category": "Massage",
      "status": "Available",
      "mainImage": "/uploads/spa/massage.jpg"
    }
  ],
  "hydra:totalItems": 6
}
```

---

### 3. Reservations

#### POST `/api/reservations` 🔒
Create a new reservation.

**Request — Room booking**
```json
{
  "serviceType": "room",
  "room": "/api/rooms/1",
  "checkInDate": "2025-06-10",
  "checkOutDate": "2025-06-13",
  "numberOfGuests": 2,
  "specialRequests": "Late check-in requested",
  "contactPhone": "09171234567"
}
```

**Request — Tour booking**
```json
{
  "serviceType": "tour",
  "tour": "/api/tours/3",
  "tourDate": "2025-06-15",
  "tourParticipants": 4,
  "contactPhone": "09171234567"
}
```

**Response 201**
```json
{
  "id": 101,
  "referenceCode": "RES-2025-101",
  "serviceType": "room",
  "status": "pending",
  "totalAmount": "10500.00",
  "checkInDate": "2025-06-10T00:00:00+08:00",
  "checkOutDate": "2025-06-13T00:00:00+08:00",
  "createdAt": "2025-05-22T10:15:00+08:00"
}
```

**Response 422**
```json
{
  "hydra:description": "Room is not available for the selected dates."
}
```

---

#### GET `/api/reservations` 🔒
List reservations. Customers see only their own; Admin/Staff see all.

**Response 200**
```json
{
  "hydra:member": [
    {
      "id": 101,
      "referenceCode": "RES-2025-101",
      "serviceType": "room",
      "status": "pending",
      "totalAmount": "10500.00",
      "checkInDate": "2025-06-10T00:00:00+08:00",
      "checkOutDate": "2025-06-13T00:00:00+08:00"
    }
  ],
  "hydra:totalItems": 3
}
```

---

#### GET `/api/reservations/{id}` 🔒
Get a single reservation by ID.

---

#### POST `/api/reservations/{id}/approve` 🔒 *(Admin/Staff)*
Approve a pending reservation.

**Response 200**
```json
{ "message": "Reservation approved.", "status": "confirmed" }
```

#### POST `/api/reservations/{id}/reject` 🔒 *(Admin/Staff)*
Reject a reservation with notes.

**Request**
```json
{ "notes": "No availability for selected dates." }
```

#### POST `/api/reservations/{id}/complete` 🔒 *(Admin/Staff)*
Mark a reservation as completed.

#### POST `/api/reservations/{id}/mark-paid` 🔒 *(Admin/Staff)*
Mark a reservation as paid.

---

### 4. Payments

#### POST `/api/payments` 🔒
Submit a payment for a reservation.

**Request**
```json
{
  "reservation": "/api/reservations/101",
  "amount": "10500.00",
  "paymentMethod": "GCash",
  "referenceNumber": "GC-20250522-001",
  "guestNotes": "Paid via GCash transfer",
  "proofOfPayment": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response 201**
```json
{
  "id": 55,
  "transactionReference": "PAY-2025-055",
  "amount": "10500.00",
  "paymentMethod": "GCash",
  "status": "pending",
  "createdAt": "2025-05-22T10:20:00+08:00"
}
```

---

#### GET `/api/payments` 🔒
List payments. Customers see only their own; Admin/Staff see all.

---

#### POST `/api/payments/{id}/approve` 🔒 *(Admin/Staff)*
Approve a pending payment.

#### POST `/api/payments/{id}/reject` 🔒 *(Admin/Staff)*
Reject a payment with a reason.

**Request**
```json
{ "reason": "Reference number could not be verified." }
```

#### POST `/api/payments/{id}/refund` 🔒 *(Admin/Staff)*
Mark a payment as refunded.

---

### 5. Messaging

#### POST `/api/contact_messages` 🔒
Send a message to the support team.

**Request**
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "phone": "09171234567",
  "subject": "Inquiry about early check-in",
  "message": "Is it possible to check in at 10 AM on June 10?"
}
```

**Response 201**
```json
{
  "id": 18,
  "subject": "Inquiry about early check-in",
  "status": "unread",
  "createdAt": "2025-05-22T11:00:00+08:00"
}
```

---

#### GET `/api/contact_messages` 🔒
List contact messages.  
Customers filter client-side by their email. Admin/Staff see all.

---

#### GET `/api/contact_replies` 🔒
List all replies. Customers match replies to their own messages by IRI.

**Response 200**
```json
{
  "hydra:member": [
    {
      "id": 7,
      "replyMessage": "Yes, early check-in is available at no extra charge.",
      "contactMessage": "/api/contact_messages/18",
      "repliedBy": { "fullName": "Admin User" },
      "createdAt": "2025-05-22T14:00:00+08:00"
    }
  ]
}
```

---

### 6. Profile Management

#### PUT `/api/users/{id}` 🔒
Update profile information.

**Request**
```json
{
  "fullName": "Jane A. Doe",
  "username": "jane_doe",
  "email": "jane@example.com"
}
```

**Response 200**
```json
{
  "id": 42,
  "fullName": "Jane A. Doe",
  "username": "jane_doe",
  "email": "jane@example.com"
}
```

---

#### POST `/api/change-password` 🔒
Change the authenticated user's password.

**Request**
```json
{
  "currentPassword": "oldSecret123",
  "newPassword": "newSecret456"
}
```

**Response 200**
```json
{ "message": "Password changed successfully." }
```

**Response 400**
```json
{ "error": "Current password is incorrect." }
```

---

### 7. Reviews

#### GET `/api/reviews?serviceType={type}&serviceId={id}` 🔒
Get reviews for a service item.

**Example:** `GET /api/reviews?serviceType=room&serviceId=1`

**Response 200**
```json
{
  "hydra:member": [
    {
      "id": 3,
      "rating": 5,
      "comment": "Absolutely beautiful room. Very clean!",
      "reviewer": { "fullName": "John Santos" },
      "createdAt": "2025-04-10T09:00:00+08:00"
    }
  ]
}
```

---

### Standard Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthorized — missing or expired JWT |
| `403` | Forbidden — insufficient role/permissions |
| `404` | Resource not found |
| `422` | Unprocessable — business rule violation |
| `500` | Internal server error |

**Error body format:**
```json
{
  "error": "Human-readable message"
}
```

Or for validation errors (API Platform):
```json
{
  "hydra:description": "Validation failed",
  "violations": [
    { "propertyPath": "email", "message": "This value is not a valid email address." }
  ]
}
```

---

## Role-Based Access Control

| Feature | Customer | Staff | Admin |
|---------|----------|-------|-------|
| Browse services | ✅ | ✅ | ✅ |
| Create reservation | ✅ | ❌ | ❌ |
| View own reservations | ✅ | ❌ | ❌ |
| View all reservations | ❌ | ✅ | ✅ |
| Approve / reject reservations | ❌ | ✅ | ✅ |
| Submit payment | ✅ | ❌ | ❌ |
| Approve / reject payments | ❌ | ✅ | ✅ |
| Send support message | ✅ | ❌ | ❌ |
| Reply to messages | ❌ | ✅ | ✅ |
| Manage services (CRUD) | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| View activity logs | ❌ | ❌ | ✅ |

---

## Real-Time Synchronization

Changes made on the mobile app reflect in the Symfony web dashboard immediately because both the mobile app and the web panel share the same MySQL database through the Symfony API.

| Mechanism | Purpose |
|-----------|---------|
| WebSocket (`ws://<ip>:9090`) | Push notifications from server to mobile |
| 30-second poller | Fallback — detects new support replies and new customer messages for admin/staff when WS doesn't push |
| Mercure SSE (`/api/mercure/token`) | Real-time reservation status updates |

---

## Demo Checklist

Before your demonstration:

- [ ] Symfony backend running: `symfony server:start --allow-all-ip`
- [ ] WebSocket server running on port 9090
- [ ] Phone and laptop on the **same WiFi network**
- [ ] `API_BASE_URL` in `src/config/api.config.ts` set to the correct local IP
- [ ] Metro bundler running: `npm start`
- [ ] Android device connected via USB or emulator open
