const { timerColor } = require('../utils/colorUtils');
const config = require('../config.json');

class ActionBarModule {
  constructor(client) {
    this.client = client;
  }

  update(t) {
    if (!config.timer.actionBar) return;
    const color = timerColor(t);
    try {
      this.client.write('chat', {
        message: JSON.stringify({ text: `${color}${t.toFixed(1)}§8s` }),
        position: 2,
      });
    } catch (e) {}
  }

  static shouldBlock(parsedPacket) {
    try { return parsedPacket.position === 2; } catch { return false; }
  }
}

module.exports = ActionBarModule;
