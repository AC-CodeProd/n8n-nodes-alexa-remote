import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { AlexaRemoteExt } from '../../lib/alexa-remote-ext';
import { formatNotificationTime } from '../../lib/helpers';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['notification'],
      },
    },
    options: [
      {
        name: 'Get Notifications',
        value: 'getNotifications',
        description: 'Get all notifications',
        action: 'Get notifications',
      },
      {
        name: 'Create Notification',
        value: 'createNotification',
        description: 'Create a new notification (alarm or reminder)',
        action: 'Create notification',
      },
      {
        name: 'Delete Notification',
        value: 'deleteNotification',
        description: 'Delete a notification',
        action: 'Delete notification',
      },
    ],
    default: 'getNotifications',
  },
  {
    displayName: 'Device Name or ID',
    name: 'device',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getEchoDevicesOnly' },
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['notification'],
        operation: ['createNotification'],
      },
    },
    description:
      'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
  },
  {
    displayName: 'Type',
    name: 'notificationType',
    type: 'options',
    options: [
      { name: 'Alarm', value: 'Alarm' },
      { name: 'Reminder', value: 'Reminder' },
    ],
    default: 'Reminder',
    displayOptions: {
      show: {
        resource: ['notification'],
        operation: ['createNotification'],
      },
    },
    description: 'Type of notification',
  },
  {
    displayName: 'Label',
    name: 'label',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['notification'],
        operation: ['createNotification'],
      },
    },
    description: 'Notification label/message',
  },
  {
    displayName: 'Time',
    name: 'time',
    type: 'dateTime',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['notification'],
        operation: ['createNotification'],
      },
    },
    description: 'Date and time for the notification',
  },
  {
    displayName: 'Notification Name or ID',
    name: 'notificationId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getNotificationsList' },
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['notification'],
        operation: ['deleteNotification'],
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
  if (operation === 'getNotifications') {
    return alexa.getNotifications();
  }

  if (operation === 'createNotification') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    if (!device) {
      throw new NodeOperationError(
        this.getNode(),
        'Device is required — select an Echo device from the dropdown or provide a serial number via an expression.',
        { itemIndex },
      );
    }
    const notifType = this.getNodeParameter('notificationType', itemIndex) as 'Alarm' | 'Reminder';
    const label = this.getNodeParameter('label', itemIndex) as string;
    const time = this.getNodeParameter('time', itemIndex) as string;
    let formattedTime: string;
    try {
      formattedTime = formatNotificationTime(time);
    } catch {
      throw new NodeOperationError(this.getNode(), `Invalid notification time: "${time}"`, {
        itemIndex,
        description: 'Use ISO 8601 format, e.g. 2026-03-20T08:00:00.000',
      });
    }
    return alexa.createNotification(device, notifType, label, formattedTime);
  }

  if (operation === 'deleteNotification') {
    const notificationId = this.getNodeParameter('notificationId', itemIndex) as string;
    return alexa.deleteNotification(notificationId);
  }
  return undefined;
}
