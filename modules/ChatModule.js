const { loadConfig } = require('../utils/config-loader');

class ChatModule {
  constructor(client) {
    this.client = client;
  }

  onServerChat(params, pos) {
    if (params.position !== 0) return false;
    const cfg = loadConfig();
    if (!cfg.features.chatEvents) return false;

    let raw = '';
    try {
      raw = this._extractText(JSON.parse(params.message));
    } catch (e) {
      return false;
    }

    const ev = cfg.chatEvents;

    if (raw.includes('applied Slowness')) {
      if (ev.slowness.sound) this.playSound(ev.slowness.sound, pos);
      if (ev.slowness.reformat) {
        const match = raw.match(/applied Slowness \d+ to (\S+)!/);
        this._sendChat(ev.slowness.format.replace('{target}', match?.[1] ?? '???'));
        return true;
      }
      return false;
    }

    if (raw.includes('received Speed')) {
      if (ev.speed.sound) this.playSound(ev.speed.sound, pos);
      if (ev.speed.reformat) {
        const match = raw.match(/received Speed (\d+)/);
        this._sendChat(ev.speed.format.replace('{level}', match?.[1] ?? '?'));
        return true;
      }
      return false;
    }

    return false;
  }

  _extractText(obj) {
    if (typeof obj === 'string') return obj;
    let text = obj.text || obj.translate || '';
    if (Array.isArray(obj.extra)) text += obj.extra.map(p => this._extractText(p)).join('');
    if (Array.isArray(obj.with))  text += obj.with.map(p => this._extractText(p)).join('');
    return text;
  }

  _sendChat(message) {
    try {
      this.client.write('chat', { message: JSON.stringify({ text: message }), position: 0 });
    } catch (e) {}
  }

  playSound(soundCfg, pos) {
    try {
      this.client.write('named_sound_effect', {
        soundName: soundCfg.name,
        x: Math.floor((pos?.x ?? 0) * 8),
        y: Math.floor((pos?.y ?? 64) * 8),
        z: Math.floor((pos?.z ?? 0) * 8),
        volume: soundCfg.volume ?? 1.0,
        pitch: soundCfg.pitch ?? 63,
      });
    } catch (e) {}
  }
}

module.exports = ChatModule;
