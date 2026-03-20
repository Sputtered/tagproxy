const net = require('net');
const config = require('../config.json');

let pingMs = 50;

function measurePing() {
  const start = Date.now();
  const socket = new net.Socket();
  socket.setTimeout(3000);
  socket.connect(config.hypixel.port, config.hypixel.host, () => {
    pingMs = (Date.now() - start) + config.timer.pingOffset;
    socket.destroy();
  });
  socket.on('error', () => socket.destroy());
  socket.on('timeout', () => socket.destroy());
}

function getPing() { return pingMs; }

function startPingLoop() {
  measurePing();
  setInterval(measurePing, 10000);
}

module.exports = { startPingLoop, getPing };
