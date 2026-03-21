import type { INodeProperties } from 'n8n-workflow';

export * as account from '../resources/account';
export * as auth from '../resources/auth';
export * as bluetooth from '../resources/bluetooth';
export * as conversation from '../resources/conversation';
export * as device from '../resources/device';
export * as interaction from '../resources/interaction';
export * as list from '../resources/list';
export * as notification from '../resources/notification';
export * as routine from '../resources/routine';
export * as smarthome from '../resources/smarthome';

import { description as accountDesc } from '../resources/account';
import { description as authDesc } from '../resources/auth';
import { description as bluetoothDesc } from '../resources/bluetooth';
import { description as conversationDesc } from '../resources/conversation';
import { description as deviceDesc } from '../resources/device';
import { description as interactionDesc } from '../resources/interaction';
import { description as listDesc } from '../resources/list';
import { description as notificationDesc } from '../resources/notification';
import { description as routineDesc } from '../resources/routine';
import { description as smarthomeDesc } from '../resources/smarthome';

export const resourceSelector: INodeProperties = {
  displayName: 'Resource',
  name: 'resource',
  type: 'options',
  noDataExpression: true,
  options: [
    { name: 'Account', value: 'account' },
    { name: 'Auth', value: 'auth' },
    { name: 'Bluetooth', value: 'bluetooth' },
    { name: 'Conversation', value: 'conversation' },
    { name: 'Device', value: 'device' },
    { name: 'Interaction', value: 'interaction' },
    { name: 'List', value: 'list' },
    { name: 'Notification', value: 'notification' },
    { name: 'Routine', value: 'routine' },
    { name: 'Smarthome', value: 'smarthome' },
  ],
  default: 'interaction',
};

export const properties: INodeProperties[] = [
  resourceSelector,
  ...authDesc,
  ...accountDesc,
  ...bluetoothDesc,
  ...conversationDesc,
  ...deviceDesc,
  ...interactionDesc,
  ...listDesc,
  ...notificationDesc,
  ...routineDesc,
  ...smarthomeDesc,
];

export default properties;
