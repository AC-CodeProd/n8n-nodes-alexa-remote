import { existsSync } from 'node:fs';
import type {
  ICredentialTestFunctions,
  ICredentialsDecrypted,
  IDataObject,
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeCredentialTestResult,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { AlexaRemoteExt, createAlexaFromCredentials } from './lib/alexa-remote-ext';
import { readCookieFile } from './lib/cookie-crypto';
import properties, { account, auth, bluetooth, conversation, device, interaction, list, notification, routine, smarthome } from './properties';

const CACHE_TTL = 5 * 60 * 1000;
type CacheEntry<T> = { data: T; ts: number };
const deviceOptionsCache = new Map<string, CacheEntry<INodePropertyOptions[]>>();
const deviceOnlyOptionsCache = new Map<string, CacheEntry<INodePropertyOptions[]>>();
const routineOptionsCache = new Map<string, CacheEntry<INodePropertyOptions[]>>();
function getCacheKey(credentials: Record<string, unknown>): string {
  return `${credentials.alexaServiceHost as string}|${credentials.amazonPage as string}|${(credentials.cookieFile as string) ?? ''}`;
}

function buildLoadOptionsErrorOption(error: unknown): INodePropertyOptions[] {
  const message = error instanceof Error ? error.message : String(error);
  return [{ name: `Unavailable: ${message}`, value: '' }];
}

async function getEchoDeviceOptions(
  credentials: Record<string, unknown>,
  includeGroups: boolean,
): Promise<INodePropertyOptions[]> {
  const key = getCacheKey(credentials);
  const cache = includeGroups ? deviceOptionsCache : deviceOnlyOptionsCache;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const alexa = await createAlexaFromCredentials(credentials);
  try {
    const devices = await alexa.getDevices();
    const deviceOptions: INodePropertyOptions[] = devices.map((d) => ({
      name: `${d.accountName} (${d.deviceFamily})`,
      value: d.serialNumber,
    }));

    let data = deviceOptions;
    if (includeGroups) {
      const groups = await alexa.getMultiRoomGroups().catch(() => []);
      const groupOptions: INodePropertyOptions[] = groups.map((g) => ({
        name: `[Group] ${g.name}`,
        value: g.id,
      }));
      data = [...deviceOptions, ...groupOptions];
    }

    cache.set(key, { data, ts: Date.now() });
    return data;
  } finally {
    alexa.disconnect();
  }
}

export class AlexaRemote implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Alexa Remote',
    name: 'alexaRemote',
    icon: 'file:alexa.svg',
    group: ['transform'],
    version: 1,
    usableAsTool: true,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with Amazon Alexa API',
    defaults: {
      name: 'Alexa Remote',
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: 'alexaRemoteApi',
        required: true,
        testedBy: 'alexaRemoteApiTest',
      },
    ],
    properties: properties,
  };

  methods = {
    loadOptions: {
      async getEchoDevices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          const credentials = await this.getCredentials('alexaRemoteApi');
          return await getEchoDeviceOptions(credentials as Record<string, unknown>, true);
        } catch (error) {
          return buildLoadOptionsErrorOption(error);
        }
      },

      async getEchoDevicesOnly(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          const credentials = await this.getCredentials('alexaRemoteApi');
          return await getEchoDeviceOptions(credentials as Record<string, unknown>, false);
        } catch (error) {
          return buildLoadOptionsErrorOption(error);
        }
      },

      async getRoutinesList(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          const credentials = await this.getCredentials('alexaRemoteApi');
          const creds = credentials as Record<string, unknown>;
          const key = getCacheKey(creds);
          const cached = routineOptionsCache.get(key);
          if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

          const alexa = await createAlexaFromCredentials(creds);
          const routines = await alexa.getAutomationRoutines();
          alexa.disconnect();
          const data = routines

            .filter((r) => r.automationId)
            .map((r) => ({
              name: r.name || r.automationId,
              value: r.automationId,
            }));
          routineOptionsCache.set(key, { data, ts: Date.now() });
          return data;
        } catch (error) {
          return buildLoadOptionsErrorOption(error);
        }
      },

      async getSmarthomeEntities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          const credentials = await this.getCredentials('alexaRemoteApi');
          const alexa = await createAlexaFromCredentials(credentials as Record<string, unknown>);
          const entities = await alexa.getSmarthomeDevices();
          alexa.disconnect();
          return entities
            .filter((e) => e.friendlyName)
            .map((e) => {

              const id = (e.legacyAppliance?.applianceId ?? e.applianceId ?? e.endpointId ?? e.id) as string;
              const desc = e.legacyAppliance?.friendlyDescription ?? e.friendlyDescription ?? '';
              return {
                name: e.friendlyName,
                value: id,
                description: desc,
              };
            })
            .filter((e) => e.value);
        } catch (error) {
          return buildLoadOptionsErrorOption(error);
        }
      },

      async getNotificationsList(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          const credentials = await this.getCredentials('alexaRemoteApi');
          const alexa = await createAlexaFromCredentials(credentials as Record<string, unknown>);
          const notifications = await alexa.getNotifications();
          alexa.disconnect();
          return notifications.map((n) => {
            const label = n.reminderLabel ?? `[${n.type}]`;
            const date = n.alarmTime ? new Date(n.alarmTime).toLocaleString() : '?';
            return {
              name: `${label} — ${date}`,
              value: n.id,
              description: `Device: ${n.deviceSerialNumber} | Status: ${n.status}`,
            };
          });
        } catch (error) {
          return buildLoadOptionsErrorOption(error);
        }
      },

      async getAlexaLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          const credentials = await this.getCredentials('alexaRemoteApi');
          const alexa = await createAlexaFromCredentials(credentials as Record<string, unknown>);
          const lists = await alexa.getLists();
          alexa.disconnect();
          return (lists as Array<{ listName?: string; name?: string; listType?: string; listId: string; version?: number }>).map((l) => ({
            name: l.listName || l.name || l.listType || l.listId,
            value: `${l.listId}|${l.version ?? 1}`,
          }));
        } catch (error) {
          return buildLoadOptionsErrorOption(error);
        }
      },

      async getAlexaListItems(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          const listRaw = this.getCurrentNodeParameter('listId') as string;
          if (!listRaw) return [{ name: '— Select a List First —', value: '' }];
          const [listId] = listRaw.split('|');
          const credentials = await this.getCredentials('alexaRemoteApi');
          const alexa = await createAlexaFromCredentials(credentials as Record<string, unknown>);
          const items = await alexa.getListItems(listId);
          alexa.disconnect();
          return items
            .filter((i) => !i.completed)
            .map((i) => ({
              name: i.value,
              value: `${i.id}|${i.version}`,
            }));
        } catch (error) {
          return buildLoadOptionsErrorOption(error);
        }
      },
    },

    credentialTest: {
      async alexaRemoteApiTest(
        this: ICredentialTestFunctions,
        credential: ICredentialsDecrypted,
      ): Promise<INodeCredentialTestResult> {
        const creds = credential.data as Record<string, unknown>;

        const cookiePath = creds.cookieFile as string;

        if (!cookiePath) {
          return {
            status: 'Error',
            message: 'Cookie File Path is required',
          };
        }

        if (existsSync(cookiePath)) {
          let alexa: AlexaRemoteExt | undefined;
          try {
            JSON.parse(readCookieFile(cookiePath));
            alexa = await createAlexaFromCredentials(creds, false);
            await alexa.getAccount();
            return {
              status: 'OK',
              message: `Alexa authentication is valid and reachable using cookie file: ${cookiePath}`,
            };
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
              status: 'Error',
              message: `Alexa authentication failed: ${message}`,
            };
          } finally {
            alexa?.disconnect();
          }
        }

        return {
          status: 'Error',
          message: `No cookie file found at "${cookiePath}". Run Auth → Authenticate first.`,
        };
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    const credentials = await this.getCredentials('alexaRemoteApi');

    if (resource === 'auth') {
      return await auth.execute.call(this, credentials as Record<string, unknown>);
    }

    auth.guardCookieFile.call(this, credentials as Record<string, unknown>);

    let alexa: AlexaRemoteExt;
    try {
        alexa = await createAlexaFromCredentials(credentials as Record<string, unknown>, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new NodeOperationError(
        this.getNode(),
        `Alexa initialization failed: ${message}`,
        {
          description:
            'Ensure your cookie file is valid and not expired. Run “Auth → Authenticate” to refresh your session.',
        },
      );
    }

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        let responseData: unknown;
        const creds = credentials as Record<string, unknown>;

        if (resource === 'interaction') {
          responseData = await interaction.execute.call(this, alexa, operation, itemIndex, creds);
        } else if (resource === 'routine') {
          responseData = await routine.execute.call(this, alexa, operation, itemIndex);
        } else if (resource === 'device') {
          responseData = await device.execute.call(this, alexa, operation, itemIndex);
        } else if (resource === 'account') {
          responseData = await account.execute.call(this, alexa, operation);
        } else if (resource === 'smarthome') {
          responseData = await smarthome.execute.call(this, alexa, operation, itemIndex);
        } else if (resource === 'notification') {
          responseData = await notification.execute.call(this, alexa, operation, itemIndex);
        } else if (resource === 'bluetooth') {
          responseData = await bluetooth.execute.call(this, alexa, operation, itemIndex);
        } else if (resource === 'conversation') {
          responseData = await conversation.execute.call(this, alexa, operation, itemIndex);
        } else if (resource === 'list') {
          responseData = await list.execute.call(this, alexa, operation, itemIndex);
        } else {
          throw new NodeOperationError(this.getNode(), `Unknown resource: "${resource}"`);
        }

        if (responseData === null || responseData === undefined) {
          responseData = { success: true };
        }
        const executionData = this.helpers.constructExecutionMetaData(
          this.helpers.returnJsonArray(responseData as IDataObject),
          { itemData: { item: itemIndex } },
        );

        returnData.push(...executionData);
      } catch (error) {
        if (this.continueOnFail()) {
          const message = error instanceof Error ? error.message : String(error);

          returnData.push({
            json: {
              error: message,
            },
            pairedItem: { item: itemIndex },
          });
          continue;
        }

        alexa.disconnect();
        throw new NodeOperationError(this.getNode(), error, {
          itemIndex,
        });
      }
    }

    alexa.disconnect();
    return [returnData];
  }
}
