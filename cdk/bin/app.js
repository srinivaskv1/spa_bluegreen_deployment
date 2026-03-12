#!/usr/bin/env node
const cdk = require('aws-cdk-lib');
const { ReactApiGatewayStack } = require('../lib/stack');

const app = new cdk.App();

// Get deployment target from context (default to 'all')
const deployTarget = app.node.tryGetContext('deploy') || 'all';

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

if (deployTarget === 'all' || deployTarget === 'infrastructure') {
  new ReactApiGatewayStack(app, 'ReactApiGatewayStack', { env });
}

app.synth();
