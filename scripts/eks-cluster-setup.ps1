<#
.SYNOPSIS
    SocialWave: Amazon EKS Cluster Deployment (PowerShell)
.DESCRIPTION
    Provisions a minimal, low-cost EKS cluster, installs the AWS Load Balancer Controller,
    and deploys the SocialWave microservices.
#>

param(
    [string]$ClusterName = "socialwave-cluster",
    [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }),
    [string]$NodeType = "t3.medium",
    [int]$Nodes = 2
)

$ErrorActionPreference = "Stop"

$AccountId = (aws sts get-caller-identity --query Account --output text)
if (-not $AccountId) {
    Write-Error "AWS credentials not detected. Run 'aws configure' first."
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SocialWave: Amazon EKS Cluster Deployment" -ForegroundColor Cyan
Write-Host " Cluster Name: $ClusterName"
Write-Host " Region:       $Region"
Write-Host " Account ID:   $AccountId"
Write-Host " Node Type:    $NodeType (Nodes: $Nodes)"
Write-Host " Cost Profile: Minimalist (Public Subnets, No NAT Gateway)"
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check or Create Cluster
$clusterExists = eksctl get cluster --name $ClusterName --region $Region 2>$null
if ($clusterExists) {
    Write-Host "Cluster '$ClusterName' already exists. Skipping creation." -ForegroundColor Yellow
} else {
    Write-Host "--> Creating EKS Cluster '$ClusterName' (takes ~10-15 mins)..." -ForegroundColor Cyan
    eksctl create cluster `
        --name $ClusterName `
        --region $Region `
        --nodegroup-name "standard-workers" `
        --node-type $NodeType `
        --nodes $Nodes `
        --nodes-min 1 `
        --nodes-max 3 `
        --managed
}

# 2. Update kubeconfig
Write-Host "--> Updating kubeconfig context..." -ForegroundColor Yellow
aws eks update-kubeconfig --name $ClusterName --region $Region

# 3. Associate OIDC
Write-Host "--> Associating IAM OIDC Provider..." -ForegroundColor Yellow
eksctl utils associate-iam-oidc-provider --cluster $ClusterName --region $Region --approve

# 4. IAM for AWS Load Balancer Controller
Write-Host "--> Configuring AWS Load Balancer Controller IAM Policy & ServiceAccount..." -ForegroundColor Yellow
$PolicyName = "AWSLoadBalancerControllerIAMPolicy-SocialWave"
$PolicyArn = "arn:aws:iam::$($AccountId):policy/$PolicyName"

$policyCheck = aws iam get-policy --policy-arn $PolicyArn 2>$null
if (-not $policyCheck) {
    $tempPolicy = "$env:TEMP\iam_policy.json"
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.8.1/docs/install/iam_policy.json" -OutFile $tempPolicy
    aws iam create-policy --policy-name $PolicyName --policy-document "file://$tempPolicy" | Out-Null
}

eksctl create iamserviceaccount `
    --cluster=$ClusterName `
    --namespace=kube-system `
    --name=aws-load-balancer-controller `
    --role-name "AmazonEKSLoadBalancerControllerRole-SocialWave" `
    --attach-policy-arn=$PolicyArn `
    --region $Region `
    --approve `
    --override-existing-serviceaccounts

# 5. Install AWS Load Balancer Controller via Helm
Write-Host "--> Installing AWS Load Balancer Controller..." -ForegroundColor Yellow
helm repo add eks https://aws.github.io/eks-charts 2>$null | Out-Null
helm repo update eks | Out-Null

$VpcId = (aws eks describe-cluster --name $ClusterName --region $Region --query "cluster.resourcesVpcConfig.vpcId" --output text)

helm upgrade -i aws-load-balancer-controller eks/aws-load-balancer-controller `
    -n kube-system `
    --set clusterName=$ClusterName `
    --set serviceAccount.create=false `
    --set serviceAccount.name=aws-load-balancer-controller `
    --set region=$Region `
    --set vpcId=$VpcId

# 6. Apply Kubernetes Manifests
Write-Host "--> Deploying SocialWave Microservices to EKS..." -ForegroundColor Green
kubectl apply -k k8s/overlays/prod

Write-Host "--> Checking rollouts..." -ForegroundColor Cyan
kubectl -n socialwave rollout status deployment/api-gateway --timeout=180s
kubectl -n socialwave rollout status deployment/frontend --timeout=180s

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " SocialWave Application Successfully Deployed!" -ForegroundColor Green
Write-Host " Ingress Status:" -ForegroundColor Cyan
kubectl -n socialwave get ingress socialwave-ingress
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Note: The AWS ALB DNS Name will appear under ADDRESS above." -ForegroundColor Yellow
Write-Host " When done testing, run .\scripts\aws-cleanup.ps1 to stop charges!" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
