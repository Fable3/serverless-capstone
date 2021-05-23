import 'source-map-support/register'
import { getAllGroups } from '../../businessLogic/groups'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { createLogger } from '../../utils/logger'
const logger = createLogger('getGroups')

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('getGroups',{event}) 
  const groups = await getAllGroups()

  logger.info('result', groups);

  return  {
    statusCode: 200,
    body: JSON.stringify({items: groups })
  }
})

handler.use(
  cors()
)
