const mc = require('minecraft-protocol');
const { loadConfig } = require('../utils/config-loader');
const UpstreamClient = require('./UpstreamClient');

class ProxyServer {
  constructor() {
    const cfg = loadConfig();
    this.server = mc.createServer({
      'online-mode': true,
      host: '0.0.0.0',
      port: cfg.proxy.port,
      version: cfg.hypixel.version,
      motd: cfg.proxy.motd,
      maxPlayers: cfg.proxy.maxPlayers,
    });
  }

  start() {
    this.server.on('login', (client) => {
      console.log(`[proxy] ${client.username} connected`);
      new UpstreamClient(client).connect();
    });

    console.log(`[proxy] Listening on port ${loadConfig().proxy.port}`);
  }
}

module.exports = ProxyServer;
