#!/bin/bash
set -e

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
GREEN_BUCKET="react-app-green-${ACCOUNT_ID}"

echo "Building Web2 (Green version)..."
npm run build:web2

echo "Deploying to Green bucket: s3://${GREEN_BUCKET}/"
aws s3 sync web2/ s3://${GREEN_BUCKET}/ --delete

echo "Done. Test at your green stage URL."
