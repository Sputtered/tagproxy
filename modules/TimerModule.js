const { stripColor } = require('../utils/colorUtils');
const { getPing } = require('../utils/ping');
const config = require('../config.json');

class TimerModule {
  constructor() {
    this.serverTimer = null;
    this.syncTime = null;
    this.lastPacketTime = null;
    this._lastReturned = null;
  }

  onTimerPacket(suffix) {
    const raw = stripColor(suffix);
    const num = parseInt(raw);
    if (!isNaN(num) && num >= 0) {
      this.serverTimer = num;
      this.syncTime = Date.now();
      this.lastPacketTime = Date.now();
      return num;
    }
    return null;
  }

  getCurrentTimer() {
    if (this.serverTimer === null || this.syncTime === null) return null;
    const oneWay = getPing() / 2;
    const elapsed = (Date.now() - this.syncTime - oneWay) / 1000;
    let t = Math.max(0, this.serverTimer - elapsed - config.timer.timerCorrection);
    if (this._lastReturned !== null) {
      t = Math.min(t, this._lastReturned + 0.05);
    }
    this._lastReturned = t;
    return t;
  }

  isStale() {
    if (this.lastPacketTime === null) return false;
    return (Date.now() - this.lastPacketTime) > 3000;
  }

  reset() {
    this.serverTimer = null;
    this.syncTime = null;
    this.lastPacketTime = null;
    this._lastReturned = null;
  }
}

module.exports = TimerModule;
