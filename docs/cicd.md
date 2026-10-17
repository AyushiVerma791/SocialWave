# GitHub Actions CI/CD with AWS OIDC Federation

This guide covers the automated Continuous Integration and Continuous Deployment (CI/CD) pipelines implemented for SocialWave using GitHub Actions and AWS IAM OpenID Connect (OIDC) federation.

---

## 1. Why GitHub OIDC Instead of Static AWS Keys?

Traditional CI/CD pipelines store static `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets in GitHub. This introduces severe security vulnerabilities:
- Keys can be leaked, stolen, or forgotten.
- Keys never expire automatically.

**Our Approach**: We use **AWS IAM OpenID Connect (OIDC)**. GitHub Actions assumes a temporary IAM Role directly via AWS Security Token Service (STS) using short-lived cryptographic tokens (1-hour lifespan). **Zero static AWS credentials are ever stored in GitHub.**

---

## 2. Setting Up AWS IAM OIDC for GitHub Actions

### Step 1: Create the GitHub OIDC Identity Provider in AWS
In your AWS Console (or via CLI):
```bash
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"
```

### Step 2: Create the IAM Role for GitHub Actions
Create a trust policy file `trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<YOUR_AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:AyushiVerma791/SocialWave:*"
        }
      }
    }
  ]
}
```

Create the role:
```bash
aws iam create-role \
  --role-name "GitHubActions-SocialWave-Role" \
  --assume-role-policy-document file://trust-policy.json
```

### Step 3: Attach ECR and EKS Permissions to the Role
```bash
aws iam attach-role-policy --role-name "GitHubActions-SocialWave-Role" --policy-arn "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
```

---

## 3. GitHub Repository Secrets Setup

In your GitHub repository, navigate to **Settings -> Secrets and variables -> Actions**, and add the following:

| Secret Name | Example Value | Description |
| :--- | :--- | :--- |
| `AWS_ROLE_ARN` | `arn:aws:iam::123456789012:role/GitHubActions-SocialWave-Role` | IAM Role assumed by GitHub Actions |
| `AWS_REGION` | `us-east-1` | Target AWS Region |
| `EKS_CLUSTER_NAME` | `socialwave-cluster` | Target EKS Cluster Name |

---

## 4. Pipeline Workflows

### 1. Continuous Integration (`.github/workflows/ci.yml`)
- **Trigger**: Every pull request and push to the `main` branch.
- **Actions**:
  1. Validates Node.js syntax across all 10 backend microservices and API gateway.
  2. Runs `node gen_k8s.js` and validates Kustomize manifests.
  3. Uses a matrix strategy to test-build all 11 Dockerfiles simultaneously.

### 2. Continuous Deployment (`.github/workflows/deploy.yml`)
- **Trigger**: Protected manual trigger (`workflow_dispatch`) to avoid unwanted cloud deployment charges.
- **Actions**:
  1. Assumes the temporary AWS IAM Role via OIDC.
  2. Authenticates to Amazon ECR.
  3. Builds, tags (with `git-sha`), and pushes all 11 images.
  4. Runs `kustomize edit set image` to update image tags.
  5. Applies manifests to EKS and verifies zero-downtime rolling updates.
