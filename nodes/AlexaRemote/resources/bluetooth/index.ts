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
        resource: ['bluetooth'],
      },
    },
    options: [
      {
        name: 'Get State',
        value: 'getState',
        description: 'Get paired Bluetooth devices and connection state',
        action: 'Get bluetooth state',
      },
      {
        name: 'Connect',
        value: 'connect',
        description: 'Connect to a paired Bluetooth device',
        action: 'Connect bluetooth device',
      },
      {
        name: 'Disconnect',
        value: 'disconnect',
        description: 'Disconnect the current Bluetooth device',
        action: 'Disconnect bluetooth device',
      },
      {
        name: 'Unpair',
        value: 'unpair',
        description: 'Unpair a Bluetooth device',
        action: 'Unpair bluetooth device',
      },
    ],
    default: 'getState',
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
        resource: ['bluetooth'],
        operation: ['connect', 'disconnect', 'unpair'],
      },
    },
    description:
      'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
  },
  {
    displayName: 'Bluetooth MAC Address',
    name: 'mac',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['bluetooth'],
        operation: ['connect', 'unpair'],
      },
    },
    description: 'MAC address of the Bluetooth device (e.g. AA:BB:CC:DD:EE:FF)',
  },
  {
    displayName: 'Use Cache',
    name: 'cached',
    type: 'boolean',
    default: true,
    displayOptions: {
      show: {
        resource: ['bluetooth'],
        operation: ['getState'],
      },
    },
    description: 'Whether to use the cached Bluetooth state',
  },
];

export async function execute(
  this: IExecuteFunctions,
  alexa: AlexaRemoteExt,
  operation: string,
  itemIndex: number,
): Promise<unknown> {
  if (operation === 'getState') {
    const cached = this.getNodeParameter('cached', itemIndex, true) as boolean;
    return alexa.getBluetooth(cached);
  }
  if (operation === 'connect') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const mac = this.getNodeParameter('mac', itemIndex) as string;
    return alexa.connectBluetooth(device, mac);
  }
  if (operation === 'disconnect') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    return alexa.disconnectBluetooth(device);
  }
  if (operation === 'unpair') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const mac = this.getNodeParameter('mac', itemIndex) as string;
    return alexa.unpairBluetooth(device, mac);
  }
  return undefined;
}
