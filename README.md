# Blue/Green Deployment for React SPAs on AWS

Zero-downtime blue/green deployment for Single Page Applications using AWS API Gateway and S3.

## Architecture

```
Users → API Gateway (prod/blue/green stages)
              │
              ├── Stage Variable: bucketName
              │
         ┌────┴────┐
         ▼         ▼
    Blue S3     Green S3
    Bucket      Bucket
   (v1)        (v2)
```

- Two private S3 buckets hold different app versions
- API Gateway stage variables control which bucket each stage routes to
- Three stages: `prod` (user-facing), `blue` (testing), `green` (testing)
- Switching versions is instant (~1 second) — just update the stage variable
- Rollback is equally instant

## Project Structure

```
├── src-web1/                # Blue version (purple theme)
│   ├── main.jsx
│   └── App.jsx
├── src-web2/                # Green version (pink theme)
│   ├── main.jsx
│   └── App.jsx
├── cdk/                     # AWS CDK infrastructure
│   ├── bin/app.js
│   ├── lib/stack.js
│   ├── cdk.json
│   └── package.json
├── scripts/
│   ├── deploy-blue.sh
│   └── deploy-green.sh
├── index-web1.html          # HTML template (blue)
├── index-web2.html          # HTML template (green)
├── vite.config.web1.js      # Vite config (blue)
├── vite.config.web2.js      # Vite config (green)
└── package.json
```

## Prerequisites

- AWS account with IAM permissions for S3, API Gateway, and IAM
- [Node.js](https://nodejs.org/) (v18+)
- [AWS CLI](https://aws.amazon.com/cli/) configured with credentials

## Quick Start (CDK — Recommended)

```bash
# Install app dependencies
npm install

# Install CDK dependencies
cd cdk && npm install && cd ..

# Bootstrap CDK (first time only)
cd cdk && npx cdk bootstrap && cd ..

# Deploy infrastructure
cd cdk && npx cdk deploy && cd ..

# Build and deploy app versions
npm run build:web1
npm run build:web2

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3 sync web1/ s3://react-app-blue-${ACCOUNT_ID}/ --delete
aws s3 sync web2/ s3://react-app-green-${ACCOUNT_ID}/ --delete
```

CDK outputs will display your API URLs.

---

> Before deploying, review [BUILD_AND_ARTIFACTS.md](BUILD_AND_ARTIFACTS.md) for a detailed explanation of the build process, output artifacts, relative path strategy, and hash-based routing.

---

## Deployment Options

### Option 1: AWS CDK (Recommended)

CDK creates all infrastructure (S3 buckets, API Gateway, IAM role, stages) in one command.

```bash
cd cdk
npm install
npx cdk bootstrap    # first time only
npx cdk diff         # preview changes
npx cdk deploy       # deploy
```

### Option 2: AWS Console (Manual)

#### Step 1: Create S3 Buckets

1. S3 → Create bucket → `react-app-blue-YOUR_ACCOUNT_ID`
   - Block Public Access: all checked
2. Repeat for `react-app-green-YOUR_ACCOUNT_ID`

#### Step 2: Create IAM Role

1. IAM → Policies → Create policy (JSON):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:GetBucket*", "s3:List*"],
    "Resource": [
      "arn:aws:s3:::react-app-blue-YOUR_ACCOUNT_ID",
      "arn:aws:s3:::react-app-blue-YOUR_ACCOUNT_ID/*",
      "arn:aws:s3:::react-app-green-YOUR_ACCOUNT_ID",
      "arn:aws:s3:::react-app-green-YOUR_ACCOUNT_ID/*"
    ]
  }]
}
```

2. Name: `ApiGatewayS3ReadPolicy`
3. IAM → Roles → Create role → Trusted entity: API Gateway → Attach the policy above
4. Role name: `ApiGatewayS3Role` → Copy the Role ARN

#### Step 3: Create API Gateway

1. API Gateway → Create API → REST API → Regional
2. Name: `SPA Blue/Green Deployment`

#### Step 4: Configure Proxy Resource and Integration

**Create Proxy Resource:**
1. Actions → Create Resource → Check "Configure as proxy resource" → `{proxy+}` → Create

**Create GET Method:**
1. Select `/{proxy+}` → Actions → Create Method → GET → ✓

**Configure Integration:**
1. Integration type: AWS Service
2. AWS Region: `us-east-1`
3. AWS Service: S3
4. HTTP method: GET
5. Action Type: Use path override
6. Path override: `${stageVariables.bucketName}/{proxy}`
7. Execution role: paste IAM Role ARN
8. Save

**Configure Integration Request (IMPORTANT — do not skip):**

> ⚠️ Without this step, API Gateway sends a literal `{proxy}` to S3 instead of the actual file path, resulting in "Internal server error."

1. Click Integration Request
2. Expand **URL Path Parameters** → **Add path**
3. Name: `proxy`
4. Mapped from: `method.request.path.proxy`
5. Click ✓

**Configure Method Response:**
1. Method Response → Expand 200 → Add Header: `Content-Type` → ✓

**Configure Integration Response:**
1. Integration Response → Expand 200 → Header Mappings
2. `Content-Type` → `integration.response.header.Content-Type` → ✓

**Enable Binary Media Types:**
1. API Settings → Binary Media Types → Add: `*/*` → Save

#### Step 5: Create Stages

Deploy API three times to create stages:

| Stage | `bucketName` variable |
|-------|----------------------|
| `blue` | `react-app-blue-YOUR_ACCOUNT_ID` |
| `green` | `react-app-green-YOUR_ACCOUNT_ID` |
| `prod` | `react-app-blue-YOUR_ACCOUNT_ID` (initially) |

For each: Actions → Deploy API → New Stage → Add stage variable `bucketName`.

### Option 3: AWS CLI

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

# Create S3 buckets
aws s3 mb s3://react-app-blue-${ACCOUNT_ID} --region ${REGION}
aws s3 mb s3://react-app-green-${ACCOUNT_ID} --region ${REGION}

# Block public access
for BUCKET in react-app-blue-${ACCOUNT_ID} react-app-green-${ACCOUNT_ID}; do
  aws s3api put-public-access-block --bucket ${BUCKET} \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
done

# Create IAM trust policy
cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "apigateway.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

# Create IAM role
aws iam create-role --role-name ApiGatewayS3Role \
  --assume-role-policy-document file:///tmp/trust-policy.json

# Create S3 access policy
cat > /tmp/s3-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:GetBucket*", "s3:List*"],
    "Resource": [
      "arn:aws:s3:::react-app-blue-${ACCOUNT_ID}",
      "arn:aws:s3:::react-app-blue-${ACCOUNT_ID}/*",
      "arn:aws:s3:::react-app-green-${ACCOUNT_ID}",
      "arn:aws:s3:::react-app-green-${ACCOUNT_ID}/*"
    ]
  }]
}
EOF

aws iam create-policy --policy-name ApiGatewayS3ReadPolicy \
  --policy-document file:///tmp/s3-policy.json
aws iam attach-role-policy --role-name ApiGatewayS3Role \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/ApiGatewayS3ReadPolicy

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/ApiGatewayS3Role"
sleep 10

# Create API Gateway
API_ID=$(aws apigateway create-rest-api --name "SPA Blue/Green Deployment" \
  --endpoint-configuration types=REGIONAL --query 'id' --output text)

ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID \
  --query 'items[?path==`/`].id' --output text)

PROXY_ID=$(aws apigateway create-resource --rest-api-id $API_ID \
  --parent-id $ROOT_ID --path-part '{proxy+}' --query 'id' --output text)

aws apigateway put-method --rest-api-id $API_ID --resource-id $PROXY_ID \
  --http-method GET --authorization-type NONE \
  --request-parameters method.request.path.proxy=true

aws apigateway put-integration --rest-api-id $API_ID --resource-id $PROXY_ID \
  --http-method GET --type AWS --integration-http-method GET \
  --uri "arn:aws:apigateway:${REGION}:s3:path/\${stageVariables.bucketName}/{proxy}" \
  --credentials "$ROLE_ARN" \
  --request-parameters '{"integration.request.path.proxy":"method.request.path.proxy"}'

aws apigateway put-method-response --rest-api-id $API_ID --resource-id $PROXY_ID \
  --http-method GET --status-code 200 \
  --response-parameters '{"method.response.header.Content-Type":false}'

aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $PROXY_ID \
  --http-method GET --status-code 200 \
  --response-parameters '{"method.response.header.Content-Type":"integration.response.header.Content-Type"}'

aws apigateway update-rest-api --rest-api-id $API_ID \
  --patch-operations op=add,path=/binaryMediaTypes/*~1*

# Create stages
DEPLOY_ID=$(aws apigateway create-deployment --rest-api-id $API_ID \
  --stage-name temp --query 'id' --output text)

aws apigateway create-stage --rest-api-id $API_ID --stage-name blue \
  --deployment-id $DEPLOY_ID --variables bucketName=react-app-blue-${ACCOUNT_ID}
aws apigateway create-stage --rest-api-id $API_ID --stage-name green \
  --deployment-id $DEPLOY_ID --variables bucketName=react-app-green-${ACCOUNT_ID}
aws apigateway create-stage --rest-api-id $API_ID --stage-name prod \
  --deployment-id $DEPLOY_ID --variables bucketName=react-app-blue-${ACCOUNT_ID}
aws apigateway delete-stage --rest-api-id $API_ID --stage-name temp

echo "API ID: $API_ID"
echo "Prod: https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/index.html#/"
echo "Blue: https://${API_ID}.execute-api.${REGION}.amazonaws.com/blue/index.html#/"
echo "Green: https://${API_ID}.execute-api.${REGION}.amazonaws.com/green/index.html#/"
```

---

## Build and Deploy Application

```bash
# Build both versions
npm run build:web1    # outputs to web1/
npm run build:web2    # outputs to web2/

# Deploy to S3
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3 sync web1/ s3://react-app-blue-${ACCOUNT_ID}/ --delete
aws s3 sync web2/ s3://react-app-green-${ACCOUNT_ID}/ --delete
```

## Switching Versions

```bash
API_ID="YOUR_API_ID"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Promote green to production
aws apigateway update-stage --rest-api-id $API_ID --stage-name prod \
  --patch-operations op=replace,path=/variables/bucketName,value=react-app-green-${ACCOUNT_ID}

# Rollback to blue
aws apigateway update-stage --rest-api-id $API_ID --stage-name prod \
  --patch-operations op=replace,path=/variables/bucketName,value=react-app-blue-${ACCOUNT_ID}
```

Both operations take effect in ~1 second. No redeployment needed.

## Key Design Decisions

- **Relative asset paths** (`base: './'` in Vite) — prevents cross-bucket asset loading
- **Hash-based routing** (`HashRouter`) — no server-side routing config needed
- **Same filename** (`index.html`) in both buckets — enables true blue/green switching
- **Private S3 buckets** — accessed only via API Gateway IAM role
- **Separate buckets** (not folders) — complete isolation between versions

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Missing Authentication Token" | No file path in URL | Use `/prod/index.html#/` not `/prod/` |
| "Internal server error" | Missing URL path parameter mapping | Add `proxy` → `method.request.path.proxy` in Integration Request |
| Assets from wrong bucket | Absolute paths in build | Set `base: './'` in vite config, rebuild |
| 403 Forbidden | IAM role missing S3 permissions | Attach `ApiGatewayS3ReadPolicy` to role |
| JS/CSS not loading | Binary media types not set | Add `*/*` in API Settings |

## License

MIT
