import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

const XAWS = AWSXRay.captureAWS(AWS)

import { Group } from '../models/Group'
import { CreateImageRequest } from '../requests/CreateImageRequest'

import { createLogger } from '../utils/logger'
const logger = createLogger('groupsAccess')


export class GroupAccess {

  constructor(
    private readonly docClient: DocumentClient = createDynamoDBClient(),
    private s3 = createS3Client(),
    private readonly imagesTable = process.env.IMAGES_TABLE,
    private readonly bucketName = process.env.IMAGES_S3_BUCKET,
    private readonly urlExpiration = Number(process.env.SIGNED_URL_EXPIRATION),
    private readonly groupsTable = process.env.GROUPS_TABLE) {
  }

  async getAllGroups(): Promise<Group[]> {
    console.log('Getting all groups')

    const result = await this.docClient.scan({
      TableName: this.groupsTable
    }).promise()

    const items = result.Items
    return items as Group[]
  }

  async createGroup(group: Group): Promise<Group> {
    await this.docClient.put({
      TableName: this.groupsTable,
      Item: group
    }).promise()

    return group
  }

  getUploadUrl(imageId: string) {
    return this.s3.getSignedUrl('putObject', {
      Bucket: this.bucketName,
      Key: imageId,
      Expires: this.urlExpiration
    })
  }

  async groupExists(groupId: string) {
    const result = await this.docClient
      .get({
        TableName: this.groupsTable,
        Key: {
          id: groupId
        }
      })
      .promise()
    logger.info('Get group: ', {result})
    return !!result.Item
  }

  async createImage(groupId: string, imageId: string, newImage : CreateImageRequest) {
    const timestamp = new Date().toISOString()
    
    const newItem = {
      groupId,
      timestamp,
      imageId,
      ...newImage,
      imageUrl: `https://${this.bucketName}.s3.amazonaws.com/${imageId}`
    }
    logger.info('Storing new item: ', {newItem})
  
    await this.docClient
      .put({
        TableName: this.imagesTable,
        Item: newItem
      })
      .promise()
  
    return newItem
  }

}

function createDynamoDBClient() {
  if (process.env.IS_OFFLINE) {
    console.log('Creating a local DynamoDB instance')
    return new XAWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    })
  }

  return new XAWS.DynamoDB.DocumentClient()
}

function createS3Client() {
  return new XAWS.S3({
    signatureVersion: 'v4'
  })
}