# Student Cost-Control & Cleanup Guide

This guide ensures you can deploy, test, screenshot, and present your AWS Kubernetes project while keeping your cloud expenditure strictly within **₹50 to ₹70 INR (~$0.60 to $0.85 USD)** total.

---

## 1. Itemized Cost Breakdown (For a 2 to 3-Hour Demonstration)

| Service | Rate | Estimated Cost (3-Hour Test) | How We Kept It Low |
| :--- | :--- | :--- | :--- |
| **Amazon EKS Control Plane** | $0.10 / hr | **~$0.30 (~₹25)** | Flat rate billed by AWS while the cluster is active. |
| **EC2 Worker Nodes** (2x `t3.medium`) | $0.0416 / hr each | **~$0.25 (~₹21)** | Sized just right to comfortably fit all 11 microservices. |
| **AWS Application Load Balancer** | $0.0225 / hr | **~$0.07 (~₹6)** | Automatically provisioned for the Ingress. |
| **Amazon ECR Storage** | $0.10 / GB / mo | **<$0.01 (<₹1)** | 11 lightweight Alpine images (~1.5 GB). |
| **MongoDB Atlas** | M0 Sandbox | **₹0.00 (100% Free)** | Free tier cloud database, no credit card required. |
| **Amazon S3 Storage** | Free Tier | **₹0.00 (100% Free)** | 5 GB standard storage included in AWS Free Tier. |
| **Amazon CloudWatch** | Free Tier | **₹0.00 (100% Free)** | 5 GB logs included in AWS Free Tier. |
| **NAT Gateway** | $0.045 / hr | **₹0.00 (SAVED!)** | Nodes run in public subnets with direct internet access. |
| **TOTAL FOR 3-HOUR TEST** | | **~₹50 to ₹60 INR (~$0.70 USD)** | |

---

## 2. The Golden Rule of Student Cloud Projects
> **Run your test -> Take your screenshots/demo -> Execute Cleanup immediately.**

If you leave an EKS cluster and ALB running 24/7 for an entire month, AWS will bill approximately **₹10,000 to ₹12,000 INR (~$135 USD)**. 
Running our one-click cleanup command stops all hourly billing instantly.

---

## 3. Instant One-Click Cleanup Script

When you are finished with your demo or testing:

**On Linux/macOS:**
```bash
chmod +x scripts/aws-cleanup.sh

# Basic cleanup (deletes ALB, nodes, and EKS cluster)
./scripts/aws-cleanup.sh us-east-1 false

# Complete cleanup (also deletes the ECR repositories)
./scripts/aws-cleanup.sh us-east-1 true
```

**On Windows (PowerShell):**
```powershell
# Basic cleanup
.\scripts\aws-cleanup.ps1 -Region us-east-1

# Complete cleanup (including ECR images)
.\scripts\aws-cleanup.ps1 -Region us-east-1 -DeleteECR
```

---

## 4. Manual Post-Cleanup Verification Checklist

To have 100% peace of mind that your AWS bill is at $0.00:

1. **Check EKS Clusters**:
   ```bash
   aws eks list-clusters --region us-east-1
   ```
   *Expected output*: `{ "clusters": [] }`
2. **Check Load Balancers (ALBs)**:
   ```bash
   aws elbv2 describe-load-balancers --region us-east-1 --query "LoadBalancers[*].LoadBalancerName"
   ```
   *Expected output*: `[]`
3. **Check EC2 Instances**:
   ```bash
   aws ec2 describe-instances --region us-east-1 --filters "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].InstanceId"
   ```
   *Expected output*: `[]`
4. **Check AWS Billing Dashboard**:
   - Go to [AWS Billing Console](https://console.aws.amazon.com/billing/).
   - Check the **Bills** tab after 24 hours to verify the charge is only ~$0.50 - $0.80.
