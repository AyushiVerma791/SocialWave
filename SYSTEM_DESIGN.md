# SocialWave: Comprehensive System Design Document (HLD & LLD)

This document outlines the High-Level Design (HLD), Low-Level Design (LLD), and deep internal architectures of the SocialWave application. It is designed to be used for technical interviews, portfolio presentations, and architecture reviews.

---

# Part 1: High-Level Design (HLD)

## 1. System Overview
SocialWave is a scalable, distributed social media platform. To ensure high availability, fault tolerance, and independent scaling, the system eschews a monolithic design in favor of a **Microservices Architecture**. 

## 2. Global Architecture Diagram

```mermaid
graph TD
    Client[Client / React Web Browser] -->|REST / HTTP| Gateway[API Gateway :4008]
    
    Gateway -->|/api/auth| Auth[Auth Service :4001]
    Gateway -->|/api/user| User[User Service :4002]
    Gateway -->|/api/post| Post[Post Service :4003]
    Gateway -->|/api/feed| Feed[Feed Service :4004]
    Gateway -->|/api/friend| Friend[Friend Service :4006]
    Gateway -->|/api/story| Story[Story Service :4009]
    
    Auth --> DB1[(Auth MongoDB)]
    User --> DB2[(User MongoDB)]
    Post --> DB3[(Post MongoDB)]
    Feed --> DB4[(Feed MongoDB)]
    Friend --> DB5[(Friend MongoDB)]
    Story --> DB6[(Story MongoDB)]
    
    Post -.->|Image/Video Upload| Cloudinary[Cloudinary CDN]
    Story -.->|Media Upload| Cloudinary
```

## 3. Key Components
1. **React Frontend (Vite):** A Single Page Application (SPA) that acts as the presentation layer. It manages state locally and communicates exclusively with the API Gateway.
2. **API Gateway (Node.js/Express):** The single entry point for all client requests. It handles reverse proxying, routing traffic to the appropriate backend service based on the URL path.
3. **Microservices Ecosystem:** Highly decoupled Node.js services. Each service represents a specific business domain.
4. **Database-per-Service:** Each microservice has its own isolated MongoDB database to prevent tight coupling.
5. **Admin Controller:** A custom service registry acting as a circuit breaker, allowing administrators to toggle individual services on or off in real-time.

---

# Part 2: Low-Level Design (LLD) & Internals

## 1. User Journey & Core Flow Diagram
This flowchart illustrates the end-to-end journey of a user interacting with the platform and how the microservices orchestrate the response.

```mermaid
flowchart TD
    Start((User Opens App)) --> Auth[Login / Register]
    Auth --> |Returns JWT| ClientState[React Saves JWT in LocalStorage]
    
    ClientState --> |GET /feed| Gateway(API Gateway)
    Gateway --> FeedSvc[Feed Service]
    
    FeedSvc --> |1. Internal HTTP Call| FriendSvc[Friend Service]
    FriendSvc --> |Returns Array of IDs| FeedSvc
    
    FeedSvc --> |2. Aggregate Data| PostSvc[Post Service]
    PostSvc --> |Returns Posts| FeedSvc
    FeedSvc --> |Formats Response| Gateway
    Gateway --> |Renders UI| UI((User Views Timeline))
    
    ClientState --> |POST /post| Gateway2(API Gateway)
    Gateway2 --> PostSvc2[Post Service]
    PostSvc2 --> |Uploads Image| Cloudinary{Cloudinary CDN}
    Cloudinary --> |Returns Secure URL| PostDB[(Post MongoDB)]
```

## 2. Deep Dive: Feed Generation Algorithm
Because SocialWave uses a Database-per-Service architecture, we cannot use a simple SQL `JOIN` to get a user's feed. Instead, the `feed-service` acts as an aggregator:
1. The Client requests the Feed.
2. The `feed-service` makes a synchronous internal HTTP request to the `friend-service` to retrieve the `followingIds` (the list of people the user follows).
3. The `feed-service` then queries the `post-service` (or its own replicated database) to fetch posts strictly matching those `followingIds`.
4. The posts are sorted by `createdAt` in descending order and returned to the client.

## 3. Deep Dive: Internal Network Topology (Docker DNS)
SocialWave relies heavily on Docker's internal networking. 
* The API Gateway does **not** route traffic to `localhost:4001`. 
* Instead, it routes traffic to `http://auth-service:4001`. 
* Docker provides a built-in DNS resolver. Because all containers share the same `docker-compose` network, they can resolve each other by their container names. This means the backend services are completely shielded from the public internet; only the Gateway is exposed.

## 4. Database Schemas (Mongoose)

### Auth Service (`auth-db`)
```javascript
const AuthSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
});
```

### Post Service (`post-db`)
```javascript
const PostSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  username: { type: String, required: true },
  content: { type: String, default: '' },
  imageUrl: { type: String },
  likes: [{ type: Schema.Types.ObjectId }], 
  createdAt: { type: Date, default: Date.now }
});
```

### Story Service (`story-db`)
*Feature: Ephemeral Content*
```javascript
const StorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  mediaUrl: { type: String },
  expiresAt: { type: Date, required: true } 
});
// TTL Index: MongoDB will automatically delete documents when expiresAt is reached.
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

## 5. Security & Authentication Flow
**JWT (JSON Web Token) Verification:**
1. Upon successful login, the `auth-service` generates an asymmetric JWT and sends it to the client.
2. React stores this in `localStorage` and attaches it as a `Bearer Token` in the `Authorization` header of every subsequent API request.
3. The API Gateway passes the header through.
4. Each protected backend service uses a lightweight middleware to verify the token signature before processing the request, ensuring the API Gateway does not become a bottleneck for CPU-intensive cryptographic verification.

```javascript
// Lightweight Backend Verification Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

## 6. Fault Tolerance & Edge Cases (Lazy Initialization)
**The Problem:** Because Auth and User databases are completely isolated, registering a user creates an Auth document, but *not* a User Profile document.
**The Solution:** Implemented "Lazy Initialization" via MongoDB `upsert`. 
When a user edits their profile for the first time, the `user-service` intercepts the request:
```javascript
Profile.findByIdAndUpdate(
  req.params.id, 
  { $set: { bio }, $setOnInsert: { username: req.user.username } }, 
  { upsert: true, new: true }
);
```
If the profile doesn't exist yet, MongoDB safely catches the 404 and automatically creates (inserts) a new profile on the fly. This guarantees seamless data isolation and prevents crashes without needing to rely on a complex Message Broker (like Kafka) to sync the databases on registration.
