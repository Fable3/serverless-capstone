import * as AWS  from 'aws-sdk'

import { createLogger } from '../utils/logger'
const logger = createLogger('classification')

var lambda = new AWS.Lambda();

export async function getClassLabel(key:string) {
    var params = {
      FunctionName: "classifiertest", 
      Payload: JSON.stringify({key})
    };
    
    logger.info("getClassLabel", {key});
    const response = await lambda.invoke(params).promise();
    logger.info("returned", {response});
    const payload = response.Payload as string
    const class_label = JSON.parse(payload).label
    return class_label;
}
  
