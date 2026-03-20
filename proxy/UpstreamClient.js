const mc = require('minecraft-protocol');
const config = require('../config.json');
const { buildTimerText } = require('../utils/colorUtils');
const TimerModule = require('../modules/TimerModule');
const NametagModule = require('../modules/NametagModule');
const TablistModule = require('../modules/TablistModule');
const ActionBarModule = require('../modules/ActionBarModule');
const GameModule = require('../modules/GameModule');

const states = mc.states;

class UpstreamClient {
  constructor(client) {
    this.client = client;
    this.upstream = null;
    this.displayInterval = null;
    this.staleCheckInterval = null;
    this.tickedSeconds = new Set();
    this.timerExpiredFired = false;
    this.lastProcessedSecond = null;
    this.playerPos = { x: 0, y: 64, z: 0 };

    this.timer = new TimerModule();
    this.nametag = new NametagModule(client);
    this.tablist = new TablistModule(client);
    this.actionBar = new ActionBarModule(client);
    this.game = new GameModule(client);
  }

  connect() {
    this.upstream = mc.createClient({
      host: config.hypixel.host,
      port: config.hypixel.port,
      username: this.client.username,
      version: config.hypixel.version,
      auth: 'microsoft',
    });

    this.upstream.on('connect', () => this._onConnect());
    this.upstream.on('raw', (buffer, meta) => this._onRaw(buffer, meta));
    this.upstream.on('error', (err) => this._onError(err));
    this.upstream.on('end', () => this._onEnd());

    this.client.on('raw', (buffer, meta) => this._onClientRaw(buffer, meta));
    this.client.on('end', () => this._onClientEnd());
    this.client.on('error', (err) => this._onClientError(err));

    this.staleCheckInterval = setInterval(() => this._checkStale(), 1000);
  }

  _onConnect() {
    console.log(`[proxy] Connected to Hypixel as ${this.client.username}`);
    setTimeout(() => {
      try {
        this.client.write('chat', {
          message: JSON.stringify({ text: 'TNT Tag Proxy connected.', color: 'green' }),
          position: 0,
        });
      } catch (e) {}
    }, 2000);
  }

  _checkStale() {
    if (this.timer.isStale() && this.displayInterval) {
      this._resetGame();
    }
  }

  _onRaw(buffer, meta) {
    if (meta.state !== states.PLAY || this.client.state !== states.PLAY) return;

    if (meta.name === 'position') {
      try {
        const p = this.upstream.deserializer.parsePacketBuffer(buffer).data.params;
        this.playerPos = { x: p.x, y: p.y, z: p.z };
      } catch (e) {}
    }

    if (meta.name === 'chat') {
      try {
        const parsed = this.upstream.deserializer.parsePacketBuffer(buffer);
        if (ActionBarModule.shouldBlock(parsed.data.params)) return;
      } catch (e) {}
    }

    if (meta.name === 'player_info') {
      try {
        const parsed = this.upstream.deserializer.parsePacketBuffer(buffer);
        const p = parsed.data.params;
        if (p.action === 'add_player') {
          for (const entry of p.data) {
            this.tablist.addPlayer(entry.uuid, entry.name);
            if (!this.tablist.getITPlayers().has(entry.name)) {
              this.nametag.addToProxyTeam(entry.name);
            }
          }
        } else if (p.action === 'remove_player') {
          for (const entry of p.data) {
            this.tablist.removePlayer(entry.uuid);
          }
        }
      } catch (e) {}
    }

    if (meta.name === 'scoreboard_team') {
      try {
        const parsed = this.upstream.deserializer.parsePacketBuffer(buffer);
        const p = parsed.data.params;

        if (p.prefix && p.prefix.includes('Explosion in')) {
          const prevTimer = this.timer.serverTimer;
          const raw = parseInt(p.suffix.replace(/§./g, ''));

          if (!isNaN(raw) && raw === this.lastProcessedSecond) {
            this.timer.lastPacketTime = Date.now();
            this.client.writeRaw(buffer);
            return;
          }
          this.lastProcessedSecond = raw;

          const num = this.timer.onTimerPacket(p.suffix);

          if (num !== null) {
            if (prevTimer !== null && num > prevTimer + 10) {
              this._resetGame();
            }

            if (!this.displayInterval) {
              this._startDisplayLoop();
              this.game.onGameStart(this.tablist.getPlayerList());
            }

            this.timerExpiredFired = false;
          }

          this.client.writeRaw(buffer);
          return;
        }

        if (p.team === 'it') {
          if (p.mode === 3 && p.players) {
            for (const name of p.players) {
              this.tablist.addITPlayer(name);
              this.nametag.removeFromProxyTeam(name);
            }
          }
          if (p.mode === 4 && p.players) {
            for (const name of p.players) {
              this.tablist.removeITPlayer(name);
              this.nametag.addToProxyTeam(name);
            }
          }
        }

        if (p.prefix && p.prefix.includes('[IT]')) {
          this.nametag.onITTeamData(p);
          this.client.writeRaw(buffer);
          const t = this.timer.getCurrentTimer();
          if (t !== null) this.nametag.updateITNametag(t);
          return;
        }

      } catch (e) {}
    }

    this.client.writeRaw(buffer);
  }

  _onClientRaw(buffer, meta) {
    if (meta.state !== states.PLAY || this.upstream?.state !== states.PLAY) return;

    if (meta.name === 'position' || meta.name === 'position_look') {
      try {
        const p = this.client.deserializer.parsePacketBuffer(buffer).data.params;
        this.playerPos = { x: p.x, y: p.y, z: p.z };
      } catch (e) {}
    }

    this.upstream.writeRaw(buffer);
  }

  _resetGame() {
    clearInterval(this.displayInterval);
    this.displayInterval = null;

    this.nametag.clearITNametag();
    this.nametag.reset();
    this.timer.reset();
    this.tablist.resetIT();
    this.tickedSeconds.clear();
    this.timerExpiredFired = false;
    this.lastProcessedSecond = null;
    this.game.onGameReset();
  }

  _startDisplayLoop() {
    if (this.displayInterval) clearInterval(this.displayInterval);
    this.tickedSeconds.clear();

    const nonItPlayers = this.tablist.getNonITPlayers();
    if (nonItPlayers.length > 0) {
      this.nametag.createProxyTeam(nonItPlayers, '');
    }

    this.displayInterval = setInterval(() => {
      const t = this.timer.getCurrentTimer();
      if (t === null) return;

      const timerText = buildTimerText(t);
      this.nametag.updateITNametag(t);
      this.nametag.ensureProxyTeam(this.tablist.getNonITPlayers(), timerText);
      this.actionBar.update(t);
      this.tablist.update(t);

      const s = Math.ceil(t);
      if (config.timer.tickSounds && s >= 1 && s <= 5 && !this.tickedSeconds.has(s)) {
        this.tickedSeconds.add(s);
        this._playTickSound();
      }

      if (t <= 0 && !this.timerExpiredFired) {
        this.timerExpiredFired = true;
        this.nametag.clearITNametag();
        this.nametag.updateProxyTeamSuffix('');
        clearInterval(this.displayInterval);
        this.displayInterval = null;
      }
    }, 100);
  }

  _playTickSound() {
    try {
      this.client.write('named_sound_effect', {
        soundName: 'random.click',
        x: Math.floor(this.playerPos.x * 8),
        y: Math.floor(this.playerPos.y * 8),
        z: Math.floor(this.playerPos.z * 8),
        volume: 1.0,
        pitch: 63,
      });
    } catch (e) {}
  }

  _onError(err) {
    console.error(`[proxy] Connection error: ${err.message}`);
    this._cleanup();
    try { this.client.end('Connection error'); } catch {}
  }

  _onEnd() {
    console.log('[proxy] Disconnected from Hypixel');
    this._cleanup();
    try { this.client.end('Disconnected from Hypixel'); } catch {}
  }

  _onClientEnd() {
    console.log('[proxy] Client disconnected');
    this._cleanup();
    try { this.upstream?.end(); } catch {}
  }

  _onClientError(err) {
    console.error(`[proxy] Client error: ${err.message}`);
    this._cleanup();
    try { this.upstream?.end(); } catch {}
  }

  _cleanup() {
    clearInterval(this.displayInterval);
    clearInterval(this.staleCheckInterval);
    this.displayInterval = null;
    this.staleCheckInterval = null;
  }
}

module.exports = UpstreamClient;
