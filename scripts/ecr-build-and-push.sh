#!/usr/bin/env bash
# ==============================================================================
# SocialWave: Amazon ECR Build, Tag & Push Automation
# Builds all 11 microservice images and pushes them to Amazon ECR.
# ==============================================================================

set -euo pipefail

# Configuration: Set defaults or read from environment / CLI arguments
AWS_REGION="${1:-${AWS_REGION:-us-east-1}}"
AWS_ACCOUNT_ID="${2:-${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")}}"
IMAGE_TAG="${3:-${IMAGE_TAG:-latest}}"

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: AWS_ACCOUNT_ID could not be determined. Please pass it as argument 2 or run 'aws configure'."
  echo "Usage: ./scripts/ecr-build-and-push.sh <region> <account_id> [tag]"
  exit 1
fi

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "=========================================================="
echo " SocialWave: Amazon ECR Build and Push"
echo " AWS Region:   $AWS_REGION"
echo " Account ID:   $AWS_ACCOUNT_ID"
echo " Registry:     $ECR_REGISTRY"
echo " Image Tag:    $IMAGE_TAG"
echo "=========================================================="

# Authenticate Docker to Amazon ECR
echo "--> Logging into Amazon ECR..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Define all 11 services and their directory contexts
SERVICES=(
  "controller-service:socialwave-controller"
  "auth-service:socialwave-auth"
  "user-service:socialwave-user"
  "post-service:socialwave-post"
  "feed-service:socialwave-feed"
  "comment-service:socialwave-comment"
  "friend-service:socialwave-friend"
  "notification-service:socialwave-notification"
  "story-service:socialwave-story"
  "api-gateway:socialwave-api-gateway"
  "frontend:socialwave-frontend"
)

for entry in "${SERVICES[@]}"; do
  DIR="${entry%%:*}"
  REPO="${entry##*:}"

  echo "----------------------------------------------------------"
  echo " Processing Service: $REPO ($DIR)"
  echo "----------------------------------------------------------"

  # Create ECR repository if it does not already exist
  if ! aws ecr describe-repositories --repository-names "$REPO" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "Creating ECR repository: $REPO..."
    aws ecr create-repository \
      --repository-name "$REPO" \
      --region "$AWS_REGION" \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 >/dev/null
  fi

  TARGET_IMAGE="$ECR_REGISTRY/$REPO:$IMAGE_TAG"

  echo "Building Docker image: $TARGET_IMAGE..."
  docker build -t "$TARGET_IMAGE" "./$DIR"

  echo "Pushing Docker image to ECR..."
  docker push "$TARGET_IMAGE"

  echo "[DONE] Successfully pushed $TARGET_IMAGE"
done

echo "=========================================================="
echo " All 11 SocialWave images successfully pushed to ECR!"
echo "=========================================================="
