import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
//import * as AWS  from 'aws-sdk'
//import * as uuid from 'uuid'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'
//import * as AWSXRay from 'aws-xray-sdk'
import { CreateImageRequest } from '../../requests/CreateImageRequest'
import { createImage } from '../../businessLogic/groups'
import { getUserId } from '../utils'

import { createLogger } from '../../utils/logger'

const logger = createLogger('createGroup')

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Caller event', {event})
  const groupId = event.pathParameters.groupId
  const newGroup: CreateImageRequest = JSON.parse(event.body)
  const userId : string = getUserId(event)
  
  try {
    const item_with_url = await createImage(newGroup, groupId, userId);

    return {
      statusCode: 201,
      body: JSON.stringify(item_with_url)
    }
  } catch (error)
  {
    return {
      statusCode: 404,
      body: JSON.stringify({
        error
      })
    }
  }
})

handler.use(
  cors({
    credentials: true
  })
)

