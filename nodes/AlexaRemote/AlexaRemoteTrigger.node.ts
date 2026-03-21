import type {
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  ITriggerFunctions,
  ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { createAlexaFromCredentials } from './lib/alexa-remote-ext';
import type { AlexaPushEventType } from './lib/types';

export class AlexaRemoteTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Alexa Remote Trigger',
    name: 'alexaRemoteTrigger',
    icon: 'file:alexa.svg',
    group: ['trigger'],
    version: 1,
    usableAsTool: true,
    description: 'Starts a workflow when an Alexa WebSocket push event occurs',
    defaults: {
      name: 'Alexa Remote Trigger',
    },
    inputs: [],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: 'alexaRemoteApi',
        required: true,
        testedBy: 'alexaRemoteApiTest',
      },
    ],
    properties: [
      {
        displayName: 'Event',
        name: 'event',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'All Messages',
            value: 'ws-message',
            description: 'Fires on every WebSocket event received from Alexa (aggregator)',
          },
          {
            name: 'All Unknown Messages',
            value: 'ws-unknown-message',
            description: 'Fires on every unrecognized WebSocket message from Alexa',
          },
          {
            name: 'Audio Player State Change',
            value: 'ws-audio-player-state-change',
            description: 'Fires when media playback state changes on an Echo device',
          },
          {
            name: 'Bluetooth State Change',
            value: 'ws-bluetooth-state-change',
            description: 'Fires when a Bluetooth connection state changes on an Echo device',
          },
          {
            name: 'Device Activity',
            value: 'ws-device-activity',
            description: 'Fires when an Echo device registers an activity (voice command, etc.)',
          },
          {
            name: 'Device Connection Change',
            value: 'ws-device-connection-change',
            description: 'Fires when an Echo device goes online or offline',
          },
          {
            name: 'Media Change',
            value: 'ws-media-change',
            description: 'Fires when the currently playing media changes',
          },
          {
            name: 'Notification Change',
            value: 'ws-notification-change',
            description: 'Fires when an Alexa notification (alarm, reminder) changes',
          },
          {
            name: 'Todo / List Change',
            value: 'ws-todo-change',
            description: 'Fires when an Alexa shopping or to-do list changes',
          },
          {
            name: 'Volume Change',
            value: 'ws-volume-change',
            description: 'Fires when the volume of an Echo device changes',
          },
        ],
        default: 'ws-device-activity',
        description: 'The Alexa WebSocket push event to listen for',
      },
    ],
  };

  async trigger(this: ITriggerFunctions): Promise<ITriggerResponse | undefined> {
    const credentials = await this.getCredentials('alexaRemoteApi');
    const event = this.getNodeParameter('event') as AlexaPushEventType;

    const alexa = await createAlexaFromCredentials(
      credentials as Record<string, unknown>,
      true,
    );

    try {
      const handler = (payload: unknown): void => {
        const item: INodeExecutionData = {
          json: {
            event,
            payload: (payload ?? {}) as Record<string, unknown>,
            timestamp: new Date().toISOString(),
          },
        };
        this.emit([[item]]);
      };

      alexa.onPushEvent(event, handler);

      return {
        closeFunction: async () => {
          alexa.offPushEvent(event, handler);
          alexa.disconnect();
        },
        manualTriggerFunction: async () => {
          this.emit([[{
            json: {
              event,
              payload: { type: 'manual-test', timestamp: Date.now() },
              timestamp: new Date().toISOString(),
            },
          }]]);
        },
      };
    } catch (error) {
      alexa.disconnect();
      throw error;
    }
  }
}
