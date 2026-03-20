const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(
  process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '..'),
  'config.json'
);

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

module.exports = { loadConfig, saveConfig, CONFIG_PATH };
