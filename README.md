# SocialWave — Microservices Social Media Platform

A scalable, decoupled social media application built with Node.js, Express, React (Vite), and MongoDB. This version utilizes a 10-service microservice architecture orchestrated by Docker Compose to ensure fault tolerance, strict data isolation, and independent scalability.

## Objective
Design and implement a resilient, scalable backend application. Services are decoupled using a central API Gateway:
- **Authentication & Users**: JWT-based auth and isolated user profiles.
- **Content Delivery**: Independent services for Posts, Stories, Comments, and personalized Feeds.
- **Service Management**: A central registry dashboard to toggle services on/off in real-time.

## Learning Outcomes
- Architect and orchestrate 10 independent Node.js microservices.
- Implement a central API Gateway using `http-proxy-middleware`.
- Manage state and data synchronization across isolated NoSQL (MongoDB) databases.
- Containerize a complex full-stack ecosystem using Docker and Docker Compose.
- Handle cloud media uploads securely using Cloudinary.

## Tools & Technologies
- **Frontend**: React (Vite), CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **DevOps**: Docker, Docker Compose
- **Cloud Storage**: Cloudinary

## Prerequisites
- Node.js 18+
- npm
- Docker and Docker Desktop
- Cloudinary Account (for image/story uploads)

## Setup & Run
```bash
# 1) Clone repository
git clone https://github.com/AyushiVerma791/SocialWave.git
cd SocialWave

# 2) Copy env
cp .env.example .env
# Edit .env and insert your CLOUDINARY credentials

# 3) Build and start containers
docker compose build
docker compose up -d

# 4) Open the applications
# Frontend: http://localhost:3000
# Admin Controller: http://localhost:4000
```

## How to Test the Microservices Flow
1. **Register User A**
   - Open `http://localhost:3000/register`
   - Create an account (e.g., Alice). This creates a record in `auth-service`.
2. **Register User B**
   - Open an Incognito Window and register again (e.g., Bob).
3. **Interact across Services**
   - As Bob, navigate to the **Profile/Explore** page and follow Alice (`friend-service`).
   - As Alice, create a new Post with an image (`post-service` + Cloudinary).
   - As Bob, check your Home Feed (`feed-service`). Alice's post will appear instantly.
4. **Test Fault Tolerance**
   - Open `http://localhost:4000` (Controller Dashboard).
   - Toggle the `post-service` offline.
   - Verify that the app still loads profiles and feeds gracefully without crashing.

## Project Structure
```text
SocialWave
│
├── api-gateway/                 # Single entry point (Port 4008)
├── auth-service/                # Registration, Login, JWT issuing (Port 4001)
├── comment-service/             # Post comments management (Port 4005)
├── controller-service/          # Registry & toggle dashboard (Port 4000)
├── feed-service/                # Timeline aggregation (Port 4004)
├── friend-service/              # Follow/Unfollow logic (Port 4006)
├── frontend/                    # React Vite application (Port 3000)
├── notification-service/        # User activity alerts (Port 4007)
├── post-service/                # Posts and media uploads (Port 4003)
├── story-service/               # 24-hour ephemeral content (Port 4009)
├── user-service/                # Public profiles and search (Port 4002)
│
├── docker-compose.yml           # Orchestration for all 12 containers
├── .env                         # Environment variables (Cloudinary, JWT)
├── .env.example                 # Example env file
└── README.md
```
