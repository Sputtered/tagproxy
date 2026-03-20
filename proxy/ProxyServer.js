const mc = require('minecraft-protocol');
const config = require('../config.json');
const UpstreamClient = require('./UpstreamClient');

class ProxyServer {
  constructor() {
    this.server = mc.createServer({
      'online-mode': true,
      host: '0.0.0.0',
      port: config.proxy.port,
      version: config.hypixel.version,
      motd: config.proxy.motd,
      maxPlayers: config.proxy.maxPlayers,
    });
  }

  start() {
    this.server.on('login', (client) => {
      const upstream = new UpstreamClient(client);
      upstream.connect();
    });

    console.log(`[proxy] Listening on port ${config.proxy.port}`);
  }
}

module.exports = ProxyServer;
