# Acklet Unified Feedback System Architecture

## 1. Overview

Acklet implements a **single, centralized, platform-wide feedback architecture** shared across all existing and future tools (`AirVault`, `DataLens`, `JSONLens`, `JWT Inspector`, etc.) as well as the platform shell.

```text
               ┌───────────────────────┐
               │    Any Acklet Tool    │
               │  (AirVault, DataLens) │
               └───────────┬───────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │ Shared Feedback Modal │
               │   <app-feedback-modal>│
               └───────────┬───────────┘
                           │ POST /api/v1/feedback
                           ▼
               ┌───────────────────────┐
               │  Feedback Controller  │
               │   & Feedback Service  │
               └───────────┬───────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │   PostgreSQL Storage  │
               │   ('feedbacks' table) │
               └───────────┬───────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
┌───────────────────────┐     ┌───────────────────────┐
│ User Dashboard View   │     │ Admin Feedback Console│
│ ('/workspace')        │     │ ('/workspace/admin')  │
│ - View submitted items│     │ - Multi-filter/search │
│ - Real-time status    │     │ - Status transition   │
│ - Excludes admin notes│     │ - Internal notes      │
└───────────────────────┘     │ - Reassign tools      │
                              └───────────────────────┘
```

---

## 2. Feedback Data Model

The feedback system persists into the `feedbacks` table via Flyway Migration `V45__unified_feedback_system.sql`.

| Field Name | Type | Nullable | Description / Allowed Values |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | Unique Primary Key (`gen_random_uuid()`) |
| `user_id` | `UUID` | Yes | Foreign Key referencing `users(id)` (null for anonymous submissions) |
| `rating` | `INTEGER` | No | 1 to 5 star rating score |
| `message` | `TEXT` | No | Full user feedback text |
| `category` | `VARCHAR(50)` | No | `BUG`, `FEATURE_REQUEST`, `IMPROVEMENT`, `USABILITY`, `GENERAL`, `PERFORMANCE` |
| `tool_id` | `VARCHAR(100)` | No | Unique slug of the tool (e.g. `'airvault'`, `'datalens'`, `'json-lens'`, `'platform'`) |
| `tool_name` | `VARCHAR(150)`| Yes | Human-readable tool title (e.g. `'AirVault'`, `'DataLens'`, `'Acklet Platform'`) |
| `email` | `VARCHAR(255)`| Yes | User contact email for follow-up or reply |
| `source` | `VARCHAR(50)` | No | Origin source: `IN_APP`, `EMAIL`, `EXTERNAL`, `API`, `MANUAL` |
| `page_url` | `VARCHAR(500)`| Yes | Auto-captured origin route URL |
| `user_agent` | `VARCHAR(500)`| Yes | Client environment browser user-agent string |
| `device_type` | `VARCHAR(50)`| Yes | Client device form-factor (`desktop`, `tablet`, `mobile`) |
| `status` | `VARCHAR(50)` | No | Lifecycle status: `NEW`, `REVIEWING`, `PLANNED`, `RESOLVED`, `REJECTED` |
| `admin_notes` | `TEXT` | Yes | Internal engineering/triage notes (never exposed to end-users) |
| `created_at` | `TIMESTAMPTZ`| No | Timestamp when feedback was submitted |
| `updated_at` | `TIMESTAMPTZ`| No | Timestamp of latest status or admin note update |

---

## 3. Status Lifecycle

The feedback lifecycle is simple, actionable, and non-bureaucratic:

```text
NEW (Initial submission)
  │
  ▼
REVIEWING (Under evaluation by product / engineering)
  │
  ├──► PLANNED (Scheduled into roadmap)
  │
  ├──► RESOLVED (Implemented / Fixed in production)
  │
  └──► REJECTED (Out of scope or not reproducible)
```

---

## 4. API Endpoints

All feedback operations are served under `/api/v1/feedback`.

### 4.1 Submit Feedback (Public / In-App)
- **Method**: `POST /api/v1/feedback`
- **Access**: Public & Authenticated (`permitAll`)
- **Request Body**:
  ```json
  {
    "rating": 5,
    "message": "The zero-knowledge E2EE sync in AirVault works flawlessly!",
    "category": "GENERAL",
    "toolId": "airvault",
    "toolName": "AirVault",
    "email": "user@domain.com",
    "source": "IN_APP",
    "pageUrl": "http://localhost:4200/tools/app/airvault",
    "deviceType": "desktop"
  }
  ```
- **Response**: `201 Created` with `ApiResponse<FeedbackResponse>`.

### 4.2 Query All Feedback (Admin Dashboard)
- **Method**: `GET /api/v1/feedback`
- **Query Parameters**:
  - `toolId`: Filter by tool slug (`airvault`, `datalens`, `platform`, etc.)
  - `category`: Filter by category (`BUG`, `FEATURE_REQUEST`, `IMPROVEMENT`, `PERFORMANCE`, etc.)
  - `status`: Filter by lifecycle status (`NEW`, `REVIEWING`, `PLANNED`, `RESOLVED`, `REJECTED`)
  - `source`: Filter by origin (`IN_APP`, `EMAIL`, `EXTERNAL`, `API`, `MANUAL`)
  - `search`: Case-insensitive text search matching message, email, or tool title
  - `page`, `size`, `sort`: Standard Spring pagination

### 4.3 Query User's Own Feedback (User Dashboard)
- **Method**: `GET /api/v1/feedback/my`
- **Security**: Filters by authenticated `user_id`. Internal `admin_notes` are excluded from the response.

### 4.4 Update Feedback (Admin Triage & Tool Reassignment)
- **Method**: `PATCH /api/v1/feedback/{id}`
- **Request Body**:
  ```json
  {
    "status": "RESOLVED",
    "adminNotes": "Fixed in v2.1.0 release.",
    "toolId": "airvault",
    "toolName": "AirVault"
  }
  ```

---

## 5. Client Integration Guide for New Tools

Every future Acklet tool integrates the shared feedback component in 2 simple steps:

1. **Import the Shared Primitive**:
   ```typescript
   import { FeedbackModalComponent } from '../../app/shared/components/feedback-modal/feedback-modal.component';
   ```

2. **Embed in Tool Template**:
   ```html
   <app-feedback-modal
     [isOpen]="showFeedbackModal()"
     [toolId]="'my-new-tool'"
     [toolName]="'My New Tool'"
     (closeModal)="showFeedbackModal.set(false)"
   ></app-feedback-modal>
   ```

3. **Trigger Feedback**:
   Place a feedback button in the tool navbar/dock that sets `showFeedbackModal.set(true)`.

All device metadata (`deviceType`, `pageUrl`, `userAgent`, `timestamp`) and authentication context are captured automatically.
