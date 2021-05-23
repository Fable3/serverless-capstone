import { Connections } from '../dataLayer/connections'
const connectionAccess = new Connections()

export async function notifyAllClients(key) {
    
    const payload = {
        imageId: key
    }
    const connections = await connectionAccess.getAllConnections()

    for (const connection of connections.Items) {
        const connectionId = connection.id
        await connectionAccess.sendMessageToClient(connectionId, payload)
    }
}

export async function storeConnection(connectionId) {
    return connectionAccess.storeConnection(connectionId) // return promise without await
}

export async function deleteConnection(connectionId) {
    return connectionAccess.deleteConnection(connectionId) // return promise without await
}
