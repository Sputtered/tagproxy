const { loadConfig, saveConfig } = require('../utils/config-loader');

const SETTINGS = [
  { key: 'features.actionBar',        label: 'Action Bar',          type: 'bool'   },
  { key: 'features.nametags',          label: 'Nametags',            type: 'bool'   },
  { key: 'features.tablistTimer',      label: 'Tablist Timer',       type: 'bool'   },
  { key: 'features.tickSounds',        label: 'Tick Sounds',         type: 'bool'   },
  { key: 'features.barrierToGlass',    label: 'Barrier to Glass',    type: 'bool'   },
  { key: 'features.gameStartMessage',  label: 'Game Start Message',  type: 'bool'   },
  { key: 'features.welcomeMessage',    label: 'Welcome Message',     type: 'bool'   },
  { key: 'features.chatEvents',        label: 'Chat Events',         type: 'bool'   },
  { key: 'sounds.tickSound',           label: 'Tick Sound',          type: 'string' },
  { key: 'sounds.tickVolume',          label: 'Tick Volume',         type: 'number' },
  { key: 'sounds.tickPitch',           label: 'Tick Pitch',          type: 'number' },
  { key: 'sounds.tickFromSecond',      label: 'Tick From Second',    type: 'number' },
  { key: 'timer.pingOffset',           label: 'Ping Offset',         type: 'number' },
  { key: 'timer.timerCorrection',      label: 'Timer Correction',    type: 'number' },
];

function getVal(cfg, dotKey) {
  return dotKey.split('.').reduce((o, k) => o?.[k], cfg);
}

function setVal(cfg, dotKey, value) {
  const keys = dotKey.split('.');
  let obj = cfg;
  for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
  obj[keys[keys.length - 1]] = value;
}

class ConfigModule {
  constructor(client) {
    this.client = client;
  }

  handle(message) {
    const parts = message.trim().split(/\s+/);
    if (parts[0] !== '/config') return false;

    const cfg = loadConfig();

    if (parts.length === 1) {
      this._showAll(cfg);
      return true;
    }

    if (parts[1] === 'help') {
      this._showHelp();
      return true;
    }

    const idx = parseInt(parts[1]);
    if (!isNaN(idx) && idx >= 1 && idx <= SETTINGS.length) {
      const setting = SETTINGS[idx - 1];
      if (parts.length === 2) {
        this._send(`§e${setting.label}§8: §f${getVal(cfg, setting.key)}`);
        return true;
      }
      const raw = parts.slice(2).join(' ');
      let parsed;
      if (setting.type === 'bool') {
        if (raw === 'true' || raw === 'on') parsed = true;
        else if (raw === 'false' || raw === 'off') parsed = false;
        else { this._send('§cInvalid value. Use §fon §cor §foff§c.'); return true; }
      } else if (setting.type === 'number') {
        parsed = parseFloat(raw);
        if (isNaN(parsed)) { this._send(`§cExpected a number, got: §f${raw}`); return true; }
      } else {
        parsed = raw;
      }
      setVal(cfg, setting.key, parsed);
      saveConfig(cfg);
      this._send(`§a✔  §e${setting.label} §8→ §f${parsed}`);
      return true;
    }

    this._send('§cUnknown setting. Type §f/config §cto see all options.');
    return true;
  }

  _showAll(cfg) {
    this._send('§8§m────────────────────§r');
    this._send('§e§lProxy Config  §8|  §7/config <id> <value>');
    this._send('§8§m────────────────────§r');
    for (let i = 0; i < SETTINGS.length; i++) {
      const s = SETTINGS[i];
      const val = getVal(cfg, s.key);
      const valStr = typeof val === 'boolean' ? (val ? '§aon' : '§coff') : `§f${val}`;
      this._send(`§8[§7${i + 1}§8]  §f${s.label}§8: ${valStr}`);
    }
    this._send('§8§m────────────────────§r');
  }

  _showHelp() {
    this._send('§8§m────────────────────§r');
    this._send('§e§lConfig Help');
    this._send('§f/config             §8— list all settings');
    this._send('§f/config <id>         §8— show current value');
    this._send('§f/config <id> <value> §8— update value');
    this._send('§7Example: §f/config 1 off');
    this._send('§8§m────────────────────§r');
  }

  _send(text) {
    try {
      this.client.write('chat', { message: JSON.stringify({ text }), position: 0 });
    } catch (e) {}
  }
}

module.exports = ConfigModule;
