function stripColor(str) {
  return str.replace(/§./g, '');
}

function timerColor(t) {
  if (t > 15) return '§a';
  if (t > 5)  return '§e';
  if (t > 1)  return '§c';
  return '§4';
}

function buildTimerText(t) {
  return `§8 [${timerColor(t)}${t.toFixed(1)}§8]`;
}

module.exports = { stripColor, timerColor, buildTimerText };
