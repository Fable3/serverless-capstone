import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'

import { getImage } from '../../businessLogic/groups'

import * as middy from 'middy'
import { cors } from 'middy/middlewares'

import { createLogger } from '../../utils/logger'
const logger = createLogger('getGroups')

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Caller event', event)
  const imageId = event.pathParameters.imageId
  logger.info('getImage', {event})

  try {
    const result = getImage(imageId)
    logger.info('result', {result})
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    }
  } catch (error)
  {
    logger.error('not found', {error})
    return {
      statusCode: 404,
      body: ''
    }
  }
})

handler.use(
  cors()
)
