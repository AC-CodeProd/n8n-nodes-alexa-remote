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
        resource: ['conversation'],
      },
    },
    options: [
      {
        name: 'Get Conversations',
        value: 'getConversations',
        description: 'Get Alexa conversations',
        action: 'Get conversations',
      },
      {
        name: 'Send Message',
        value: 'sendMessage',
        description: 'Send a text message to a conversation',
        action: 'Send message',
      },
    ],
    default: 'getConversations',
  },
  {
    displayName: 'Unread Only',
    name: 'unread',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: ['conversation'],
        operation: ['getConversations'],
      },
    },
    description: 'Whether to return only unread conversations',
  },
  {
    displayName: 'Conversation ID',
    name: 'conversationId',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['conversation'],
        operation: ['sendMessage'],
      },
    },
    description: 'ID of the conversation (from Get Conversations)',
  },
  {
    displayName: 'Message',
    name: 'message',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['conversation'],
        operation: ['sendMessage'],
      },
    },
    description: 'Text message to send',
  },
];

export async function execute(
  this: IExecuteFunctions,
  alexa: AlexaRemoteExt,
  operation: string,
  itemIndex: number,
): Promise<unknown> {
  if (operation === 'getConversations') {
    const unread = this.getNodeParameter('unread', itemIndex, false) as boolean;
    return alexa.getConversations({ unread });
  }
  if (operation === 'sendMessage') {
    const conversationId = this.getNodeParameter('conversationId', itemIndex) as string;
    const message = this.getNodeParameter('message', itemIndex) as string;
    return alexa.sendTextMessage(conversationId, message);
  }
  return undefined;
}
