# Local Setup & Development Guide

This guide covers running SocialWave locally on your machine at **$0 cost** using either **Docker Compose** or **Local Kubernetes** (Docker Desktop, Minikube, or Kind).

---

## 1. Prerequisites
- **Node.js**: v18+ or v20+
- **Docker**: Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- **kubectl**: For local Kubernetes testing (included with Docker Desktop)

---

## 2. Option A: Running with Docker Compose (Recommended for Dev)

Docker Compose spins up all 10 microservices, the API Gateway, Frontend, and MongoDB on a single shared network (`social-net`).

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/AyushiVerma791/SocialWave.git
cd SocialWave

# Copy example environment configuration
cp .env.example .env
```

Edit `.env` and fill in your Cloudinary keys (or leave defaults for offline testing):
```ini
JWT_SECRET=supersecretjwtkey
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 2: Build and Start Containers
```bash
# Build all images
docker compose build

# Start containers in background
docker compose up -d
```

### Step 3: Access the Applications
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **API Gateway**: [http://localhost:4008](http://localhost:4008)
- **Admin Controller Dashboard**: [http://localhost:4000](http://localhost:4000)
- **Local MongoDB**: `localhost:27017`

### Step 4: Verify Container Health
```bash
docker compose ps
```
All containers should report `(healthy)` thanks to the dedicated `/healthz` endpoints.

### Step 5: Stopping the Environment
```bash
docker compose down
```

---

## 3. Option B: Running on Local Kubernetes (Minikube / Docker Desktop / Kind)

To test the exact Kubernetes deployments, services, and probes locally without spending any cloud money:

### Step 1: Enable Kubernetes in Docker Desktop (or start Minikube)
```bash
minikube start --memory=4096 --cpus=2
# OR in Docker Desktop: Settings -> Kubernetes -> Enable Kubernetes
```

### Step 2: Build Local Images
```bash
docker compose build
```

### Step 3: Deploy via Kustomize (Dev Overlay)
```bash
# Apply dev overlay (includes in-cluster local MongoDB)
kubectl apply -k k8s/overlays/dev
```

### Step 4: Verify Pods and Services
```bash
kubectl get pods -n socialwave
kubectl get svc -n socialwave
```

### Step 5: Port Forwarding for Testing
```bash
# Forward Frontend to localhost:3000
kubectl port-forward svc/frontend 3000:80 -n socialwave

# In a separate terminal, forward API Gateway to localhost:4008
kubectl port-forward svc/api-gateway 4008:4008 -n socialwave
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

### Step 6: Local Teardown
```bash
kubectl delete -k k8s/overlays/dev
```
