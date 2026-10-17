# SocialWave — Cloud-Native AWS & Kubernetes Microservices Platform

A resilient, production-ready social media platform engineered with a **10-service Microservices Architecture**, containerized with Docker, orchestrated on **Kubernetes (Amazon EKS)**, and exposed securely via an **AWS Application Load Balancer (ALB)**.

[![AWS](https://img.shields.io/badge/AWS-EKS%20%7C%20ECR%20%7C%20ALB%20%7C%20S3-FF9900?style=flat&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Kustomize%20%7C%20HPA%20%7C%20NetworkPolicies-326CE5?style=flat&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage%20%7C%20Non--Root-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![CI/CD](https://img.shields.io/badge/GitHub_Actions-OIDC%20%7C%20Automated%20Deploy-2088FF?style=flat&logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20Nginx-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)

---

## 📖 Architecture Overview

```mermaid
graph TD
    User([End User / Web Browser]) -->|HTTPS / Port 443| ALB[AWS Application Load Balancer]

    subgraph Amazon EKS Cluster (Kubernetes)
        subgraph Namespace: socialwave
            Frontend[React Vite SPA on Nginx :80]
            Gateway[API Gateway Express :4008]
            
            subgraph Domain Microservices (Non-Root)
                AuthSvc[Auth Service :4001]
                UserSvc[User Service :4002]
                PostSvc[Post Service :4003]
                FeedSvc[Feed Service :4004]
                CommentSvc[Comment Service :4005]
                FriendSvc[Friend Service :4006]
                NotifySvc[Notification Service :4007]
                StorySvc[Story Service :4009]
                CtrlSvc[Controller Service :4000]
            end
        end
    end

    subgraph Data & Cloud Services
        AtlasDB[(MongoDB Atlas / Multi-AZ)]
        MediaCDN[Cloudinary CDN / Amazon S3]
    end

    ALB -->|/api/*| Gateway
    ALB -->|/*| Frontend

    Gateway --> CtrlSvc
    Gateway --> AuthSvc
    Gateway --> UserSvc
    Gateway --> PostSvc
    Gateway --> FeedSvc
    Gateway --> CommentSvc
    Gateway --> FriendSvc
    Gateway --> NotifySvc
    Gateway --> StorySvc

    AuthSvc --> AtlasDB
    UserSvc --> AtlasDB
    PostSvc --> AtlasDB
    CommentSvc --> AtlasDB
    FriendSvc --> AtlasDB
    NotifySvc --> AtlasDB
    StorySvc --> AtlasDB

    PostSvc -.-> MediaCDN
    StorySvc -.-> MediaCDN
```

---

## 🧩 Microservices Matrix

| Service | Port | Primary Responsibility | Data Isolation | Health Probe |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway** | `4008` | Single entry point, reverse proxy, path normalization | Stateless | `GET /healthz` |
| **Controller Service** | `4000` | Dynamic service registry & circuit breaker status toggle | In-Memory | `GET /healthz` |
| **Auth Service** | `4001` | User registration, Bcrypt hashing, JWT issuance | `auth-db` | `GET /healthz` |
| **User Service** | `4002` | Public profiles, user search, lazy profile initialization | `user-db` | `GET /healthz` |
| **Post Service** | `4003` | Post CRUD, like/unlike, bookmark/save, repost | `post-db` | `GET /healthz` |
| **Feed Service** | `4004` | Personalized timeline aggregation | Aggregator | `GET /healthz` |
| **Comment Service** | `4005` | Post comments and interaction alerts | `comment-db` | `GET /healthz` |
| **Friend Service** | `4006` | Follow/unfollow, follower lists, friend recommendations | `friend-db` | `GET /healthz` |
| **Notification Service** | `4007` | Real-time user notification tracking and status | `notify-db` | `GET /healthz` |
| **Story Service** | `4009` | 24h expiring stories with MongoDB TTL auto-deletion | `story-db` | `GET /healthz` |
| **Frontend** | `80` | React 18 SPA served via optimized Nginx container | Static | `GET /healthz` |

---

## ⚡ Quick Start: Local Development ($0 Cost)

Run the full 12-container environment locally via Docker Compose:

```bash
# 1. Clone repository
git clone https://github.com/AyushiVerma791/SocialWave.git
cd SocialWave

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Build and launch containers
docker compose build
docker compose up -d

# 4. Open applications
# Frontend: http://localhost:3000
# API Gateway: http://localhost:4008
# Controller Dashboard: http://localhost:4000
```

---

## ☸️ Local Kubernetes Testing ($0 Cost)

You can validate the full Kubernetes architecture on Minikube, Docker Desktop K8s, or Kind before cloud deployment:

```bash
# Apply dev overlay (includes in-cluster MongoDB)
kubectl apply -k k8s/overlays/dev

# Forward ports to test locally
kubectl port-forward svc/frontend 3000:80 -n socialwave
kubectl port-forward svc/api-gateway 4008:4008 -n socialwave
```

---

## ☁️ Deploying to Amazon Web Services (AWS EKS)

Deploy to Amazon EKS with managed node groups and AWS Load Balancer Controller:

### Step 1: Build & Push Images to Amazon ECR
```bash
# Linux/macOS
./scripts/ecr-build-and-push.sh us-east-1 <YOUR_AWS_ACCOUNT_ID> latest

# Windows (PowerShell)
.\scripts\ecr-build-and-push.ps1 -Region us-east-1 -AccountId <YOUR_AWS_ACCOUNT_ID>
```

### Step 2: Provision EKS Cluster & Deploy App
```bash
# Linux/macOS
./scripts/eks-cluster-setup.sh us-east-1

# Windows (PowerShell)
.\scripts\eks-cluster-setup.ps1 -Region us-east-1
```

Get your live AWS Load Balancer URL:
```bash
kubectl -n socialwave get ingress socialwave-ingress
```

---

## 💰 Student Cost-Control & Instant Teardown

Testing this project live on AWS for **2 to 3 hours** costs only **~₹50 to ₹70 INR (~$0.60 to $0.85 USD)**. 

To prevent lingering charges, run our automated teardown script immediately after testing:

```bash
# Linux/macOS
./scripts/aws-cleanup.sh us-east-1 false

# Windows (PowerShell)
.\scripts\aws-cleanup.ps1 -Region us-east-1
```

---

## 📚 Comprehensive Documentation Suite

- **[System Architecture & Data Flows](docs/architecture.md)**
- **[Local Development & Docker Compose](docs/local-setup.md)**
- **[AWS Infrastructure & ECR Setup](docs/aws-setup.md)**
- **[Kubernetes Deployment & Troubleshooting](docs/kubernetes-deployment.md)**
- **[GitHub Actions CI/CD with AWS OIDC](docs/cicd.md)**
- **[Cost-Control & Cleanup Guide](docs/cost-and-cleanup.md)**

---

<p align="center">
  <i>Engineered with ❤️ for modern Cloud & DevOps excellence.</i>
</p>
