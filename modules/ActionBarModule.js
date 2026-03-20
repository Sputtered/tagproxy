const { timerColor } = require('../utils/colorUtils');
const { loadConfig } = require('../utils/config-loader');

class ActionBarModule {
  constructor(client) {
    this.client = client;
  }

  update(t, selfIsIT, itPlayers) {
    const cfg = loadConfig();
    if (!cfg.features.actionBar) return;

    let text;

    if (selfIsIT) {
      text = `§c§lIT§r  §8|  ${timerColor(t)}§l${t.toFixed(1)}§r§8s`;
    } else {
      const itName = itPlayers && itPlayers.size > 0 ? Array.from(itPlayers)[0] : null;
      text = itName
        ? `§7IT: §c${itName}  §8|  ${timerColor(t)}§l${t.toFixed(1)}§r§8s`
        : `${timerColor(t)}§l${t.toFixed(1)}§r§8s`;
    }

    try {
      this.client.write('chat', { message: JSON.stringify({ text }), position: 2 });
    } catch (e) {}
  }

  showIdle() {
    const cfg = loadConfig();
    if (!cfg.features.actionBar) return;
    try {
      this.client.write('chat', {
        message: JSON.stringify({ text: '§8Waiting for game...' }),
        position: 2,
      });
    } catch (e) {}
  }

  static shouldBlock(parsedPacket) {
    try { return parsedPacket.position === 2; } catch { return false; }
  }
}

module.exports = ActionBarModule;
