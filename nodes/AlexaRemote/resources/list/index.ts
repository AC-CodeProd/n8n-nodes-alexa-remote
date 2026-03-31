import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { AlexaRemoteExt } from '../../lib/alexa-remote-ext';

function parseVersionedValue(
  rawValue: string,
  fieldName: string,
  node: ReturnType<IExecuteFunctions['getNode']>,
  itemIndex: number,
): { id: string; version?: number } {
  const [id, versionStr] = rawValue.split('|');

  if (!id) {
    throw new NodeOperationError(node, `${fieldName} is required.`, { itemIndex });
  }

  if (versionStr === undefined || versionStr === '') {
    return { id };
  }

  const version = Number(versionStr);
  if (!Number.isFinite(version)) {
    throw new NodeOperationError(node, `Invalid ${fieldName} value "${rawValue}".`, {
      itemIndex,
      description: 'Expected format: "<id>|<version>" when using expressions.',
    });
  }

  return { id, version };
}

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['list'],
      },
    },
    options: [
      {
        name: 'Add Item',
        value: 'addItem',
        description: 'Add item to a list',
        action: 'Add item to list',
      },
      {
        name: 'Create List',
        value: 'createList',
        description: 'Create a new custom list',
        action: 'Create list',
      },
      {
        name: 'Delete List',
        value: 'deleteList',
        description: 'Delete a list',
        action: 'Delete list',
      },
      {
        name: 'Get Lists',
        value: 'getLists',
        description: 'Get all lists',
        action: 'Get lists',
      },
      {
        name: 'Remove Item',
        value: 'removeItem',
        description: 'Remove item from a list',
        action: 'Remove item from list',
      },
    ],
    default: 'getLists',
  },
  {
    displayName: 'List Name',
    name: 'listName',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['list'],
        operation: ['createList'],
      },
    },
    description: 'Name of the list to create',
  },
  {
    displayName: 'List Name or ID',
    name: 'listId',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'getAlexaLists',
    },
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['list'],
        operation: ['addItem', 'removeItem', 'deleteList'],
      },
    },
    description: 'List to act on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
  },
  {
    displayName: 'Item Text',
    name: 'itemText',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['list'],
        operation: ['addItem'],
      },
    },
    description: 'Text of the item to add',
  },
  {
    displayName: 'Item Name or ID',
    name: 'itemId',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'getAlexaListItems',
      loadOptionsDependsOn: ['listId'],
    },
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['list'],
        operation: ['removeItem'],
      },
    },
    description: 'Item to remove. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
  },
];

export async function execute(
  this: IExecuteFunctions,
  alexa: AlexaRemoteExt,
  operation: string,
  itemIndex: number,
): Promise<unknown> {
  if (operation === 'createList') {
    const listName = this.getNodeParameter('listName', itemIndex) as string;
    return alexa.createList(listName);
  }
  if (operation === 'deleteList') {
    const listRaw = this.getNodeParameter('listId', itemIndex) as string;
    const { id: listId, version } = parseVersionedValue(listRaw, 'List', this.getNode(), itemIndex);
    if (version === undefined) {
      throw new NodeOperationError(this.getNode(), `List version is required to delete list "${listId}".`, {
        itemIndex,
        description: 'Select the list from the dropdown so the version can be resolved automatically.',
      });
    }
    return alexa.deleteList(listId, version);
  }
  if (operation === 'getLists') {
    return alexa.getLists();
  }
  if (operation === 'addItem') {
    const listRaw = this.getNodeParameter('listId', itemIndex) as string;
    const { id: listId } = parseVersionedValue(listRaw, 'List', this.getNode(), itemIndex);
    const itemText = this.getNodeParameter('itemText', itemIndex) as string;
    return alexa.addListItem(listId, itemText);
  }
  if (operation === 'removeItem') {
    const listRaw = this.getNodeParameter('listId', itemIndex) as string;
    const { id: listId } = parseVersionedValue(listRaw, 'List', this.getNode(), itemIndex);
    const itemRaw = this.getNodeParameter('itemId', itemIndex) as string;
    const { id: itemId, version } = parseVersionedValue(itemRaw, 'Item', this.getNode(), itemIndex);
    if (version === undefined) {
      throw new NodeOperationError(this.getNode(), `Item version is required to remove item "${itemId}".`, {
        itemIndex,
        description: 'Select the item from the dropdown so the version can be resolved automatically.',
      });
    }
    return alexa.removeListItem(listId, itemId, version);
  }
  return undefined;
}
