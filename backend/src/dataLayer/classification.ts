import * as AWS  from 'aws-sdk'

import { createLogger } from '../utils/logger'
const logger = createLogger('classification')

var lambda = new AWS.Lambda();

export async function getClassLabel(key:string) {
    //const stage = process.env.STAGE
    var params = {
      //FunctionName: `serverless-udagram-app-${stage}-classifier`, 
      FunctionName: `classifiertest`, 
      Payload: JSON.stringify({key})
    };
    
    logger.info("getClassLabel", params);
    const response = await lambda.invoke(params).promise();
    logger.info("returned", {response});
    const payload = response.Payload as string
    const class_label = JSON.parse(payload).label
    return class_label;
}
  
