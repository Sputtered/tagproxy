# TNT Tag Proxy

A Node.js proxy for Hypixel TNT Tag that adds a client-side explosion timer, nametag overlays, and tab list enhancements — without modifying your Minecraft client.

## Features

- **Explosion timer** — decimal countdown interpolated client-side for accuracy, displayed above all player heads and in the tab list
- **IT nametag** — timer shown above the IT player's head in color-coded brackets
- **Tab list** — IT players highlighted in red, timer appended to all names
- **Action bar** — clean countdown display, replaces Hypixel's default
- **Tick sounds** — audio cue for the last 5 seconds of each round
- **Auto game detection** — state resets automatically between games

## Requirements

- [Node.js](https://nodejs.org) (LTS version recommended)
- Minecraft 1.8.9

## Setup

1. Download and extract the latest release
2. Run `start.bat`
   - Dependencies install automatically on first run
   - If Node.js is not installed, the launcher will prompt you to download it
3. Connect to `localhost` in Minecraft multiplayer (1.8.9)
4. Sign in with Microsoft when prompted in the console

## Configuration

Edit `config.json` to adjust settings:

| Field | Default | Description |
|---|---|---|
| `proxy.port` | `25565` | Local port to listen on |
| `proxy.motd` | `TNT Tag Proxy` | Server list display name |
| `hypixel.host` | `mc.hypixel.net` | Upstream server address |
| `timer.pingOffset` | `35` | Added to measured ping (ms) for timer accuracy |
| `timer.timerCorrection` | `0.2` | Seconds subtracted from timer to compensate for display lag |
| `timer.tickSounds` | `true` | Play tick sounds during the last 5 seconds |
| `timer.actionBar` | `true` | Show countdown in the action bar |

## How It Works

The proxy sits between your Minecraft client and Hypixel, intercepting and modifying packets in real time. It reads Hypixel's scoreboard packets to extract the explosion countdown, then interpolates it client-side every 100ms for a smooth decimal display. Your login credentials are passed directly to Mojang/Microsoft — nothing is stored or sent elsewhere.

## FAQ

**Do I need to install anything besides Node.js?**
No. `start.bat` runs `npm install` automatically on first launch.

**Will this work on other servers?**
The timer logic is specific to Hypixel TNT Tag's scoreboard format. Other features may work elsewhere.

**Is this detectable?**
The proxy only modifies what your client sees, not what is sent to Hypixel. No packets are altered server-side.

## License

MIT
