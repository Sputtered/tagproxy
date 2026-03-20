const { buildTimerText } = require('../utils/colorUtils');

class NametagModule {
  constructor(client) {
    this.client = client;
    this.itTeamData = null;
    this.proxyTeamCreated = false;
  }

  onITTeamData(teamData) {
    this.itTeamData = teamData;
  }

  updateITNametag(t) {
    if (!this.itTeamData) return;
    try {
      this.client.write('scoreboard_team', { ...this.itTeamData, suffix: buildTimerText(t) });
    } catch (e) {}
  }

  clearITNametag() {
    if (!this.itTeamData) return;
    try {
      this.client.write('scoreboard_team', { ...this.itTeamData, suffix: '' });
    } catch (e) {}
  }

  createProxyTeam(players, timerText) {
    if (!players.length) return;
    try {
      this.client.write('scoreboard_team', {
        team: 'proxy_timer', mode: 0, name: 'proxy_timer',
        prefix: '', suffix: timerText, friendlyFire: 3,
        nameTagVisibility: 'always', color: 15, players,
      });
      this.proxyTeamCreated = true;
    } catch (e) {}
  }

  destroyProxyTeam() {
    if (!this.proxyTeamCreated) return;
    try {
      this.client.write('scoreboard_team', { team: 'proxy_timer', mode: 1 });
    } catch (e) {}
    this.proxyTeamCreated = false;
  }

  updateProxyTeamSuffix(timerText) {
    if (!this.proxyTeamCreated) return;
    try {
      this.client.write('scoreboard_team', {
        team: 'proxy_timer', mode: 2, name: 'proxy_timer',
        prefix: '', suffix: timerText, friendlyFire: 3,
        nameTagVisibility: 'always', color: 15,
      });
    } catch (e) {}
  }

  ensureProxyTeam(nonItPlayers, timerText) {
    if (!this.proxyTeamCreated) this.createProxyTeam(nonItPlayers, timerText);
    else this.updateProxyTeamSuffix(timerText);
  }

  addToProxyTeam(username) {
    if (!this.proxyTeamCreated) return;
    try {
      this.client.write('scoreboard_team', { team: 'proxy_timer', mode: 3, players: [username] });
    } catch (e) {}
  }

  removeFromProxyTeam(username) {
    if (!this.proxyTeamCreated) return;
    try {
      this.client.write('scoreboard_team', { team: 'proxy_timer', mode: 4, players: [username] });
    } catch (e) {}
  }

  reset() {
    this.destroyProxyTeam();
  }
}

module.exports = NametagModule;
