# AWS Infrastructure & Prerequisites Guide

This guide covers the prerequisites and step-by-step setup for deploying SocialWave to Amazon Web Services (AWS) using Amazon ECR, Amazon EKS, and the AWS Load Balancer Controller.

---

## 1. Prerequisites & CLI Tools

Ensure you have the following installed on your local computer:
1. **AWS CLI v2**: [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
2. **eksctl**: [Install eksctl](https://eksctl.io/installation/)
3. **kubectl**: [Install kubectl](https://kubernetes.io/docs/tasks/tools/)
4. **helm**: [Install Helm](https://helm.sh/docs/intro/install/)

Verify installations:
```bash
aws --version
eksctl version
kubectl version --client
helm version
```

---

## 2. AWS Authentication & Configuration

Configure your AWS credentials:
```bash
aws configure
```
Input:
- **AWS Access Key ID**
- **AWS Secret Access Key**
- **Default region name**: `us-east-1` (or your preferred region, e.g. `ap-south-1`)
- **Default output format**: `json`

Verify authentication:
```bash
aws sts get-caller-identity
```

---

## 3. MongoDB Atlas Free Cluster Setup (Recommended)

1. Sign up for a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create an **M0 Free Sandbox Cluster** (select AWS as cloud provider and your same region).
3. Under **Security -> Database Access**, create a database user (e.g. `socialwave_admin`).
4. Under **Security -> Network Access**, click **Add IP Address** and select **Allow Access from Anywhere (0.0.0.0/0)** (or whitelist your EKS VPC CIDR).
5. Copy the connection string format:
   ```text
   mongodb+srv://socialwave_admin:<password>@cluster0.abcde.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```

---

## 4. Amazon ECR Image Publishing

Build and push all 11 Docker images to Amazon Elastic Container Registry (ECR) using our automated script:

**On Linux/macOS:**
```bash
chmod +x scripts/ecr-build-and-push.sh
./scripts/ecr-build-and-push.sh us-east-1 <YOUR_AWS_ACCOUNT_ID> latest
```

**On Windows (PowerShell):**
```powershell
.\scripts\ecr-build-and-push.ps1 -Region us-east-1 -AccountId <YOUR_AWS_ACCOUNT_ID> -ImageTag latest
```

This script will:
- Authenticate Docker to your private ECR registry.
- Automatically create 11 ECR repositories with AES-256 encryption and scan-on-push enabled.
- Build and push all 11 images.

---

## 5. Amazon EKS Provisioning (Cost-Optimized)

Run our automated cluster creation and controller setup script:

**On Linux/macOS:**
```bash
chmod +x scripts/eks-cluster-setup.sh
./scripts/eks-cluster-setup.sh us-east-1
```

**On Windows (PowerShell):**
```powershell
.\scripts\eks-cluster-setup.ps1 -Region us-east-1
```

### What this script provisions:
1. **Managed EKS Cluster**: Named `socialwave-cluster` with 2 worker nodes (`t3.medium`).
2. **Cost-Optimization**: Worker nodes are deployed into public subnets with direct internet access, **saving ~$32/month on NAT Gateways**.
3. **IAM OIDC Provider**: Configured for Kubernetes ServiceAccounts.
4. **AWS Load Balancer Controller**: Deployed via Helm to provision Application Load Balancers for your Ingress.
