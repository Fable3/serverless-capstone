import { SNSHandler, SNSEvent, S3Event } from 'aws-lambda'
import 'source-map-support/register'

import { updateClassLabel } from '../../businessLogic/classification'
import { notifyAllClients } from '../../businessLogic/notifications'


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


async function processS3Event(s3Event: S3Event) {
  for (const record of s3Event.Records) {
    const key = record.s3.object.key
    logger.info('Processing S3 item with key: ', {key})

    updateClassLabel(key);
    notifyAllClients(key);    
  }
}
