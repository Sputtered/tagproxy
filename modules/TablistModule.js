const { buildTimerText } = require('../utils/colorUtils');

class TablistModule {
  constructor(client) {
    this.client = client;
    this.playerList = {}; // uuid to username
    this.itPlayers = new Set(); // usernames currently IT
  }

  addPlayer(uuid, name) {
    this.playerList[uuid] = name;
  }

  removePlayer(uuid) {
    delete this.playerList[uuid];
  }

  addITPlayer(username) {
    this.itPlayers.add(username);
  }

  removeITPlayer(username) {
    this.itPlayers.delete(username);
  }

  getPlayerList() {
    return this.playerList;
  }

  getITPlayers() {
    return this.itPlayers;
  }

  getNonITPlayers() {
    return Object.values(this.playerList).filter(name => !this.itPlayers.has(name));
  }

  update(t) {
    const timerText = buildTimerText(t);
    for (const [uuid, name] of Object.entries(this.playerList)) {
      try {
        const isIT = this.itPlayers.has(name);
        const displayName = isIT ? `§c${name}` : `§f${name}`;
        this.client.write('player_info', {
          action: 'update_display_name',
          data: [{
            uuid,
            displayName: JSON.stringify({ text: displayName + timerText }),
          }],
        });
      } catch (e) {}
    }
  }

  resetIT() {
    this.itPlayers = new Set();
  }

  reset() {
    this.playerList = {};
    this.itPlayers = new Set();
  }
}

module.exports = TablistModule;
