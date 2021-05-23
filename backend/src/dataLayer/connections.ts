import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

const XAWS = AWSXRay.captureAWS(AWS)


import { createLogger } from '../utils/logger'
const logger = createLogger('connections')


export class Connections {

  constructor(
    private readonly docClient: DocumentClient = createDynamoDBClient(),
    private readonly connectionsTable = process.env.CONNECTIONS_TABLE,
    private readonly apiGateway = createAPIGateway() ) {
  }

  async getAllConnections() {
    logger.info('Getting all connections')
    const connections = await this.docClient.scan({
        TableName: this.connectionsTable
    }).promise()
    return connections
  }

  async storeConnection(connectionId) {
    const timestamp = new Date().toISOString()

    const item = {
      id: connectionId,
      timestamp
    }
  
    logger.info('Storing item: ', item)
    await this.docClient.put({
        TableName: this.connectionsTable,
        Item: item
      }).promise()    
  }

  async sendMessageToClient(connectionId, payload) {
    try {
      logger.info('Sending message to a connection', {connectionId})
  
      await this.apiGateway.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(payload),
      }).promise()
  
    } catch (e) {
      logger.info('Failed to send message', {e})
      if (e.statusCode === 410) {
        logger.info('Stale connection', {})
        this.deleteConnection(connectionId)
      }
    }
  }
  async deleteConnection(connectionId) {
    logger.info('Removing item with key: ', {connectionId})
    await this.docClient.delete({
        TableName: this.connectionsTable,
        Key: {
            id: connectionId
        }
        }).promise()
  }

}

function createDynamoDBClient() {
    if (process.env.IS_OFFLINE) {
      logger.info('Creating a local DynamoDB instance')
      return new XAWS.DynamoDB.DocumentClient({
        region: 'localhost',
        endpoint: 'http://localhost:8000'
      })
    }
  
    return new XAWS.DynamoDB.DocumentClient()
 }
  
 function createAPIGateway() {
    const stage = process.env.STAGE
    const apiId = process.env.API_ID
    
    const connectionParams = {
      apiVersion: "2018-11-29",
      endpoint: `${apiId}.execute-api.us-east-1.amazonaws.com/${stage}`
    }
    
    return new AWS.ApiGatewayManagementApi(connectionParams)
}
