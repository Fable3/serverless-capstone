import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'

import { CreateGroupRequest } from '../../requests/CreateGroupRequest'
import { createGroup } from '../../businessLogic/groups'
import { getUserId } from '../utils'

import * as middy from 'middy'
import { cors } from 'middy/middlewares'

import { createLogger } from '../../utils/logger'
const logger = createLogger('createGroup')

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Processing event: ', {event})

  const newGroup: CreateGroupRequest = JSON.parse(event.body)
  const userId : string = getUserId(event)
  
  const newItem = await createGroup(newGroup, userId)

  logger.info('item created: ', {newItem})
  return {
    statusCode: 201,
    body: JSON.stringify({
      newItem
    })
  }
})

handler.use(
  cors({
    credentials: true
  })
)

