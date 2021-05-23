import * as uuid from 'uuid'

import { Group } from '../models/Group'
import { GroupAccess } from '../dataLayer/groupsAccess'
import { CreateGroupRequest } from '../requests/CreateGroupRequest'
import { CreateImageRequest } from '../requests/CreateImageRequest'

const groupAccess = new GroupAccess()

import { createLogger } from '../utils/logger'
const logger = createLogger('groups')

export async function getAllGroups(): Promise<Group[]> {
  return groupAccess.getAllGroups()
}

export async function createGroup(
  createGroupRequest: CreateGroupRequest,
  userId : string
): Promise<Group> {

  const itemId = uuid.v4()
  
  return await groupAccess.createGroup({
    id: itemId,
    userId: userId,
    name: createGroupRequest.name,
    description: createGroupRequest.description,
    timestamp: new Date().toISOString()
  })
}

export async function createImage(
  createImageRequest : CreateImageRequest,
  groupId : string,
  userId : string
) {
  logger.info('createImage', {createImageRequest, groupId, userId});
  const validGroupId = await groupAccess.groupExists(groupId)

  if (!validGroupId) {
    logger.error('invalid group', {groupId})
    throw new Error('Group does not exist');
  }

  const imageId = uuid.v4()
  const newItem = await groupAccess.createImage(groupId, imageId, createImageRequest)
  logger.info('image created', {newItem});

  const url = groupAccess.getUploadUrl(imageId)
  logger.info('upload url', {url});
  return {
    newItem,
    uploadUrl: url
  }
}

