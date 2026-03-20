# TNT Tag Proxy

A Node.js proxy for Hypixel TNT Tag. Sits between your Minecraft client and Hypixel to add a client-side explosion timer, nametag overlays, tab list enhancements, and quality-of-life features — without any client modifications.

## Features

- **Explosion timer** — smooth decimal countdown interpolated client-side, color-coded green → yellow → red → dark red
- **Nametag overlay** — timer displayed above all player heads, color-matched to urgency
- **Tab list** — IT players highlighted in red, timer appended to all names
- **Action bar** — shows IT badge when you are IT, or the IT player's name when you are not
- **Tick sounds** — configurable audio cue for the final countdown seconds
- **Barrier to glass** — renders invisible barrier blocks as glass on the client
- **Chat events** — custom sounds and formatted messages for Slowness and Speed power-ups
- **Game start message** — formatted player list sent to chat at the start of each round
- **In-game config** — all settings adjustable live via `/config` without restarting

## Requirements

- [Node.js](https://nodejs.org) LTS
- Minecraft 1.8.9

## Setup

1. Download and extract the release
2. Run `launch.bat`
   - Node.js is checked automatically — if missing, you will be prompted to install it
   - Dependencies install on first launch
3. In Minecraft, connect to `localhost` on version 1.8.9
4. Sign in with your Microsoft account when prompted in the console

## In-Game Commands

| Command | Description |
|---|---|
| `/config` | List all settings with their current values |
| `/config <id>` | Show the current value of a setting |
| `/config <id> <value>` | Update a setting (takes effect immediately) |
| `/config help` | Show usage instructions |

## Configuration

`config.json` is read live — changes take effect on the next tick without restarting.

### Features

| Setting | Default | Description |
|---|---|---|
| `features.actionBar` | `true` | Show IT status and timer in the action bar |
| `features.nametags` | `true` | Show timer above player heads |
| `features.tablistTimer` | `true` | Append timer to tab list names |
| `features.tickSounds` | `true` | Play a sound during the final countdown |
| `features.barrierToGlass` | `true` | Render barrier blocks as glass |
| `features.gameStartMessage` | `true` | Show formatted player list at round start |
| `features.welcomeMessage` | `true` | Show connection message on join |
| `features.chatEvents` | `true` | Custom sounds and messages for power-ups |

### Timer

| Setting | Default | Description |
|---|---|---|
| `timer.pingOffset` | `35` | Added to measured ping (ms) for sync accuracy |
| `timer.timerCorrection` | `0.2` | Seconds subtracted to compensate for display lag |

### Sounds

| Setting | Default | Description |
|---|---|---|
| `sounds.tickSound` | `random.click` | Sound played during countdown |
| `sounds.tickVolume` | `1.0` | Volume (0.0 – 1.0) |
| `sounds.tickPitch` | `63` | Pitch byte — 63 = normal, 84 = higher, 126 = 2× |
| `sounds.tickFromSecond` | `5` | Which second to start ticking from |

### Chat Events

Slowness and Speed power-up messages can be reformatted and paired with sounds. Use `{target}` and `{level}` as placeholders in format strings. Set `reformat` to `false` to keep Hypixel's original message while still playing the sound.

## How It Works

The proxy intercepts Minecraft protocol packets between your client and Hypixel. It reads Hypixel's scoreboard packets to extract the explosion countdown, then interpolates it every 100 ms for a smooth decimal display. Authentication is handled directly with Mojang/Microsoft — no credentials are stored or transmitted elsewhere.

## License

MIT
