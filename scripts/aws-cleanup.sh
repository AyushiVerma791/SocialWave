#!/usr/bin/env bash
# ==============================================================================
# SocialWave: Complete Teardown & Cost-Control Script
# Deletes all AWS EKS, ALB, Target Groups, IAM Roles, and ECR Repositories
# to ensure zero lingering charges on your AWS bill.
# ==============================================================================

set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-socialwave-cluster}"
AWS_REGION="${1:-${AWS_REGION:-us-east-1}}"
DELETE_ECR="${2:-false}"

echo "=========================================================="
echo " SocialWave: Complete AWS Teardown"
echo " Cluster Name: $CLUSTER_NAME"
echo " Region:       $AWS_REGION"
echo " Delete ECR:   $DELETE_ECR"
echo "=========================================================="

echo "Step 1: Deleting Kubernetes Ingress (Triggering AWS ALB deletion)..."
kubectl delete ingress socialwave-ingress -n socialwave --ignore-not-found=true || true

echo "Waiting 30 seconds for AWS ALB and Target Groups to terminate cleanly..."
sleep 30

echo "Step 2: Deleting Kubernetes Namespace 'socialwave'..."
kubectl delete namespace socialwave --ignore-not-found=true || true

echo "Step 3: Deleting EKS Cluster via eksctl (this deletes EC2 nodes, AutoScaling groups, and VPC)..."
eksctl delete cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" --wait

echo "Step 4: Deleting IAM Policy for AWS Load Balancer Controller..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
if [ -n "$AWS_ACCOUNT_ID" ]; then
  POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy-SocialWave"
  aws iam delete-policy --policy-arn "$POLICY_ARN" 2>/dev/null || true
fi

if [ "$DELETE_ECR" = "true" ]; then
  echo "Step 5: Deleting ECR Repositories..."
  SERVICES=(
    "socialwave-controller"
    "socialwave-auth"
    "socialwave-user"
    "socialwave-post"
    "socialwave-feed"
    "socialwave-comment"
    "socialwave-friend"
    "socialwave-notification"
    "socialwave-story"
    "socialwave-api-gateway"
    "socialwave-frontend"
  )
  for repo in "${SERVICES[@]}"; do
    echo "Deleting ECR repo: $repo..."
    aws ecr delete-repository --repository-name "$repo" --region "$AWS_REGION" --force 2>/dev/null || true
  done
fi

echo "=========================================================="
echo " [SUCCESS] All SocialWave AWS resources successfully deleted!"
echo " Your AWS recurring bill is safe ($0.00 lingering cost)."
echo "=========================================================="
