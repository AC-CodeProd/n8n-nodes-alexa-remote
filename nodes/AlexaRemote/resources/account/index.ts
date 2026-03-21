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
        resource: ['account'],
      },
    },
    options: [
      {
        name: 'Get Accounts',
        value: 'getAccount',
        description: 'Get account information',
        action: 'Get account',
      },
      {
        name: 'Get Contacts',
        value: 'getContacts',
        description: 'Get Alexa contacts',
        action: 'Get contacts',
      },
      {
        name: 'Get Music Providers',
        value: 'getMusicProviders',
        description: 'Get available music providers',
        action: 'Get music providers',
      },
      {
        name: 'Get Routines',
        value: 'getRoutines',
        description: 'Get all automation routines',
        action: 'Get routines',
      },
    ],
    default: 'getAccount',
  },
];

export async function execute(
  this: IExecuteFunctions,
  alexa: AlexaRemoteExt,
  operation: string,
): Promise<unknown> {
  if (operation === 'getAccount') return alexa.getAccount();
  if (operation === 'getContacts') return alexa.getContacts();
  if (operation === 'getMusicProviders') return alexa.getMusicProviders();
  if (operation === 'getRoutines') return alexa.getAutomationRoutines();
  return undefined;
}
