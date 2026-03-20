const net = require('net');
const { loadConfig } = require('./config-loader');

let pingMs = 50;

function measurePing() {
  const cfg = loadConfig();
  const start = Date.now();
  const socket = new net.Socket();
  socket.setTimeout(3000);
  socket.connect(cfg.hypixel.port, cfg.hypixel.host, () => {
    pingMs = (Date.now() - start) + cfg.timer.pingOffset;
    socket.destroy();
  });
  socket.on('error', () => socket.destroy());
  socket.on('timeout', () => socket.destroy());
}

function getPing() {
  return pingMs;
}

function startPingLoop() {
  measurePing();
  setInterval(measurePing, 10000);
}

module.exports = { startPingLoop, getPing };
