import MainSocketClient from './clients/MainSocketClient';

/**
 * Socket Client Factory
 * Manages the creation and tracking of different socket clients
 */
class SocketClientFactory {
  constructor() {
    this.clients = {};
    this.defaultClientId = 'main';
  }

  /**
   * Create or get a socket client
   * @param {string} type - Client type (currently only 'main' is supported)
   * @param {string} clientId - Unique client ID (defaults to type)
   * @param {string} serverUrl - Server URL
   * @param {Object} options - Socket options
   * @returns {Object} Socket client instance
   */
  getClient(type, clientId = null, serverUrl = null, options = {}) {
    // Use type as clientId if not provided
    const id = clientId || type || this.defaultClientId;
    
    // If client already exists, return it
    if (this.clients[id]) {
      return this.clients[id];
    }
    
    // Create a new client based on type
    let client;
    
    switch (type) {
      case 'main':
        client = new MainSocketClient(serverUrl, options);
        break;
      default:
        // Default to main client if type not recognized
        client = new MainSocketClient(serverUrl, options);
    }
    
    // Store client reference
    this.clients[id] = client;
    
    return client;
  }

  /**
   * Remove a client
   * @param {string} clientId - Client ID
   */
  removeClient(clientId) {
    if (this.clients[clientId]) {
      // Disconnect client before removing
      this.clients[clientId].disconnect();
      delete this.clients[clientId];
    }
  }

  /**
   * Disconnect all clients
   */
  disconnectAll() {
    Object.values(this.clients).forEach(client => {
      client.disconnect();
    });
  }

  /**
   * Get all active clients
   * @returns {Object} Map of client IDs to client instances
   */
  getAllClients() {
    return this.clients;
  }
}

// Create a singleton instance
const socketClientFactory = new SocketClientFactory();

export default socketClientFactory; 