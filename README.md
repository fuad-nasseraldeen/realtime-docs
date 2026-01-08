## Real-Time Collaborative Docs App

A full-stack web application that allows users to create, edit, and manage documents with real-time collaboration.

The app supports user authentication, secure document ownership, and CRUD operations for documents.  
Built with modern web technologies and designed to demonstrate scalable architecture, secure authentication, and real-time collaboration using Yjs.

**Key features:**
- User signup and login with credentials authentication
- Secure document ownership and access control
- Create, read, update, and delete documents
- Real-time collaborative editing using Yjs and WebSockets
- Clean Next.js App Router architecture
- MongoDB-based data persistence

## Getting Started

### Prerequisites

- Node.js 16+ 
- MongoDB instance (local or Atlas)
- Environment variables configured (see `.env.local.example`)

### Installation

```bash
npm install
```

### Running the Application

**Important:** You need to run both servers for real-time collaboration to work:

1. **Start the WebSocket server** (for real-time collaboration):
   ```bash
   npm run realtime
   ```
   This starts the Yjs WebSocket server on `ws://localhost:1234`

2. **Start the Next.js development server** (in a separate terminal):
   ```bash
   npm run dev
   ```
   This starts the Next.js app on `http://localhost:3000`

### Environment Variables

Create a `.env.local` file with:

```
MONGODB_URI=your-mongodb-connection-string
NEXTAUTH_SECRET=your-secret-key (generate with: openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
```

### Usage

1. Sign up for an account at `/signup`
2. Log in at `/login`
3. Create documents at `/docs`
4. Open a document to start editing
5. Open the same document in another browser window to see real-time collaboration

The document editor shows a connection status indicator:
- **Connected** (green) - Real-time sync is active
- **Connecting** (yellow) - Establishing connection
- **Disconnected** (red) - Connection lost

Changes sync in real-time across all connected clients. Use the "Save" button to persist changes to the database.
