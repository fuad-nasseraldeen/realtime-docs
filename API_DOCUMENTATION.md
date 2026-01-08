# API Documentation

Complete list of all API endpoints in the Realtime Collaborative Documents project.

---

## 🔐 Authentication APIs

### 1. **POST `/api/auth/signup`**
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
- **201 Created:**
  ```json
  {
    "message": "User created successfully",
    "userId": "507f1f77bcf86cd799439011"
  }
  ```
- **400 Bad Request:** `{ "error": "Email already in use" }` or validation error
- **500 Internal Server Error:** `{ "error": "Internal server error" }`

**Authentication:** Not required

---

### 2. **POST `/api/auth/[...nextauth]`** (NextAuth)
NextAuth catch-all route for authentication.

**Available Endpoints:**
- `POST /api/auth/signin` - Login with credentials
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signout` - Sign out

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Authentication:** 
- Login: Not required (but needs valid credentials)
- Session/Signout: Requires valid session

---

## 📄 Documents APIs

### 3. **GET `/api/docs`**
Get all documents accessible to the current user (owned documents + shared documents).

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "title": "My Document",
    "content": "Document content...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "accessRole": "owner"
  }
]
```

**Authentication:** Required

**Access:** Returns documents where user is:
- Owner (`ownerId` matches user ID)
- Collaborator (exists in `collaborators` array)

---

### 4. **POST `/api/docs`**
Create a new document.

**Request Body:**
```json
{
  "title": "New Document"
}
```

**Response:**
- **201 Created:**
  ```json
  {
    "id": "507f1f77bcf86cd799439011",
    "title": "New Document",
    "content": "",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
  ```
- **400 Bad Request:** Validation error
- **401 Unauthorized:** Not authenticated
- **500 Internal Server Error:** `{ "error": "Internal server error" }`

**Authentication:** Required

---

## 📝 Single Document APIs

### 5. **GET `/api/docs/[id]`**
Get a specific document by ID.

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "My Document",
  "content": "Document content...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "accessRole": "owner"
}
```

**Authentication:** Required

**Access Control:** User must have view access (owner, editor, or viewer)

**Status Codes:**
- **200 OK:** Document retrieved successfully
- **401 Unauthorized:** Not authenticated or no access
- **404 Not Found:** Document doesn't exist or invalid ID
- **500 Internal Server Error:** `{ "error": "Internal server error" }`

**Note:** This endpoint is used for role change detection (polled every 3 seconds in the frontend).

---

### 6. **PATCH `/api/docs/[id]`**
Update document title and/or content.

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated content..."
}
```
Both fields are optional.

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Updated Title",
  "content": "Updated content...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Authentication:** Required

**Access Control:** User must have edit access (owner or editor)

**Status Codes:**
- **200 OK:** Document updated successfully
- **400 Bad Request:** Validation error
- **401 Unauthorized:** Not authenticated or no edit access
- **404 Not Found:** Document doesn't exist
- **500 Internal Server Error:** `{ "error": "Internal server error" }`

---

### 7. **DELETE `/api/docs/[id]`**
Delete a document.

**Response:**
```json
{
  "message": "Document deleted"
}
```

**Authentication:** Required

**Access Control:** User must be the owner

**Status Codes:**
- **200 OK:** Document deleted successfully
- **401 Unauthorized:** Not authenticated or not owner
- **404 Not Found:** Document doesn't exist
- **500 Internal Server Error:** `{ "error": "Internal server error" }`

---

## 🤝 Sharing & Collaboration APIs

### 8. **POST `/api/docs/[id]/share`**
Share a document with a user or update their role.

**Request Body:**
```json
{
  "email": "collaborator@example.com",
  "role": "editor"
}
```

**Role Options:**
- `"viewer"` - Read-only access
- `"editor"` - Can edit and save

**Response:**
```json
{
  "collaborators": [
    {
      "userId": "507f1f77bcf86cd799439012",
      "email": "collaborator@example.com",
      "role": "editor",
      "addedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Authentication:** Required

**Access Control:** User must be the owner (only owner can share)

**Behavior:**
- If user already exists as collaborator → **updates** their role
- If new user → **adds** them as collaborator

**Status Codes:**
- **200 OK:** Document shared/role updated successfully
- **400 Bad Request:** 
  - Invalid email format
  - Document owner cannot be added as collaborator
  - Validation error
- **401 Unauthorized:** Not authenticated or not owner
- **404 Not Found:** 
  - Document doesn't exist
  - User not found with that email
- **500 Internal Server Error:** `{ "error": "Internal server error" }`

---

### 9. **GET `/api/docs/[id]/collaborators`**
Get list of all collaborators for a document.

**Response:**
```json
{
  "collaborators": [
    {
      "userId": "507f1f77bcf86cd799439012",
      "email": "collaborator@example.com",
      "role": "editor",
      "addedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Authentication:** Required

**Access Control:** User must have view access

**Status Codes:**
- **200 OK:** Collaborators retrieved successfully
- **401 Unauthorized:** Not authenticated or no access
- **404 Not Found:** Document doesn't exist
- **500 Internal Server Error:** `{ "error": "Internal server error" }`

**Note:** Returns empty array `[]` if document has no collaborators.

---

### 10. **DELETE `/api/docs/[id]/collaborators?userId=<userId>`**
Remove a collaborator from the document.

**Query Parameters:**
- `userId` (required) - The ID of the user to remove

**Example:**
```
DELETE /api/docs/507f1f77bcf86cd799439011/collaborators?userId=507f1f77bcf86cd799439012
```

**Response:**
```json
{
  "collaborators": [
    // Updated list of remaining collaborators
  ]
}
```

**Authentication:** Required

**Access Control:** User must be the owner (only owner can remove collaborators)

**Status Codes:**
- **200 OK:** Collaborator removed successfully
- **400 Bad Request:** `userId` parameter is required
- **401 Unauthorized:** Not authenticated
- **403 Forbidden:** Only the owner can remove collaborators
- **404 Not Found:** Document doesn't exist
- **500 Internal Server Error:** `{ "error": "Internal server error" }`

---

## 📊 API Summary Table

| Method | Endpoint | Purpose | Auth Required | Access Level |
|--------|----------|---------|---------------|--------------|
| POST | `/api/auth/signup` | Create account | ❌ | Public |
| POST | `/api/auth/[...nextauth]` | Login/Session | ✅ | Authenticated |
| GET | `/api/docs` | List all docs | ✅ | Authenticated |
| POST | `/api/docs` | Create doc | ✅ | Authenticated |
| GET | `/api/docs/[id]` | Get doc | ✅ | View access |
| PATCH | `/api/docs/[id]` | Update doc | ✅ | Edit access (owner/editor) |
| DELETE | `/api/docs/[id]` | Delete doc | ✅ | Owner only |
| POST | `/api/docs/[id]/share` | Share/Update role | ✅ | Owner only |
| GET | `/api/docs/[id]/collaborators` | List collaborators | ✅ | View access |
| DELETE | `/api/docs/[id]/collaborators` | Remove collaborator | ✅ | Owner only |

---

## 🔒 Access Roles

The system uses three access roles:

1. **Owner** - Full access:
   - View, edit, delete document
   - Share document with others
   - Update collaborator roles
   - Remove collaborators

2. **Editor** - Edit access:
   - View document
   - Edit and save document content
   - Cannot delete or share

3. **Viewer** - Read-only access:
   - View document only
   - Cannot edit, save, delete, or share

---

## 📝 Notes

- All endpoints return JSON responses
- Authentication is handled via NextAuth (JWT sessions)
- Document IDs are MongoDB ObjectIds
- All timestamps are in ISO 8601 format
- The `GET /api/docs/[id]` endpoint is polled every 3 seconds for role change detection
- Role changes trigger an alert in the frontend when detected

---

## 🚨 Error Handling

All endpoints follow consistent error handling:

- **400 Bad Request:** Validation errors, invalid input
- **401 Unauthorized:** Not authenticated or insufficient permissions
- **403 Forbidden:** Authenticated but action not allowed
- **404 Not Found:** Resource doesn't exist
- **500 Internal Server Error:** Server-side errors

Error responses follow this format:
```json
{
  "error": "Error message here"
}
```
