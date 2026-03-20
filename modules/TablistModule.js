const { buildTimerText } = require('../utils/colorUtils');

class TablistModule {
  constructor(client) {
    this.client = client;
    this.playerList = {};
    this.itPlayers = new Set();
  }

  addPlayer(uuid, name) {
    this.playerList[this._norm(uuid)] = name;
  }

  removePlayer(uuid) {
    delete this.playerList[this._norm(uuid)];
  }

  addITPlayer(username) {
    this.itPlayers.add(username);
  }

  removeITPlayer(username) {
    this.itPlayers.delete(username);
  }

  onDisplayName(uuid, displayName) {
    const name = this.playerList[this._norm(uuid)];
    if (!name) return;
    try {
      const text = typeof displayName === 'string'
        ? JSON.parse(displayName).text ?? ''
        : displayName?.text ?? '';
      if (text.startsWith('§c')) this.itPlayers.add(name);
      else if (this.itPlayers.has(name)) this.itPlayers.delete(name);
    } catch (e) {}
  }

  getPlayerList() { return this.playerList; }
  getITPlayers() { return this.itPlayers; }

  getNonITPlayers() {
    return Object.values(this.playerList).filter(n => !this.itPlayers.has(n));
  }

  update(t) {
    const timerText = buildTimerText(t);
    for (const [uuid, name] of Object.entries(this.playerList)) {
      try {
        const displayName = this.itPlayers.has(name) ? `§c${name}` : `§f${name}`;
        this.client.write('player_info', {
          action: 'update_display_name',
          data: [{ uuid, displayName: JSON.stringify({ text: displayName + timerText }) }],
        });
      } catch (e) {}
    }
  }

  resetIT() { this.itPlayers = new Set(); }

  reset() {
    this.playerList = {};
    this.itPlayers = new Set();
  }

  _norm(uuid) {
    if (!uuid) return '';
    return String(uuid).toLowerCase().replace(/-/g, '');
  }
}

module.exports = TablistModule;
