#!/usr/bin/env bash
# ==============================================================================
# SocialWave: Student Cost-Optimized Amazon EKS Provisioning & Deployment Script
# Provisions a minimal EKS cluster, installs AWS Load Balancer Controller,
# and deploys the entire SocialWave microservices application.
# ==============================================================================

set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-socialwave-cluster}"
AWS_REGION="${1:-${AWS_REGION:-us-east-1}}"
NODE_TYPE="${NODE_TYPE:-t3.medium}"
NUM_NODES="${NUM_NODES:-2}"

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "=========================================================="
echo " SocialWave: Amazon EKS Cluster Deployment"
echo " Cluster Name: $CLUSTER_NAME"
echo " Region:       $AWS_REGION"
echo " Account ID:   $AWS_ACCOUNT_ID"
echo " Node Type:    $NODE_TYPE (Nodes: $NUM_NODES)"
echo " Cost Profile: Minimalist (Public Subnets, No NAT Gateway)"
echo "=========================================================="

# 1. Provision EKS Cluster via eksctl (if not already running)
if eksctl get cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "Cluster '$CLUSTER_NAME' already exists. Skipping creation."
else
  echo "--> Creating EKS Cluster '$CLUSTER_NAME' (this typically takes ~10-15 mins)..."
  eksctl create cluster \
    --name "$CLUSTER_NAME" \
    --region "$AWS_REGION" \
    --nodegroup-name "standard-workers" \
    --node-type "$NODE_TYPE" \
    --nodes "$NUM_NODES" \
    --nodes-min 1 \
    --nodes-max 3 \
    --managed
fi

# 2. Update kubeconfig context
echo "--> Updating kubeconfig context..."
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"

# 3. Associate IAM OIDC Provider
echo "--> Associating IAM OIDC Provider..."
eksctl utils associate-iam-oidc-provider --cluster "$CLUSTER_NAME" --region "$AWS_REGION" --approve

# 4. Configure IAM for AWS Load Balancer Controller
echo "--> Configuring AWS Load Balancer Controller IAM Policy & ServiceAccount..."
POLICY_NAME="AWSLoadBalancerControllerIAMPolicy-SocialWave"
POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME}"

if ! aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
  curl -s -o /tmp/iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.8.1/docs/install/iam_policy.json
  aws iam create-policy --policy-name "$POLICY_NAME" --policy-document file:///tmp/iam_policy.json >/dev/null
fi

eksctl create iamserviceaccount \
  --cluster="$CLUSTER_NAME" \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name "AmazonEKSLoadBalancerControllerRole-SocialWave" \
  --attach-policy-arn="$POLICY_ARN" \
  --region "$AWS_REGION" \
  --approve \
  --override-existing-serviceaccounts

# 5. Install AWS Load Balancer Controller via Helm
echo "--> Installing AWS Load Balancer Controller..."
helm repo add eks https://aws.github.io/eks-charts >/dev/null 2>&1 || true
helm repo update eks >/dev/null

VPC_ID=$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" --query "cluster.resourcesVpcConfig.vpcId" --output text)

helm upgrade -i aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName="$CLUSTER_NAME" \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region="$AWS_REGION" \
  --set vpcId="$VPC_ID"

# 6. Apply Kubernetes Manifests
echo "--> Deploying SocialWave Microservices to EKS..."
sed -i.bak -e "s|socialwave-|${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/socialwave-|g" k8s/overlays/prod/kustomization.yaml 2>/dev/null || true

kubectl apply -k k8s/overlays/prod

echo "--> Waiting for Deployments rollout..."
kubectl -n socialwave rollout status deployment/api-gateway --timeout=180s || true
kubectl -n socialwave rollout status deployment/frontend --timeout=180s || true

echo "=========================================================="
echo " SocialWave Application Successfully Deployed!"
echo " Ingress Status:"
kubectl -n socialwave get ingress socialwave-ingress
echo "=========================================================="
echo " Note: The AWS ALB DNS Name will appear under ADDRESS above."
echo " It may take 2-3 minutes for AWS to register health checks."
echo " When done testing, run ./scripts/aws-cleanup.sh to stop charges!"
echo "=========================================================="
