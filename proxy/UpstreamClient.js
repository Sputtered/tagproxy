const mc = require('minecraft-protocol');
const { loadConfig } = require('../utils/config-loader');
const { buildTimerText } = require('../utils/colorUtils');
const TimerModule    = require('../modules/TimerModule');
const NametagModule  = require('../modules/NametagModule');
const TablistModule  = require('../modules/TablistModule');
const ActionBarModule = require('../modules/ActionBarModule');
const GameModule     = require('../modules/GameModule');
const ChatModule     = require('../modules/ChatModule');
const ConfigModule   = require('../modules/ConfigModule');

const states = mc.states;

const BARRIER_ID = 166;
const GLASS_ID   = 20;

class UpstreamClient {
  constructor(client) {
    this.client    = client;
    this.upstream  = null;
    this.displayInterval    = null;
    this.staleCheckInterval = null;
    this.idleInterval       = null;
    this.tickedSeconds      = new Set();
    this.timerExpiredFired  = false;
    this.lastProcessedSecond = null;
    this.playerPos = { x: 0, y: 64, z: 0 };

    this.timer     = new TimerModule();
    this.nametag   = new NametagModule(client);
    this.tablist   = new TablistModule(client);
    this.actionBar = new ActionBarModule(client);
    this.game      = new GameModule(client);
    this.chat      = new ChatModule(client);
    this.config    = new ConfigModule(client);
  }

  connect() {
    const cfg = loadConfig();
    this.upstream = mc.createClient({
      host:     cfg.hypixel.host,
      port:     cfg.hypixel.port,
      username: this.client.username,
      version:  cfg.hypixel.version,
      auth:     'microsoft',
    });

    this.upstream.on('connect', () => this._onConnect());
    this.upstream.on('raw',     (buf, meta) => this._onRaw(buf, meta));
    this.upstream.on('error',   (err) => this._onError(err));
    this.upstream.on('end',     () => this._onEnd());

    this.client.on('raw',   (buf, meta) => this._onClientRaw(buf, meta));
    this.client.on('end',   () => this._onClientEnd());
    this.client.on('error', (err) => this._onClientError(err));

    this.staleCheckInterval = setInterval(() => this._checkStale(), 1000);
    this.idleInterval = setInterval(() => {
      if (!this.displayInterval) this.actionBar.showIdle();
    }, 2000);
  }

  _onConnect() {
    console.log(`[proxy] Connected to Hypixel as ${this.client.username}`);
    const cfg = loadConfig();
    if (!cfg.features.welcomeMessage) return;
    setTimeout(() => {
      try {
        const lines = [
          '§8§m──────────────────§r',
          '§e§lTNT Tag Proxy §8— §7connected',
          '§7Type §f/config §7to adjust settings.',
          '§8§m──────────────────§r',
        ];
        for (const line of lines) {
          this.client.write('chat', { message: JSON.stringify({ text: line }), position: 0 });
        }
      } catch (e) {}
    }, 2000);
  }

  _checkStale() {
    if (this.timer.isStale() && this.displayInterval) this._resetGame();
  }

  _parse(buffer) {
    return this.upstream.deserializer.parsePacketBuffer(buffer).data.params;
  }

  _patchBarriers(buffer) {
    const buf = Buffer.from(buffer);
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i] === 0x60 && buf[i + 1] === 0x0A) {
        buf[i] = 0x40; buf[i + 1] = 0x01;
      }
    }
    return buf;
  }

  _onRaw(buffer, meta) {
    if (meta.state !== states.PLAY || this.client.state !== states.PLAY) return;

    switch (meta.name) {

      case 'position': {
        try {
          const p = this._parse(buffer);
          this.playerPos = { x: p.x, y: p.y, z: p.z };
        } catch (e) {}
        break;
      }

      case 'chat': {
        try {
          const params = this._parse(buffer);
          if (ActionBarModule.shouldBlock(params)) return;
          if (this.chat.onServerChat(params, this.playerPos)) return;
        } catch (e) {}
        break;
      }

      case 'map_chunk':
      case 'map_chunk_bulk': {
        if (loadConfig().features.barrierToGlass) {
          this.client.writeRaw(this._patchBarriers(buffer));
          return;
        }
        break;
      }

      case 'block_change': {
        if (loadConfig().features.barrierToGlass) {
          try {
            const p = this._parse(buffer);
            if (p.type === BARRIER_ID) {
              this.client.write('block_change', { ...p, type: GLASS_ID });
              return;
            }
          } catch (e) {}
        }
        break;
      }

      case 'multi_block_change': {
        if (loadConfig().features.barrierToGlass) {
          try {
            const p = this._parse(buffer);
            const records = p.records.map(r =>
              r.blockId === BARRIER_ID ? { ...r, blockId: GLASS_ID } : r
            );
            if (records.some((r, i) => r.blockId !== p.records[i].blockId)) {
              this.client.write('multi_block_change', { ...p, records });
              return;
            }
          } catch (e) {}
        }
        break;
      }

      case 'player_info': {
        try {
          const p = this._parse(buffer);
          if (p.action === 'add_player') {
            for (const entry of p.data) {
              this.tablist.addPlayer(entry.uuid, entry.name);
              if (!this.tablist.getITPlayers().has(entry.name)) {
                this.nametag.addToProxyTeam(entry.name);
              }
            }
          } else if (p.action === 'update_display_name') {
            for (const entry of p.data) {
              if (entry.displayName) this.tablist.onDisplayName(entry.uuid, entry.displayName);
            }
          } else if (p.action === 'remove_player') {
            for (const entry of p.data) this.tablist.removePlayer(entry.uuid);
          }
        } catch (e) {}
        break;
      }

      case 'scoreboard_team': {
        try {
          const p = this._parse(buffer);

          if (p.prefix?.includes('Explosion in')) {
            const raw = parseInt(p.suffix.replace(/§./g, ''));
            if (!isNaN(raw) && raw === this.lastProcessedSecond) {
              this.timer.lastPacketTime = Date.now();
              this.client.writeRaw(buffer);
              return;
            }
            this.lastProcessedSecond = raw;

            const prevTimer = this.timer.serverTimer;
            const num = this.timer.onTimerPacket(p.suffix);

            if (num !== null) {
              if (prevTimer !== null && num > prevTimer + 10) this._resetGame();
              if (!this.displayInterval) {
                this._startDisplayLoop();
                if (loadConfig().features.gameStartMessage) {
                  this.game.onGameStart(this.tablist.getPlayerList());
                }
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
            } else if (p.mode === 4 && p.players) {
              for (const name of p.players) {
                this.tablist.removeITPlayer(name);
                this.nametag.addToProxyTeam(name);
              }
            }
          }

          if (p.prefix?.includes('[IT]')) {
            this.nametag.onITTeamData(p);
            this.client.writeRaw(buffer);
            if (loadConfig().features.nametags) {
              const t = this.timer.getCurrentTimer();
              if (t !== null) this.nametag.updateITNametag(t);
            }
            return;
          }
        } catch (e) {}
        break;
      }
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

    if (meta.name === 'chat') {
      try {
        const msg = this.client.deserializer.parsePacketBuffer(buffer).data.params.message;
        if (this.config.handle(msg)) return;
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

    const cfg = loadConfig();
    if (cfg.features.nametags) {
      const nonIT = this.tablist.getNonITPlayers();
      if (nonIT.length > 0) this.nametag.createProxyTeam(nonIT, '');
    }

    this.displayInterval = setInterval(() => {
      const t = this.timer.getCurrentTimer();
      if (t === null) return;
      const cfg = loadConfig();

      if (cfg.features.nametags) {
        this.nametag.updateITNametag(t);
        this.nametag.ensureProxyTeam(this.tablist.getNonITPlayers(), buildTimerText(t));
      }

      if (cfg.features.actionBar) {
        this.actionBar.update(
          t,
          this.tablist.getITPlayers().has(this.client.username),
          this.tablist.getITPlayers()
        );
      }

      if (cfg.features.tablistTimer) this.tablist.update(t);

      if (cfg.features.tickSounds) {
        const s = Math.ceil(t);
        const limit = cfg.sounds.tickFromSecond ?? 5;
        if (s >= 1 && s <= limit && !this.tickedSeconds.has(s)) {
          this.tickedSeconds.add(s);
          this._playTickSound();
        }
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
    const cfg = loadConfig();
    const s = cfg.sounds;
    try {
      this.client.write('named_sound_effect', {
        soundName: s.tickSound ?? 'random.click',
        x: Math.floor(this.playerPos.x * 8),
        y: Math.floor(this.playerPos.y * 8),
        z: Math.floor(this.playerPos.z * 8),
        volume: s.tickVolume ?? 1.0,
        pitch:  s.tickPitch  ?? 63,
      });
    } catch (e) {}
  }

  _onError(err) {
    console.error(`[proxy] Upstream error: ${err.message}`);
    this._cleanup();
    try { this.client.end('Connection error'); } catch {}
  }

  _onEnd() {
    console.log('[proxy] Disconnected from Hypixel');
    this._cleanup();
    try { this.client.end('Disconnected from Hypixel'); } catch {}
  }

  _onClientEnd() {
    console.log(`[proxy] ${this.client.username} disconnected`);
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
    clearInterval(this.idleInterval);
    this.displayInterval    = null;
    this.staleCheckInterval = null;
    this.idleInterval       = null;
  }
}

module.exports = UpstreamClient;
