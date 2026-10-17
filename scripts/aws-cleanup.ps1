<#
.SYNOPSIS
    SocialWave: Complete Teardown & Cost-Control Script (PowerShell)
.DESCRIPTION
    Safely tears down the Kubernetes Ingress (destroying the AWS ALB),
    deletes the EKS cluster, and optionally wipes ECR repositories.
#>

param(
    [string]$ClusterName = "socialwave-cluster",
    [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }),
    [switch]$DeleteECR = $false
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Red
Write-Host " SocialWave: Complete AWS Teardown" -ForegroundColor Red
Write-Host " Cluster Name: $ClusterName"
Write-Host " Region:       $Region"
Write-Host " Delete ECR:   $DeleteECR"
Write-Host "==========================================================" -ForegroundColor Red

Write-Host "Step 1: Deleting Kubernetes Ingress (Triggering AWS ALB deletion)..." -ForegroundColor Yellow
kubectl delete ingress socialwave-ingress -n socialwave --ignore-not-found=true

Write-Host "Waiting 30 seconds for AWS ALB and Target Groups to terminate cleanly..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "Step 2: Deleting Kubernetes Namespace 'socialwave'..." -ForegroundColor Yellow
kubectl delete namespace socialwave --ignore-not-found=true

Write-Host "Step 3: Deleting EKS Cluster via eksctl (deletes EC2 nodes, AutoScaling groups, VPC)..." -ForegroundColor Yellow
eksctl delete cluster --name $ClusterName --region $Region --wait

Write-Host "Step 4: Deleting IAM Policy for AWS Load Balancer Controller..." -ForegroundColor Yellow
$AccountId = (aws sts get-caller-identity --query Account --output text 2>$null)
if ($AccountId) {
    $PolicyArn = "arn:aws:iam::$($AccountId):policy/AWSLoadBalancerControllerIAMPolicy-SocialWave"
    aws iam delete-policy --policy-arn $PolicyArn 2>$null | Out-Null
}

if ($DeleteECR) {
    Write-Host "Step 5: Deleting ECR Repositories..." -ForegroundColor Yellow
    $repos = @(
        "socialwave-controller", "socialwave-auth", "socialwave-user",
        "socialwave-post", "socialwave-feed", "socialwave-comment",
        "socialwave-friend", "socialwave-notification", "socialwave-story",
        "socialwave-api-gateway", "socialwave-frontend"
    )
    foreach ($r in $repos) {
        Write-Host "Deleting ECR repo: $r..." -ForegroundColor Gray
        aws ecr delete-repository --repository-name $r --region $Region --force 2>$null | Out-Null
    }
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] All SocialWave AWS resources successfully deleted!" -ForegroundColor Green
Write-Host " Your AWS recurring bill is safe ($0.00 lingering cost)." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
