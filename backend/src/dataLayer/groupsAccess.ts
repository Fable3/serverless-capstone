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
    private readonly imageIdIndex = process.env.IMAGE_ID_INDEX,
    private readonly bucketName = process.env.IMAGES_S3_BUCKET,
    private readonly urlExpiration = Number(process.env.SIGNED_URL_EXPIRATION),
    private readonly groupsTable = process.env.GROUPS_TABLE) {
  }

  async getAllGroups(): Promise<Group[]> {
    logger.info('Getting all groups')

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

  async getImage(imageId : string) {
      const result = await this.docClient.query({
        TableName : this.imagesTable,
        IndexName : this.imageIdIndex,
        KeyConditionExpression: 'imageId = :imageId',
        ExpressionAttributeValues: {
            ':imageId': imageId
        }
    }).promise()

    if (result.Count == 0) {
      throw new Error('image not found')
    }
    return result.Items[0]    
  }

  async getImagesInGroup(groupId : string) {
    const validGroupId = await this.groupExists(groupId)
    if (!validGroupId) {
      throw new Error('Group does not exist')
    }
    const result = await this.docClient.query({
      TableName: this.imagesTable,
      KeyConditionExpression: 'groupId = :groupId',
      ExpressionAttributeValues: {
        ':groupId': groupId
      },
      ScanIndexForward: false
    }).promise()
  
    return result.Items
  }

  async setImageClassLabel(imageId : string, classLabel : string) {
    logger.info('setImageClassLabel', {imageId, classLabel})
    const image_record = await this.getImage(imageId)
    const result = await this.docClient.update({
      TableName: this.imagesTable,
      Key: {
          groupId : image_record.groupId,
          timestamp : image_record.timestamp
      },
      UpdateExpression: "set classLabel = :classLabel",
      ExpressionAttributeValues: {
          ":classLabel": classLabel
      }
    }).promise()
    logger.info("update result", result);
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

function createS3Client() {
  return new XAWS.S3({
    signatureVersion: 'v4'
  })
}

