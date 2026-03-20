class GameModule {
  constructor(client) {
    this.client = client;
    this.inGame = false;
    this.gamePlayers = new Set();
  }

  onGameStart(playerList) {
    this.inGame = true;
    this.gamePlayers = new Set(Object.values(playerList));
    const count = this.gamePlayers.size;
    const names = Array.from(this.gamePlayers).join('§7, §f');
    setTimeout(() => {
      this.sendChat('§8§m──────────────────§r');
      this.sendChat(`§e§lTNT Tag §8— §f${count} players`);
      this.sendChat(`§f${names}`);
      this.sendChat('§8§m──────────────────§r');
    }, 3000);
  }

  onGameReset() {
    this.inGame = false;
    this.gamePlayers.clear();
  }

  sendChat(message) {
    try {
      this.client.write('chat', {
        message: JSON.stringify({ text: message }),
        position: 0,
      });
    } catch (e) {}
  }
}

module.exports = GameModule;
