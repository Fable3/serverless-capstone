import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'

import { getImagesInGroup } from '../../businessLogic/groups'

import * as middy from 'middy'
import { cors } from 'middy/middlewares'
import { createLogger } from '../../utils/logger'
const logger = createLogger('getImages')

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  logger.info('Caller event', {event})
  const groupId = event.pathParameters.groupId

  try {
    const images = await getImagesInGroup(groupId)
    logger.info('result', {images})
    return {
      statusCode: 200,
      body: JSON.stringify({
        items: images
      })
    }
  } catch (error)
  {
    logger.error('error', {error})
    return {
      statusCode: 404,
      body: JSON.stringify({
        error
      })
    }
  }
})

handler.use(cors())
