import { SNSHandler, SNSEvent, S3Event } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
const XAWS = AWSXRay.captureAWS(AWS)

const docClient = new XAWS.DynamoDB.DocumentClient()

const connectionsTable = process.env.CONNECTIONS_TABLE
const stage = process.env.STAGE
const apiId = process.env.API_ID

const connectionParams = {
  apiVersion: "2018-11-29",
  endpoint: `${apiId}.execute-api.us-east-1.amazonaws.com/${stage}`
}

const apiGateway = new AWS.ApiGatewayManagementApi(connectionParams)
var lambda = new AWS.Lambda();

import { createLogger } from '../../utils/logger'
const logger = createLogger('sendNotifications')


export const handler: SNSHandler = async (event: SNSEvent) => {
  logger.info('Processing SNS event ', { event })
  for (const snsRecord of event.Records) {
    const s3EventStr = snsRecord.Sns.Message
    logger.info('Processing S3 event', { s3EventStr })
    const s3Event = JSON.parse(s3EventStr)

    await processS3Event(s3Event)
  }
}

async function getClassLabel(key:string) {
  var params = {
    FunctionName: "classifiertest", 
    Payload: JSON.stringify({key})
  };
  
  logger.info("getClassLabel", {key});
  const response = await lambda.invoke(params).promise();
  logger.info("returned", {response});
  const payload = response.Payload as string
  const class_label = JSON.parse(payload).label
  return class_label;
}

async function processS3Event(s3Event: S3Event) {
  for (const record of s3Event.Records) {
    const key = record.s3.object.key
    logger.info('Processing S3 item with key: ', {key})

    try {
      const class_label = await getClassLabel(key)
      logger.info("class label", {class_label})
    } catch (error)
    {
      logger.error("error", {error})
    }

    const connections = await docClient.scan({
        TableName: connectionsTable
    }).promise()

    const payload = {
        imageId: key
    }

    for (const connection of connections.Items) {
        const connectionId = connection.id
        await sendMessageToClient(connectionId, payload)
    }
  }
}

async function sendMessageToClient(connectionId, payload) {
  try {
    logger.info('Sending message to a connection', {connectionId})

    await apiGateway.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(payload),
    }).promise()

  } catch (e) {
    logger.info('Failed to send message', {e})
    if (e.statusCode === 410) {
      logger.info('Stale connection', {})

      await docClient.delete({
        TableName: connectionsTable,
        Key: {
          id: connectionId
        }
      }).promise()
    }
  }
}