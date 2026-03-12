#!/bin/bash
set -e

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BLUE_BUCKET="react-app-blue-${ACCOUNT_ID}"

echo "Building Web1 (Blue version)..."
npm run build:web1

echo "Deploying to Blue bucket: s3://${BLUE_BUCKET}/"
aws s3 sync web1/ s3://${BLUE_BUCKET}/ --delete

echo "Done. Test at your blue stage URL."
