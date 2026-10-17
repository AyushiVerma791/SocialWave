<#
.SYNOPSIS
    SocialWave: Amazon ECR Build, Tag & Push Automation (PowerShell)
.DESCRIPTION
    Builds all 11 microservice images and pushes them to Amazon ECR.
.PARAMETER Region
    AWS Region (default: us-east-1)
.PARAMETER AccountId
    AWS Account ID (defaults to current sts identity)
.PARAMETER ImageTag
    Tag for the images (default: latest)
#>

param(
    [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { $r = (aws configure get region 2>$null); if ($r) { $r.Trim() } else { "ap-south-1" } }),
    [string]$AccountId = $(if ($env:AWS_ACCOUNT_ID) { $env:AWS_ACCOUNT_ID } else { (aws sts get-caller-identity --query Account --output text 2>$null) }),
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

if (-not $AccountId) {
    Write-Error "AWS Account ID could not be detected. Please configure AWS CLI credentials or pass -AccountId."
}

$Registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SocialWave: Amazon ECR Build and Push" -ForegroundColor Cyan
Write-Host " AWS Region:   $Region"
Write-Host " Account ID:   $AccountId"
Write-Host " Registry:     $Registry"
Write-Host " Image Tag:    $ImageTag"
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "--> Logging into Amazon ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $Registry

$Services = @(
    @{ Dir = "controller-service";   Repo = "socialwave-controller" },
    @{ Dir = "auth-service";         Repo = "socialwave-auth" },
    @{ Dir = "user-service";         Repo = "socialwave-user" },
    @{ Dir = "post-service";         Repo = "socialwave-post" },
    @{ Dir = "feed-service";         Repo = "socialwave-feed" },
    @{ Dir = "comment-service";      Repo = "socialwave-comment" },
    @{ Dir = "friend-service";       Repo = "socialwave-friend" },
    @{ Dir = "notification-service"; Repo = "socialwave-notification" },
    @{ Dir = "story-service";        Repo = "socialwave-story" },
    @{ Dir = "api-gateway";          Repo = "socialwave-api-gateway" },
    @{ Dir = "frontend";             Repo = "socialwave-frontend" }
)

$existingRepos = (aws ecr describe-repositories --region $Region --query 'repositories[*].repositoryName' --output text 2>$null)
if ($existingRepos) {
    $existingList = $existingRepos -split '\s+'
} else {
    $existingList = @()
}

foreach ($s in $Services) {
    Write-Host "----------------------------------------------------------" -ForegroundColor Gray
    Write-Host " Processing Service: $($s.Repo) ($($s.Dir))" -ForegroundColor Green
    Write-Host "----------------------------------------------------------" -ForegroundColor Gray

    # Check if ECR repo exists
    if ($existingList -notcontains $s.Repo) {
        Write-Host "Creating ECR repository: $($s.Repo)..." -ForegroundColor Yellow
        aws ecr create-repository --repository-name $s.Repo --region $Region --image-scanning-configuration scanOnPush=true --encryption-configuration encryptionType=AES256 2>$null | Out-Null
    }

    $TargetImage = "$Registry/$($s.Repo):$ImageTag"

    Write-Host "Building Docker image: $TargetImage..." -ForegroundColor Cyan
    docker build -t $TargetImage "./$($s.Dir)"

    Write-Host "Pushing Docker image to ECR..." -ForegroundColor Cyan
    docker push $TargetImage

    Write-Host "[DONE] Successfully pushed $TargetImage" -ForegroundColor Green
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " All 11 SocialWave images successfully pushed to ECR!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
