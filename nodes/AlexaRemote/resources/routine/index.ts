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
        resource: ['routine'],
      },
    },
    options: [
      {
        name: 'Execute Routine',
        value: 'executeRoutine',
        description: 'Execute an existing Alexa routine',
        action: 'Execute routine',
      },
    ],
    default: 'executeRoutine',
  },
  {
    displayName: 'Routine Name or ID',
    name: 'routineId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getRoutinesList' },
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['routine'],
        operation: ['executeRoutine'],
      },
    },
    description:
      'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
  },
];

export async function execute(
  this: IExecuteFunctions,
  alexa: AlexaRemoteExt,
  operation: string,
  itemIndex: number,
): Promise<unknown> {
  if (operation === 'executeRoutine') {
    const routineId = this.getNodeParameter('routineId', itemIndex) as string;
    return alexa.executeRoutine(routineId);
  }
  return undefined;
}
