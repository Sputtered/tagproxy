const { startPingLoop } = require('./utils/ping');
const ProxyServer = require('./proxy/ProxyServer');

startPingLoop();

const proxy = new ProxyServer();
proxy.start();
