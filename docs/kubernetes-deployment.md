# Kubernetes Deployment & Troubleshooting Guide

This guide covers deploying, scaling, verifying, and troubleshooting SocialWave on Kubernetes using Kustomize.

---

## 1. Deploying to Kubernetes

### Step 1: Prepare Production Secrets
Before applying the production overlay, update `k8s/base/secret-template.yaml` with your actual MongoDB Atlas connection string, JWT Secret, and Cloudinary keys:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: socialwave-secrets
  namespace: socialwave
type: Opaque
stringData:
  JWT_SECRET: "your-strong-production-jwt-secret-key"
  MONGO_URI_AUTH: "mongodb+srv://user:pass@cluster.mongodb.net/auth-db?retryWrites=true&w=majority"
  MONGO_URI_USER: "mongodb+srv://user:pass@cluster.mongodb.net/user-db?retryWrites=true&w=majority"
  MONGO_URI_POST: "mongodb+srv://user:pass@cluster.mongodb.net/post-db?retryWrites=true&w=majority"
  MONGO_URI_FEED: "mongodb+srv://user:pass@cluster.mongodb.net/feed-db?retryWrites=true&w=majority"
  MONGO_URI_COMMENT: "mongodb+srv://user:pass@cluster.mongodb.net/comment-db?retryWrites=true&w=majority"
  MONGO_URI_FRIEND: "mongodb+srv://user:pass@cluster.mongodb.net/friend-db?retryWrites=true&w=majority"
  MONGO_URI_NOTIFY: "mongodb+srv://user:pass@cluster.mongodb.net/notify-db?retryWrites=true&w=majority"
  MONGO_URI_STORY: "mongodb+srv://user:pass@cluster.mongodb.net/story-db?retryWrites=true&w=majority"
  CLOUDINARY_CLOUD_NAME: "your_cloud_name"
  CLOUDINARY_API_KEY: "your_key"
  CLOUDINARY_API_SECRET: "your_secret"
```

### Step 2: Apply Production Manifests
```bash
kubectl apply -k k8s/overlays/prod
```

### Step 3: Monitor Rollout
```bash
kubectl -n socialwave rollout status deployment/api-gateway
kubectl -n socialwave rollout status deployment/frontend
kubectl -n socialwave get pods -o wide
```

### Step 4: Verify Application Load Balancer
```bash
kubectl -n socialwave get ingress socialwave-ingress
```
Look for the `ADDRESS` field:
```text
NAME                 CLASS   HOSTS   ADDRESS                                                                  PORTS   AGE
socialwave-ingress   alb     *       k8s-socialwa-socialwa-xxxxxxxxxx-xxxxxxxx.us-east-1.elb.amazonaws.com   80      3m
```
Copy that URL into your web browser. The SocialWave React application will load!

---

## 2. Common Troubleshooting Scenarios

### 1. `ImagePullBackOff` or `ErrImagePull`
- **Cause**: Kubernetes cannot find the image in ECR or lacks IAM permissions to pull.
- **Remedy**:
  1. Verify the image exists in ECR:
     ```bash
     aws ecr list-images --repository-name socialwave-api-gateway
     ```
  2. Verify that your EKS node instance role has `AmazonEC2ContainerRegistryReadOnly` attached.

### 2. `CrashLoopBackOff` on Microservices
- **Cause**: Missing database connection string or environment variable.
- **Remedy**: Check pod logs:
  ```bash
  kubectl -n socialwave logs deployment/auth-service --tail=50
  ```
  If it shows `DB connection error`, verify that your MongoDB Atlas cluster has `0.0.0.0/0` whitelisted under Network Access.

### 3. ALB Ingress Address Remains Empty (`<none>`)
- **Cause**: The AWS Load Balancer Controller is either not installed or lacks IAM permissions.
- **Remedy**: Check controller logs in `kube-system`:
  ```bash
  kubectl -n kube-system logs -l app.kubernetes.io/name=aws-load-balancer-controller --tail=100
  ```
  Verify that your subnets are tagged:
  - `kubernetes.io/role/elb: 1` (for public subnets)
  - `kubernetes.io/cluster/socialwave-cluster: shared` or `owned`

---

## 3. Rolling Updates & Rollbacks

### Triggering a Rolling Update
```bash
kubectl -n socialwave set image deployment/post-service post-service=<ECR_REGISTRY>/socialwave-post:v1.1.0
```

### Checking Rollout History
```bash
kubectl -n socialwave rollout history deployment/post-service
```

### Rolling Back an Unhealthy Update
```bash
kubectl -n socialwave rollout undo deployment/post-service
```
Kubernetes will immediately roll back to the previously stable replica set with zero downtime.
