# @ac-codeprod/n8n-nodes-alexa-remote

[![n8n community node](https://img.shields.io/badge/n8n-community%20node-orange?logo=n8n)](https://docs.n8n.io/integrations/community-nodes/installation/)
[![npm version](https://img.shields.io/npm/v/@ac-codeprod/n8n-nodes-alexa-remote)](https://www.npmjs.com/package/@ac-codeprod/n8n-nodes-alexa-remote)
[![npm downloads](https://img.shields.io/npm/dm/@ac-codeprod/n8n-nodes-alexa-remote)](https://www.npmjs.com/package/@ac-codeprod/n8n-nodes-alexa-remote)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

This is an n8n community node package that lets you interact with the Amazon Alexa API in your n8n workflows. It provides two nodes:

- **Alexa Remote** — action node to control devices, execute routines, manage lists, notifications, and more.
- **Alexa Remote Trigger** — trigger node that starts a workflow when an Alexa WebSocket push event occurs.

Alexa Remote provides programmatic access to control Echo devices, execute routines, manage smart home devices, and more — all without saying "Alexa"!

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Table of Contents

- [Installation](#installation)
- [Nodes](#nodes)
- [Operations](#operations)
- [Trigger Events](#trigger-events)
- [Credentials](#credentials)
- [Compatibility](#compatibility)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Quick Installation

```bash
npm install @ac-codeprod/n8n-nodes-alexa-remote
```

## Nodes

### Alexa Remote

An action node to interact with the Alexa API. Supports 10 resources and can also be used as an AI tool.

### Alexa Remote Trigger

A trigger node that listens for real-time Alexa WebSocket push events and starts your workflow when they occur.

## Operations

### Account
- **Get Accounts** — Get account information
- **Get Contacts** — Get your Alexa contacts
- **Get Music Providers** — List available music streaming services
- **Get Routines** — Get all automation routines

### Auth
- **Authenticate** — Start the proxy and wait for Amazon login. Open your browser at `http://[Proxy IP]:[Proxy Port]` when the workflow is running. A **Login Timeout (Minutes)** parameter controls how long to wait (default: 5 min).

### Bluetooth ⚠️ Untested

> **Warning**: Bluetooth operations have not been tested yet. They are available in the code but their behavior is not guaranteed.

- **Get State** — Get paired Bluetooth devices and connection state
- **Connect** — Connect to a paired Bluetooth device (requires MAC address)
- **Disconnect** — Disconnect the current Bluetooth device
- **Unpair** — Unpair a Bluetooth device (requires MAC address)

### Conversation
- **Get Conversations** — Get Alexa conversations (optionally filter unread only)
- **Send Message** — Send a text message to a conversation

### Device (Echo)
- **Get Devices** — List all your Echo devices
- **Get Device Info** — Get detailed information about a specific device
- **Get Player Info** — Get current player info (track, state, volume…)
- **Get Player Queue** — Get the current playback queue
- **Send Command** — Send a media command to a device: `play`, `pause`, `next`, `previous`, `forward`, `rewind`, `repeat`, `shuffle`
- **Set Do Not Disturb** — Enable or disable Do Not Disturb mode

### Interaction
- **Speak** — Make Alexa speak text (regular, SSML, or announcement)
- **Speak All (Multi-Device)** — Make multiple Echo devices speak in parallel
- **Speak At Volume** — Make Alexa speak at a specific volume level
- **Text Command** — Send a text command to Alexa (like asking her something)
- **Stop** — Stop playback on a device
- **Set Volume** — Change device volume (0–100)
- **Play Music** — Play music from a provider (Amazon Music, Spotify, TuneIn, Cloud Player)
- **Builtin** — Play a built-in Alexa action: Weather, Traffic, Flash Briefing, Good Morning, Fun Fact, Joke, Clean Up, Sing a Song, Tell Story, Calendar (Today / Tomorrow / Next)
- **Sound** — Play a sound effect by sound string ID (e.g., `amzn1.ask.1p.sound/nature/crickets_01`)
- **Wait** — Wait a given number of seconds (useful in sequence workflows)

### List
- **Get Lists** — Get all Alexa lists (shopping, to-do, and custom)
- **Add Item** — Add an item to a list
- **Remove Item** — Remove an item from a list
- **Create List** — Create a new custom list
- **Delete List** — Delete a list

### Notification
- **Get Notifications** — List all notifications (alarms, reminders, timers)
- **Create Notification** — Create an alarm, reminder, or timer
- **Delete Notification** — Remove a notification by ID

### Routine
- **Execute Routine** — Run an existing Alexa automation routine (selected from a dropdown)

### Smarthome
- **Get Devices** — List all connected smart home devices
- **Control Device** — Control a smart home device: Turn On, Turn Off, Set Brightness, Set Color, Set Temperature

## Trigger Events

The **Alexa Remote Trigger** node listens for the following WebSocket push events:

| Event | Description |
|---|---|
| **All Messages** | Fires on every WebSocket event received from Alexa |
| **All Unknown Messages** | Fires on every unrecognized WebSocket message |
| **Audio Player State Change** | Fires when media playback state changes on an Echo device |
| **Bluetooth State Change** | Fires when a Bluetooth connection state changes |
| **Device Activity** | Fires when an Echo device registers an activity (voice command, etc.) |
| **Device Connection Change** | Fires when an Echo device goes online or offline |
| **Media Change** | Fires when the currently playing media changes |
| **Notification Change** | Fires when an Alexa notification (alarm, reminder) changes |
| **Todo / List Change** | Fires when an Alexa shopping or to-do list changes |
| **Volume Change** | Fires when the volume of an Echo device changes |

Each trigger emits a JSON payload with `event`, `payload`, and `timestamp` fields.

## Credentials

To use this node, you need to configure **Alexa Remote API** credentials.

### Prerequisites

1. An Amazon account with Alexa devices registered
2. Access to your n8n server's IP address (for proxy authentication)

### Setup

1. In n8n, create new "Alexa Remote API" credentials
2. Configure the following:
   - **Proxy IP**: Your n8n server's IP address (e.g., `192.168.1.100`)
   - **Proxy Port**: Port for authentication (default: `3456`)
   - **Cookie File Path**: Path to save authentication cookie (defaults to `$N8N_USER_FOLDER/.alexa-cookie.json`)
   - **Amazon Service Host**: Select your region (e.g., `pitangui.amazon.com` for USA)
   - **Amazon Page**: Select your Amazon domain (e.g., `amazon.com`)
   - **Language**: Select your language (e.g., `en-US`)
3. Save credentials and add an **Alexa Remote** node with **Resource**: `Auth`, **Operation**: `Authenticate`
4. Run the workflow — the proxy will start and display a login URL in the logs
5. Open the URL in your browser and log in with your Amazon account
6. Once login is complete, the cookie is saved and credentials are ready

The cookie will be automatically refreshed according to the **Refresh Interval** setting.

### All Credential Fields

| Field | Description | Default |
|---|---|---|
| **Proxy IP** | IP of your n8n server | `localhost` |
| **Proxy Port** | Proxy port | `3456` |
| **Cookie File Path** | Path to save/read the cookie JSON file | `$N8N_USER_FOLDER/.alexa-cookie.json` |
| **Amazon Service Host** | Alexa service endpoint for your region | `pitangui.amazon.com` |
| **Amazon Page** | Amazon domain for your region | `amazon.com` |
| **Language** | Accept-Language header value | `en-US` |
| **Refresh Interval (Days)** | Auto-refresh cookie interval | `3` |

### Supported Regions

| Region | Amazon Service Host | Amazon Page |
|---|---|---|
| USA | `pitangui.amazon.com` | `amazon.com` |
| UK | `alexa.amazon.co.uk` | `amazon.co.uk` |
| Germany | `layla.amazon.de` | `amazon.de` |
| France | `layla.amazon.de` | `amazon.fr` |
| Italy | `alexa.amazon.it` | `amazon.it` |
| Spain | `alexa.amazon.es` | `amazon.es` |
| Australia | `alexa.amazon.com.au` | `amazon.com.au` |
| Brazil | `alexa.amazon.com.br` | `amazon.com.br` |

## Compatibility

- Minimum n8n version: 1.0.0
- Tested with n8n: 2.13.1
- Requires Node.js: ≥18.0.0

## Usage

### Example 1: First-time Authentication

1. Add an **Alexa Remote** node
2. Select **Resource**: `Auth`, **Operation**: `Authenticate`
3. Set **Login Timeout** (minutes) — default is 5
4. Run the workflow and open the URL shown in the logs
5. Log in with your Amazon account
6. The cookie is saved — you won't need to redo this unless the session expires

### Example 2: Make Alexa Speak

1. Add an **Alexa Remote** node
2. Select **Resource**: `Interaction`, **Operation**: `Speak`
3. Select your device from the dropdown
4. Enter text: `Hello from n8n!`
5. Execute the workflow

### Example 3: Speak on Multiple Devices Simultaneously

1. Add an **Alexa Remote** node
2. Select **Resource**: `Interaction`, **Operation**: `Speak All (Multi-Device)`
3. Select multiple devices from the dropdown
4. Enter text and speak type
5. Execute

### Example 4: Play Music

1. Add an **Alexa Remote** node
2. Select **Resource**: `Interaction`, **Operation**: `Play Music`
3. Select your device
4. Select **Music Provider**: `Amazon Music`
5. Enter **Search Query**: `relaxing jazz`
6. Execute

### Example 5: Control a Smart Home Device

1. Add an **Alexa Remote** node
2. Select **Resource**: `Smarthome`, **Operation**: `Control Device`
3. Select the entity from the dropdown (e.g., `Living Room Lights`)
4. Select **Action**: `Set Brightness`
5. Enter **Value**: `75`
6. Execute

### Example 6: Create a Reminder

1. Add an **Alexa Remote** node
2. Select **Resource**: `Notification`, **Operation**: `Create Notification`
3. Select your device
4. Select **Type**: `Reminder`
5. Enter **Label**: `Take out trash`
6. Enter **Time**: `2026-03-20T18:00:00.000` (ISO 8601 format)
7. Execute

### Example 7: Trigger on Device Activity

1. Add an **Alexa Remote Trigger** node
2. Select **Event**: `Device Activity`
3. Activate the workflow
4. Every time a voice command is registered on any Echo device, the workflow runs

### Example 8: Execute an Existing Routine

1. Add an **Alexa Remote** node
2. Select **Resource**: `Routine`, **Operation**: `Execute Routine`
3. Select your routine from the dropdown
4. Execute

## Troubleshooting

### Authentication Issues

- **Cookie file not found**: Run the `Auth → Authenticate` operation first to complete Amazon login
- **Cookie file is not valid JSON**: The cookie file was corrupted — re-run authentication
- **"no csrf" error**: Session expired, re-run `Auth → Authenticate`
- **"401 Unauthorized"**: Invalid or expired cookie
- **Proxy doesn't start**: Check that the configured port is not already in use

### Device Not Found

- Devices are loaded dynamically from your account — run `Auth → Authenticate` first
- Use the serial number directly via an n8n expression if the dropdown is empty
- Get serial numbers using the `Device → Get Devices` operation

### Commands Don't Work

- Ensure the device is online and connected
- Some commands (e.g., `next`, `previous`) require the device to be actively playing media
- Check that your Amazon account has access to the device

### Trigger Not Firing

- Verify the WebSocket connection is established (check n8n logs)
- The `All Messages` event can be used to debug — it fires on every incoming event

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Alexa Remote 2 Library](https://www.npmjs.com/package/alexa-remote2)
- [Original Node-RED Implementation](https://github.com/bbindreiter/node-red-contrib-alexa-remote2-applestrudel)

## Credits

This project is inspired by the excellent [node-red-contrib-alexa-remote2-applestrudel](https://github.com/bbindreiter/node-red-contrib-alexa-remote2-applestrudel) project by bbindreiter, which uses the [alexa-remote2](https://www.npmjs.com/package/alexa-remote2) library.

## License

[MIT](LICENSE)

## Author

**Developed with ❤️ by [AC-CodeProd](https://github.com/AC-CodeProd)**
