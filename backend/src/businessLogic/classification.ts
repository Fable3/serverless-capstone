import { getClassLabel } from '../dataLayer/classification'
import { createLogger } from '../utils/logger'
import { setImageClassLabel } from './groups'
const logger = createLogger('classification')

export async function updateClassLabel(key: string) {
    for(var retry=2;retry>0;--retry)
    {
      try {
        const class_label = await getClassLabel(key)
        logger.info("class label", {key, retry, class_label})
        if (class_label==='')
        {
          throw new Error('empty class label')
        }
        logger.info("result", {class_label})
        await setImageClassLabel(key, class_label);
        break;
      } catch (error)
      {
        logger.error("error", {key, retry, error})
        if (retry==1) // last
        {
          await setImageClassLabel(key, 'error');
        }
      }
    }
}
