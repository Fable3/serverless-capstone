import 'source-map-support/register'
import { getAllGroups } from '../../businessLogic/groups';

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'

//import { createLogger } from '../../utils/logger'
//const logger = createLogger('getTODOs')

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  //logger.info('getGroups',{event})
  console.log('getGroups',event)
  const groups = await getAllGroups()

  //logger.info('result', groups);

  return  {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({items: groups })
  }
}
