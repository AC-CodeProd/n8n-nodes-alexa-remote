import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { AlexaRemoteExt } from '../../lib/alexa-remote-ext';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['smarthome'],
      },
    },
    options: [
      {
        name: 'Get Devices',
        value: 'getDevices',
        description: 'Get all smart home devices',
        action: 'Get smart home devices',
      },
      {
        name: 'Control Device',
        value: 'controlDevice',
        description: 'Control a smart home device',
        action: 'Control device',
      },
    ],
    default: 'getDevices',
  },
  {
    displayName: 'Entity Name or ID',
    name: 'entity',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getSmarthomeEntities' },
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['smarthome'],
        operation: ['controlDevice'],
      },
    },
    description:
      'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
  },
  {
    displayName: 'Action',
    name: 'action',
    type: 'options',
    options: [
      { name: 'Set Brightness', value: 'setBrightness', action: 'Set brightness of a smarthome device' },
      { name: 'Set Color', value: 'setColor', action: 'Set color of a smarthome device' },
      { name: 'Set Temperature', value: 'setTargetTemperature', action: 'Set temperature of a smarthome device' },
      { name: 'Turn Off', value: 'turnOff', action: 'Turn off a smarthome device' },
      { name: 'Turn On', value: 'turnOn', action: 'Turn on a smarthome device' },
    ],
    default: 'turnOn',
    displayOptions: {
      show: {
        resource: ['smarthome'],
        operation: ['controlDevice'],
      },
    },
  },
  {
    displayName: 'Value',
    name: 'actionValue',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['smarthome'],
        operation: ['controlDevice'],
        action: ['setBrightness', 'setColor', 'setTargetTemperature'],
      },
    },
    description: 'Action value (e.g. brightness level, color hex, temperature)',
  },
];

export async function execute(
  this: IExecuteFunctions,
  alexa: AlexaRemoteExt,
  operation: string,
  itemIndex: number,
): Promise<unknown> {
  if (operation === 'getDevices') {
    return alexa.getSmarthomeDevices();
  }
  if (operation === 'controlDevice') {
    const entity = this.getNodeParameter('entity', itemIndex) as string;
    const action = this.getNodeParameter('action', itemIndex) as string;
    const actionValue = this.getNodeParameter('actionValue', itemIndex, '') as string;
    if (['setBrightness', 'setColor', 'setTargetTemperature'].includes(action) && !actionValue) {
      throw new NodeOperationError(this.getNode(), `Action "${action}" requires a value.`, {
        itemIndex,
      });
    }
    return alexa.controlSmarthomeDevice(
      entity,
      action,
      ['turnOn', 'turnOff'].includes(action) ? undefined : actionValue || undefined,
    );
  }
  return undefined;
}
