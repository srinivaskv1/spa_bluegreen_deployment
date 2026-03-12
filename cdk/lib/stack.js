const cdk = require('aws-cdk-lib');
const s3 = require('aws-cdk-lib/aws-s3');
const apigateway = require('aws-cdk-lib/aws-apigateway');
const iam = require('aws-cdk-lib/aws-iam');

class ReactApiGatewayStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Blue S3 Bucket (private)
    const blueBucket = new s3.Bucket(this, 'BlueBucket', {
      bucketName: `react-app-blue-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false
    });

    // Green S3 Bucket (private)
    const greenBucket = new s3.Bucket(this, 'GreenBucket', {
      bucketName: `react-app-green-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false
    });

    // API Gateway without default deployment
    const api = new apigateway.RestApi(this, 'ReactApi', {
      restApiName: 'React Service Blue/Green',
      description: 'API Gateway with Blue and Green stages pointing to separate S3 buckets',
      binaryMediaTypes: ['*/*'],
      deploy: false // We'll create custom stages
    });

    // IAM role for API Gateway to access S3
    const apiGatewayRole = new iam.Role(this, 'ApiGatewayS3Role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
    });

    // Grant read access to both buckets
    blueBucket.grantRead(apiGatewayRole);
    greenBucket.grantRead(apiGatewayRole);

    // Integration for root path (/) - serves index.html
    const rootS3Integration = new apigateway.AwsIntegration({
      service: 's3',
      integrationHttpMethod: 'GET',
      path: `\${stageVariables.bucketName}/index.html`,
      options: {
        credentialsRole: apiGatewayRole,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type':
                'integration.response.header.Content-Type'
            }
          }
        ]
      }
    });

    // Add root method to serve index.html
    api.root.addMethod('GET', rootS3Integration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true
          }
        }
      ]
    });

    // Integration using stage variable to determine which S3 bucket
    const s3Integration = new apigateway.AwsIntegration({
      service: 's3',
      integrationHttpMethod: 'GET',
      path: `\${stageVariables.bucketName}/{proxy}`,
      options: {
        credentialsRole: apiGatewayRole,
        requestParameters: {
          'integration.request.path.proxy': 'method.request.path.proxy'
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type':
                'integration.response.header.Content-Type'
            }
          }
        ]
      }
    });

    // Add proxy resource at root level
    const proxyResource = api.root.addResource('{proxy+}');
    proxyResource.addMethod('GET', s3Integration, {
      requestParameters: {
        'method.request.path.proxy': true
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true
          }
        }
      ]
    });

    // Create deployment
    const deployment = new apigateway.Deployment(this, 'Deployment', {
      api: api,
      description: 'Deployment with root path support and clean URLs - v2'
    });

    // Production Stage - default stage for end users (points to blue by default)
    const prodStage = new apigateway.Stage(this, 'ProdStage', {
      deployment: deployment,
      stageName: 'prod',
      description: 'Production stage - default for end users (currently points to blue)',
      variables: {
        bucketName: blueBucket.bucketName // Default: prod → blue bucket
      }
    });

    // Blue Stage - testing/staging environment
    const blueStage = new apigateway.Stage(this, 'BlueStage', {
      deployment: deployment,
      stageName: 'blue',
      description: 'Blue stage - testing environment',
      variables: {
        bucketName: blueBucket.bucketName // Stage variable: blue → blue bucket
      }
    });

    // Green Stage - testing/staging environment
    const greenStage = new apigateway.Stage(this, 'GreenStage', {
      deployment: deployment,
      stageName: 'green',
      description: 'Green stage - testing environment',
      variables: {
        bucketName: greenBucket.bucketName // Stage variable: green → green bucket
      }
    });

    // Outputs
    new cdk.CfnOutput(this, 'BlueBucketName', {
      value: blueBucket.bucketName,
      description: 'Blue S3 Bucket for blue stage deployments',
      exportName: 'ReactAppBlueBucket'
    });

    new cdk.CfnOutput(this, 'GreenBucketName', {
      value: greenBucket.bucketName,
      description: 'Green S3 Bucket for green stage deployments',
      exportName: 'ReactAppGreenBucket'
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: api.restApiId,
      description: 'API Gateway ID'
    });

    new cdk.CfnOutput(this, 'ProdStageUrl', {
      value: `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/prod/`,
      description: 'Production Stage URL (default for end users) - use /#/ for routes'
    });

    new cdk.CfnOutput(this, 'ProdAppUrl', {
      value: `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/prod/#/`,
      description: 'Production Application URL - stages control which version users see'
    });

    new cdk.CfnOutput(this, 'BlueStageUrl', {
      value: `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/blue/#/`,
      description: 'Blue Stage URL - test version 1 (purple theme)'
    });

    new cdk.CfnOutput(this, 'GreenStageUrl', {
      value: `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/green/#/`,
      description: 'Green Stage URL - test version 2 (pink theme)'
    });

    new cdk.CfnOutput(this, 'DeployBlueCommand', {
      value: `aws s3 sync dist/ s3://${blueBucket.bucketName}/ --delete`,
      description: 'Command to deploy to Blue'
    });

    new cdk.CfnOutput(this, 'DeployGreenCommand', {
      value: `aws s3 sync dist/ s3://${greenBucket.bucketName}/ --delete`,
      description: 'Command to deploy to Green'
    });

    new cdk.CfnOutput(this, 'PromoteBlueCommand', {
      value: `aws apigateway update-stage --rest-api-id ${api.restApiId} --stage-name prod --patch-operations op=replace,path=/variables/bucketName,value=${blueBucket.bucketName}`,
      description: 'Command to promote Blue to Production'
    });

    new cdk.CfnOutput(this, 'PromoteGreenCommand', {
      value: `aws apigateway update-stage --rest-api-id ${api.restApiId} --stage-name prod --patch-operations op=replace,path=/variables/bucketName,value=${greenBucket.bucketName}`,
      description: 'Command to promote Green to Production'
    });
  }
}

module.exports = { ReactApiGatewayStack };
