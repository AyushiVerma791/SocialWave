<h1 align="center">🌊 SocialWave</h1>

<p align="center">
  A highly scalable, production-ready Social Media platform engineered from scratch using a <strong>Microservices Architecture</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" />
</p>

---

## 📖 Table of Contents
- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Microservices Breakdown](#-microservices-breakdown)
- [Tech Stack](#-tech-stack)
- [Getting Started (Local Setup)](#-getting-started)
- [Environment Variables](#-environment-variables)

---

## 🚀 About the Project

**SocialWave** is a fully functional social networking application designed to demonstrate advanced backend engineering. Instead of relying on a traditional monolithic design, this project is split into **10 distinct, loosely coupled microservices**. 

This architectural choice ensures **high fault tolerance, independent scalability, and strict data isolation**, mimicking the engineering practices used by top-tier tech companies.

---

## ✨ Key Features

- **Decoupled Architecture:** 10 independent microservices communicating via an API Gateway.
- **Secure Authentication:** JWT-based stateless authentication.
- **Media Uploading:** Secure image and video storage via Cloudinary integration.
- **Smart Feeds:** Algorithm-style personalized home feed based on following networks.
- **Expiring Stories:** 24-hour ephemeral story viewing and expiration logic.
- **Social Interactions:** Like, Comment, Save, Repost, and Follow mechanisms.
- **Admin Controller Dashboard:** A custom registry panel to toggle individual services online/offline in real-time to test circuit-breaking and fault tolerance.

---

## 🏗 System Architecture

The application routes all frontend traffic securely through a central API Gateway, which then proxies requests to the appropriate backend service. Every service operates with its own isolated NoSQL database.

```text
📱 React Frontend (Vite)
       │
       ▼  (HTTP / REST)
       │
🚦 API Gateway (Port 4008)  ──► 🛑 Admin Controller Dashboard
       │
       ├─► 🔐 Auth Service      ──►  [( Auth DB )]
       ├─► 👤 User Service      ──►  [( User DB )]
       ├─► 📝 Post Service      ──►  [( Post DB )]
       ├─► 📰 Feed Service      ──►  [( Feed DB )]
       ├─► 💬 Comment Service   ──►  [( Comment DB )]
       ├─► 🤝 Friend Service    ──►  [( Friend DB )]
       ├─► 🔔 Notify Service    ──►  [( Notify DB )]
       └─► ⏱️ Story Service     ──►  [( Story DB )]
```

---

## 🧩 Microservices Breakdown

| Service | Port | Primary Responsibility |
| :--- | :--- | :--- |
| **API Gateway** | `4008` | The single public entry point. Handles proxy routing and intercepts disabled routes. |
| **Auth Service** | `4001` | Handles user registration, password hashing, login, and JWT generation. |
| **User Service** | `4002` | Manages public user profiles, bios, avatars, and user search functionality. |
| **Post Service** | `4003` | Core CRUD operations for posts, handling likes, saves, and Cloudinary uploads. |
| **Feed Service** | `4004` | Aggregates data to generate a personalized timeline of posts from followed users. |
| **Comment Service** | `4005` | Manages comment threads attached to specific posts. |
| **Friend Service** | `4006` | Handles the Follow/Unfollow mechanism, followers lists, and friend recommendations. |
| **Story Service** | `4009` | Manages ephemeral content (Stories) with built-in 24-hour expiration logic. |
| **Notify Service** | `4007` | Manages in-app user notifications for interactions (likes, follows, etc.). |
| **Controller Service**| `4000` | Service registry acting as a master switch to toggle services on/off for testing. |

---

## 💻 Tech Stack

- **Frontend:** React.js, Vite, standard CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ORM)
- **DevOps/Deployment:** Docker, Docker Compose
- **Cloud Storage:** Cloudinary (for Media)

---

## 🛠 Getting Started

To run this project locally, you will need **Docker** and **Docker Desktop** installed on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/your-username/SocialWave.git
cd SocialWave
```

### 2. Setup Environment Variables
Copy the example environment file and fill in your actual Cloudinary credentials:
```bash
cp .env.example .env
```
*(See the Environment Variables section below for details).*

### 3. Build and Run with Docker
Use Docker Compose to build the images and spin up all 12 containers (10 services, 1 frontend, 1 MongoDB instance) simultaneously:
```bash
docker compose build
docker compose up -d
```

### 4. Access the Application
- **Main Application:** `http://localhost:3000`
- **Admin Dashboard:** `http://localhost:4000`

---

## 🔐 Environment Variables

To run this project, you will need to add the following environment variables to your root `.env` file:

`JWT_SECRET` - Your secure JSON Web Token secret key.

`CLOUDINARY_CLOUD_NAME` - From your Cloudinary Dashboard
`CLOUDINARY_API_KEY` - From your Cloudinary Dashboard
`CLOUDINARY_API_SECRET` - From your Cloudinary Dashboard

*(MongoDB URIs are automatically configured for the internal Docker network).*

---
<p align="center">
  <i>Developed with ❤️ for modern system design.</i>
</p>
