# Delivery Verification System

A comprehensive delivery verification system built with NestJS that provides multi-signature verification, IPFS storage, GPS validation, automatic payment release, and real-time notifications.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      VerificationModule                         │
├─────────────────────────────────────────────────────────────────┤
│  Controllers:                                                   │
│  ├── VerificationController - Handle verification operations   │
│  └── DeliveryController - Handle delivery management           │
├─────────────────────────────────────────────────────────────────┤
│  Services:                                                      │
│  ├── VerificationService - Multi-sig verification logic         │
│  ├── DeliveryService - Inspector assignment logic               │
│  ├── IpfsService - IPFS file storage                          │
│  ├── PaymentService - Automatic payment release                │
│  ├── NotificationService - Event-driven notifications          │
│  └── GpsValidationService - GPS coordinate validation         │
├─────────────────────────────────────────────────────────────────┤
│  Entities:                                                      │
│  ├── Delivery - Delivery records                               │
│  ├── Verification - Verification submissions                   │
│  ├── Approval - Multi-sig approvals                           │
│  ├── InspectorAssignment - Inspector assignments               │
│  └── Notification - Notification records                       │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### 1. File Upload & IPFS Integration
- Upload proof of delivery images (JPEG, PNG)
- Files stored on IPFS with content-addressable hashes
- Max file size: 10MB

### 2. GPS Coordinates Validation
- Validates GPS coordinate format
- Optional radius validation (default: 100m from destination)
- Uses Haversine formula for accurate distance calculation

### 3. Multi-Signature Verification
- Requires approval from 3 roles: INSPECTOR, SUPERVISOR, CLIENT
- Status flow: PENDING → PARTIALLY_APPROVED → VERIFIED/REJECTED
- Tracks individual approvals with timestamps

### 4. Automatic Payment Release
- Triggers payment when verification reaches VERIFIED status
- Idempotent payment processing (prevents double payments)
- Mock payment service for testing

### 5. Notification System
- Event-driven notifications using NestJS EventEmitter
- Sends notifications for:
  - Verification submitted
  - Verification approved
  - Verification rejected
  - Payment released

## Environment Variables

```env
# Application
PORT=5000

# Database (TypeORM + PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=harvest_finance

# IPFS Configuration
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http

# GPS Validation
GPS_VALIDATION_RADIUS_METERS=100

# Payment Configuration
PAYMENT_AUTO_RELEASE=true
```

## API Endpoints

### Delivery Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/deliveries` | Create a new delivery |
| GET | `/deliveries` | List all deliveries (with pagination) |
| GET | `/deliveries/:id` | Get delivery by ID |
| POST | `/deliveries/:id/assign-inspector` | Assign inspector to delivery |
| GET | `/deliveries/:id/assignments` | Get assignment history |
| POST | `/deliveries/:id/lock` | Lock delivery for assignment |
| POST | `/deliveries/:id/unlock` | Unlock delivery for assignment |

### Verification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/verifications/upload` | Upload proof image to IPFS |
| POST | `/verifications` | Create verification submission |
| GET | `/verifications` | List verifications (with filters) |
| GET | `/verifications/:id` | Get verification by ID |
| POST | `/verifications/:id/approve` | Approve verification |
| POST | `/verifications/:id/reject` | Reject verification |
| GET | `/verifications/:id/progress` | Get approval progress |

## Request/Response Examples

### Create Delivery

```bash
POST /deliveries
Content-Type: application/json

{
  "orderId": "order-123",
  "destinationLat": 40.7128,
  "destinationLng": -74.006,
  "destinationAddress": "123 Main St, New York",
  "recipientName": "John Doe",
  "recipientPhone": "+1234567890",
  "amount": 100.00
}
```

### Upload Proof Image

```bash
POST /verifications/upload
Content-Type: multipart/form-data

file: [image file]
```

Response:
```json
{
  "hash": "QmXyZ123456789...",
  "size": "1024000"
}
```

### Create Verification

```bash
POST /verifications
Content-Type: application/json

{
  "deliveryId": "delivery-123",
  "inspectorId": "inspector-456",
  "ipfsImageHash": "QmXyZ123456789...",
  "gpsLat": 40.7128,
  "gpsLng": -74.006,
  "notes": "Delivery confirmed at location"
}
```

### Approve Verification

```bash
POST /verifications/ver-123/approve
Content-Type: application/json

{
  "approverId": "supervisor-789",
  "role": "SUPERVISOR",
  "comments": "Verified GPS coordinates match destination"
}
```

## Database Schema

### Deliveries Table
- id (UUID, PK)
- order_id (string)
- status (enum: PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, VERIFIED, CANCELLED)
- destination_lat (decimal)
- destination_lng (decimal)
- destination_address (string)
- recipient_name (string)
- recipient_phone (string)
- amount (decimal)
- is_locked_for_assignment (boolean)
- created_at, updated_at (timestamps)

### Verifications Table
- id (UUID, PK)
- delivery_id (UUID, FK)
- inspector_id (string)
- ipfs_image_hash (string)
- gps_lat (decimal)
- gps_lng (decimal)
- status (enum: PENDING, PARTIALLY_APPROVED, VERIFIED, REJECTED)
- notes (string)
- payment_released (boolean)
- payment_transaction_id (string)
- verified_at (timestamp)
- created_at, updated_at (timestamps)

### Approvals Table
- id (UUID, PK)
- verification_id (UUID, FK)
- approver_id (string)
- role (enum: INSPECTOR, SUPERVISOR, CLIENT)
- approved (boolean)
- comments (string)
- approved_at (timestamp)
- created_at (timestamp)

## Running the Application

```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Run tests
npm test

# Run e2e tests
npm run test:e2e

# Build for production
npm run build
```

## Swagger Documentation

Once the application is running, access the Swagger UI at:
```
http://localhost:5000/api/docs
```

## Testing

### Unit Tests
Run unit tests for all services:
```bash
npm run test
```

### Integration Tests
Run e2e tests:
```bash
npm run test:e2e
```

## Multi-Signature Workflow

```
┌─────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  PENDING    │───▶│  PARTIALLY_APPROVED  │───▶│     VERIFIED        │
└─────────────┘    │  (1-2 approvals)    │    │  (all 3 approved)   │
                   └──────────────────────┘    └─────────────────────┘
                           │
                           ▼
                   ┌─────────────────────┐
                   │     REJECTED        │
                   │  (any role rejects) │
                   └─────────────────────┘
```

## Payment Flow

1. Inspector submits verification with GPS + IPFS proof
2. Supervisor reviews and approves
3. Client reviews and approves
4. System detects all 3 approvals
5. Status changes to VERIFIED
6. Payment is automatically released
7. Notifications sent to all parties

## Error Handling

All endpoints return proper HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation errors)
- 404: Not Found
- 500: Internal Server Error

Error response format:
```json
{
  "message": "Error description",
  "error": "Error Type"
}
```

## Development Notes

- The IPFS service falls back to mock hashes in development mode
- Payment service is mocked but implements full idempotency
- GPS validation can be disabled by setting radius to 0
- Notifications are logged to console in development

## License

Private - All rights reserved
