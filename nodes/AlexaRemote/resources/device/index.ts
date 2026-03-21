import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import type { AlexaRemoteExt } from '../../lib/alexa-remote-ext';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['device'],
      },
    },
    options: [
      {
        name: 'Get Device Info',
        value: 'getDeviceInfo',
        description: 'Get information about a specific device',
        action: 'Get device info',
      },
      {
        name: 'Get Devices',
        value: 'getDevices',
        description: 'Get all Echo devices',
        action: 'Get all devices',
      },
      {
        name: 'Get Player Info',
        value: 'getPlayerInfo',
        description: 'Get current player info (track, state, volume…)',
        action: 'Get player info',
      },
      {
        name: 'Get Player Queue',
        value: 'getPlayerQueue',
        description: 'Get the current playback queue',
        action: 'Get player queue',
      },
      {
        name: 'Send Command',
        value: 'sendCommand',
        description: 'Send a command to a device (play, pause, next, etc.)',
        action: 'Send command to device',
      },
      {
        name: 'Set Do Not Disturb',
        value: 'setDoNotDisturb',
        description: 'Enable or disable Do Not Disturb mode',
        action: 'Set do not disturb',
      },
    ],
    default: 'getDevices',
  },
  {
    displayName: 'Device Name or ID',
    name: 'device',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getEchoDevices' },
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['device'],
        operation: ['getDeviceInfo', 'sendCommand', 'setDoNotDisturb', 'getPlayerInfo', 'getPlayerQueue'],
      },
    },
    description:
      'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
  },
  {
    displayName: 'Command',
    name: 'command',
    type: 'options',
    options: [
      { name: 'Forward', value: 'forward' },
      { name: 'Next', value: 'next' },
      { name: 'Pause', value: 'pause' },
      { name: 'Play', value: 'play' },
      { name: 'Previous', value: 'previous' },
      { name: 'Repeat', value: 'repeat' },
      { name: 'Rewind', value: 'rewind' },
      { name: 'Shuffle', value: 'shuffle' },
    ],
    default: 'play',
    displayOptions: {
      show: {
        resource: ['device'],
        operation: ['sendCommand'],
      },
    },
    description: 'Command to send to device',
  },
  {
    displayName: 'Command Value',
    name: 'commandValue',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['device'],
        operation: ['sendCommand'],
      },
    },
    description: 'Optional command value (e.g., for shuffle: true/false)',
  },
  {
    displayName: 'Enabled',
    name: 'enabled',
    type: 'boolean',
    default: true,
    displayOptions: {
      show: {
        resource: ['device'],
        operation: ['setDoNotDisturb'],
      },
    },
    description: 'Whether to enable Do Not Disturb mode',
  },
  {
    displayName: 'Queue Size',
    name: 'queueSize',
    type: 'number',
    default: 50,
    displayOptions: {
      show: {
        resource: ['device'],
        operation: ['getPlayerQueue'],
      },
    },
    description: 'Number of items to retrieve',
  },
];

export async function execute(
  this: IExecuteFunctions,
  alexa: AlexaRemoteExt,
  operation: string,
  itemIndex: number,
): Promise<unknown> {
  if (operation === 'getDevices') {
    return alexa.getDevices();
  }
  if (operation === 'getDeviceInfo') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    return alexa.getDeviceInfo(device);
  }
  if (operation === 'sendCommand') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const command = this.getNodeParameter('command', itemIndex) as string;
    const commandValue = this.getNodeParameter('commandValue', itemIndex, '') as string;
    return alexa.sendCommand(device, command, commandValue || null);
  }
  if (operation === 'setDoNotDisturb') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const enabled = this.getNodeParameter('enabled', itemIndex) as boolean;
    return alexa.setDoNotDisturb(device, enabled);
  }
  if (operation === 'getPlayerInfo') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    return alexa.getPlayerInfo(device);
  }
  if (operation === 'getPlayerQueue') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const queueSize = this.getNodeParameter('queueSize', itemIndex, 50) as number;
    return alexa.getPlayerQueue(device, queueSize);
  }
  return undefined;
}
