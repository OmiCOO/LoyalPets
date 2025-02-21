# Pet Health Assistant API

A comprehensive backend API for a pet health management system with AI-powered chat assistance.

## Table of Contents
- [Overview](#overview)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Authentication](#authentication)
- [Pets](#pets)
- [AI Assistant](#ai-assistant)
- [Feedback](#feedback)
- [Admin Panel](#admin-panel)
- [Error Handling](#error-handling)
- [Security](#security)
- [Rate Limiting](#rate-limiting)
- [Additional API Endpoints](#additional-api-endpoints)

---
## Overview
This API allows users to:
- Register and authenticate
- Manage pet health records
- Get AI-powered health assistance for pets
- Submit feedback
- Administer and analyze platform usage statistics

### Technologies Used:
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Security**: bcrypt for password hashing

---
## Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd pet-health-api
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file and configure it with the required variables (see [Environment Variables](#environment-variables)).

### 4. Run database migrations
```bash
npm run migrate:up
```

### 5. Start the server
#### Development Mode:
```bash
npm run dev
```
#### Production Mode:
```bash
npm start
```

---
## Environment Variables
Create a `.env` file with the following:
```
DATABASE_URL=postgres://user:password@host:port/dbname
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
OPENAI_ORG_ID=your_openai_org_id
TAVILY_API_KEY=your_tavily_api_key
```

---
## Database Setup
This API uses **PostgreSQL** as its database. Run the following command to apply migrations:
```bash
npm run migrate:up
```

---
## Authentication

### Register User
**Endpoint:** `POST /api/auth/signup`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Login
**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---
## Pets

### Create Pet
**Endpoint:** `POST /api/pets`

**Request:**
```json
{
  "name": "Buddy",
  "pet_type": "Dog",
  "breed": "Labrador",
  "age": 3,
  "disease": "Skin Allergy",
  "symptoms": "Itching, Redness"
}
```

**Response:** Pet object

### Get All Pets
**Endpoint:** `GET /api/pets`
**Response:** Array of pet objects

### Get Pet by ID
**Endpoint:** `GET /api/pets/:id`
**Response:** Pet object

### Update Pet Health
**Endpoint:** `PUT /api/pets/:id/health-update`

**Request:**
```json
{
  "symptoms": "Loss of appetite",
  "disease": "Flu"
}
```

**Response:** Updated pet object

### Update Thread ID
**Endpoint:** `PUT /api/pets/:id/thread`

**Request:**
```json
{
  "thread_id": "unique-thread-id"
}
```

**Response:** Updated pet object

---
## AI Assistant

### Get Assistant Status
**Endpoint:** `GET /api/assistant/status`
**Response:**
```json
{
  "assistantInitialized": true,
  "assistantId": "assistant-123"
}
```

### Create New Thread
**Endpoint:** `POST /api/assistant/thread`

**Request:**
```json
{
  "petId": 1,
  "petInfo": {
    "id": 1,
    "name": "Buddy",
    "type": "Dog",
    "breed": "Labrador",
    "disease": "Flu",
    "symptoms": "Coughing, Fever"
  }
}
```

**Response:**
```json
{
  "threadId": "thread-xyz",
  "needsUpdate": false,
  "initialMessage": "How can I help Buddy today?"
}
```

### Send Message
**Endpoint:** `POST /api/assistant/message`

**Response:**
```json
{
  "response": "It sounds like Buddy might have a cold. Keep him hydrated and warm.",
  "source": "assistant"
}
```

### Get Chat History
**Endpoint:** `GET /api/assistant/chat-history/:petId`
**Response:** Array of chat message objects

### Check Update Status
**Endpoint:** `GET /api/assistant/check-update/:petId`
**Response:**
```json
{
    "needsUpdate": boolean
}
```

---
## Feedback

### Submit Feedback
**Endpoint:** `POST /api/feedback`

**Request:**
```json
{
  "pet_id": 1,
  "thread_id": "thread-xyz",
  "rating": 5,
  "comment": "Very helpful assistant!"
}
```

**Response:** Feedback object

---
## Admin Panel

### Get Platform Statistics
**Endpoint:** `GET /api/admin/stats`

**Response:**
```json
{
  "total_users": 500,
  "total_pets": 1000,
  "avg_rating": 4.8
}
```

### Get Pet Types Distribution
**Endpoint:** `GET /api/admin/pet-types`

**Response:**
```json
[
  { "pet_type": "Dog", "count": 700 },
  { "pet_type": "Cat", "count": 300 }
]
```

### Get Disease Distribution
**Endpoint:** `GET /api/admin/diseases`
**Response:**
```json
[
    {
        "disease": "string",
        "count": "number"
    }
]
```

### Get Feedback Ratings
**Endpoint:** `GET /api/admin/ratings`
**Response:**
```json
[
    {
        "rating": "number",
        "count": "number"
    }
]
```

### Get User Growth
**Endpoint:** `GET /api/admin/user-growth`
**Response:**
```json
[
    {
        "month": "string",
        "new_users": "number"
    }
]
```

### Get Disease by Pet Type
**Endpoint:** `GET /api/admin/disease-by-pet-type`
**Response:**
```json
[
    {
        "pet_type": "string",
        "disease": "string",
        "count": "number"
    }
]
```

---
## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Server Error

Error responses include a message:
```json
{
  "message": "Error description"
}
```

---
## Security
- All non-authentication endpoints require a JWT token.
- Passwords are hashed using bcrypt.
- Admin endpoints require admin privileges.

---
## Rate Limiting
Currently, no rate limiting is implemented. Consider adding rate limiting for production use.

---
## Additional API Endpoints

## Request Headers
All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
```

For chat messages, include session ID if available:
```
Session-Id: <session_id>
```

## Chat Session Management
- Sessions are automatically created on first message
- Session ID is returned in the first message response
- Use the session ID in subsequent requests for better analytics

## Database Schema Updates
The pets table includes additional fields:
- `thread_id`: For storing OpenAI thread references
- `last_updated`: Timestamp for tracking health updates
- `user_id`: Foreign key to users table

## Technologies Used (Additional)
- **AI Integration**: OpenAI API
- **Search Integration**: Tavily API
- **Migration**: node-pg-migrate

