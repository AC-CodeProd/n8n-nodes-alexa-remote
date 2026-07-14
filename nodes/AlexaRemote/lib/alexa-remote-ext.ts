import AlexaRemote2 from 'alexa-remote2';
import AlexaCookie2 from 'alexa-cookie2';
import { EventEmitter } from 'node:events';
import { request as httpsRequest } from 'node:https';
import { isEncryptedEnvelope, readCookieFile, writeCookieFile } from './cookie-crypto';
import { buildMusicNode, buildSingleSequence, buildSpeakNode, buildVolumeNode } from './helpers';
import type {
  AlexaBluetoothState,
  AlexaConversation,
  AlexaDevice,
  AlexaInitOptions,
  AlexaList,
  AlexaListItem,
  AlexaMultiRoomGroup,
  AlexaNotification,
  AlexaPlayerInfo,
  AlexaPlayerQueue,
  AlexaPushEvent,
  AlexaPushEventType,
  AlexaRoutine,
  AlexaSequenceNode,
  AlexaSmarthomeDevice,
} from './types';

type AlexaCb = (err: Error | null, result: unknown) => void;

const originalJsonParse = JSON.parse;

const lenientJsonParse = function (this: typeof JSON, text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown) {
  if (text == null || (typeof text === 'string' && text.trim() === '')) {
    return {};
  }
  return originalJsonParse.call(this, text, reviver as Parameters<typeof originalJsonParse>[1]);
} as typeof JSON.parse;

async function withLenientJsonParse<T>(fn: () => Promise<T>): Promise<T> {
  JSON.parse = lenientJsonParse;
  try {
    return await fn();
  } finally {
    JSON.parse = originalJsonParse;
  }
}

interface NodeWithPayload {
  operationPayload?: { deviceSerialNumber?: string };
  nodesToExecute?: Array<{ operationPayload?: { deviceSerialNumber?: string } }>;
}

interface AlexaInternal {
  on(event: string, handler: (...args: unknown[]) => void): void;
  init(options: AlexaInitOptions, callback: (error: Error | null) => void): void;
  getDevices(callback: AlexaCb): void;
  sendCommand(device: string, command: string, value: string | null, callback: AlexaCb): void;
  setDoNotDisturb(device: string, enabled: boolean, callback: AlexaCb): void;
  getAutomationRoutines(callback: AlexaCb): void;
  executeAutomationRoutine(serial: string | null, routine: AlexaRoutine, callback: AlexaCb): void;
  sendSequenceCommand(device: unknown, sequenceOrCommand: unknown, callbackOrValue: unknown, callback?: AlexaCb): void;
  playMusicProvider(device: string, provider: string, search: string, callback: AlexaCb): void;
  getSmarthomeDevicesV2(callback: AlexaCb): void;
  executeSmarthomeDeviceAction(entity: string, params: Record<string, string>, callback: AlexaCb): void;
  getNotifications(callback: AlexaCb): void;
  createNotificationObject(device: string, type: string, label: string, date: Date, status: string, a: null, b: null): unknown;
  createNotification(notification: unknown, callback: AlexaCb): void;
  deleteNotification(notification: Record<string, unknown>, callback: AlexaCb): void;
  getListsV2(callback: AlexaCb): void;
  generateCookie(email: string | undefined, password: string | undefined, callback: AlexaCb): void;
  addListItem(listType: string, text: string, callback: AlexaCb): void;
  getListItemsV2(listId: string, options: object, callback: AlexaCb): void;
  deleteListItem(listId: string, itemId: string, options: object, callback: AlexaCb): void;
  getAccount(callback: AlexaCb): void;
  getContacts(callback: AlexaCb): void;
  getMusicProviders(callback: AlexaCb): void;
  getBluetooth(cached: boolean, callback: AlexaCb): void;
  connectBluetooth(device: string, mac: string, callback: AlexaCb): void;
  disconnectBluetooth(device: string, empty: string, callback: AlexaCb): void;
  unpaireBluetooth(device: string, mac: string, callback: AlexaCb): void;
  getAllDeviceVolumes(callback: AlexaCb): void;
  getPlayerInfo(device: string, callback: AlexaCb): void;
  getPlayerQueue(device: string, size: number, callback: AlexaCb): void;
  getConversations(options: object, callback: AlexaCb): void;
  sendTextMessage(convId: string, text: string, callback: AlexaCb): void;
  getWholeHomeAudioGroups(callback: AlexaCb): void;
  httpsGet(url: string, callback: AlexaCb, options?: { method?: string; data?: string }): void;
  serialNumbers?: Record<string, unknown>;
  initDeviceState(callback: () => void): void;
  find(serial: string): AlexaDevice | null | undefined;
  _options?: { amazonPage?: string; formerRegistrationData?: unknown; cookie?: unknown };
  stop?(): void;
}

export class AlexaRemoteExt extends (EventEmitter as new () => EventEmitter) {
  private readonly alexa: AlexaInternal;
  private initialized = false;

  constructor() {
    super();
    this.alexa = new AlexaRemote2() as unknown as AlexaInternal;

    this.alexa.generateCookie = (_email, _password, callback) => {
      setImmediate(() =>
        callback(
          new Error(
            'Amazon rejected the stored session during headless validation and an interactive login would be required. Run Auth -> Authenticate again.',
          ),
          null,
        ),
      );
    };

    for (const evt of [
      'ws-device-activity',
      'ws-volume-change',
      'ws-bluetooth-state-change',
      'ws-device-connection-change',
      'ws-notification-change',
      'ws-todo-change',
      'ws-audio-player-state-change',
      'ws-media-change',
      'ws-unknown-message',
    ] as const) {
      this.alexa.on(evt, (payload: unknown) => {
        const event = payload as AlexaPushEvent;
        this.emit(evt, event);
        this.emit('ws-message', { ...event, eventType: evt as AlexaPushEventType });
      });
    }

    this.alexa.on('cookie', (...args: unknown[]) => {
      this.emit('cookie', ...args);
    });
  }

  async init(options: AlexaInitOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.alexa.init(options, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          this.initialized = true;
          resolve();
        }
      });
    });
  }

  startProxyAuth(
    options: AlexaInitOptions,
    loginTimeoutMs: number,
    onProxyReady: (url: string) => void,
  ): Promise<Record<string, unknown>> {
    let timerHandle: ReturnType<typeof setTimeout> | undefined;
    let proxyCallbackFired = false;
    let settled = false;

    const cleanup = () => {
      if (timerHandle) {
        clearTimeout(timerHandle);
      }
      stopLoginProxyServer();
    };

    const settle = (
      type: 'resolve' | 'reject',
      value: Record<string, unknown> | Error,
      resolve: (result: Record<string, unknown>) => void,
      reject: (error: Error) => void,
    ) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (type === 'resolve') {
        resolve(value as Record<string, unknown>);
      } else {
        reject(value as Error);
      }
    };

    return withLenientJsonParse(() => new Promise((resolve, reject) => {
      timerHandle = setTimeout(() => {
        settle(
          'reject',
          new Error(`Authentication timeout after ${loginTimeoutMs / 60000} minutes.`),
          resolve,
          reject,
        );
      }, loginTimeoutMs);

      const config = {
        proxyOnly: true,
        setupProxy: true,
        proxyOwnIp: options.proxyOwnIp,
        proxyPort: options.proxyPort,
        proxyListenBind: '0.0.0.0',
        alexaServiceHost: options.alexaServiceHost,
        amazonPage: options.amazonPage,
        acceptLanguage: options.acceptLanguage,
        proxyLogLevel: 'info',
      };

      try {
        AlexaCookie2.generateAlexaCookie(
          undefined,
          undefined,
          config,
          (err: Error | null, result: unknown) => {
            if (settled) return;

            if (err) {
              const isProxyReady = /please open http:\/\//i.test(err.message);
              if (!proxyCallbackFired && isProxyReady) {
                proxyCallbackFired = true;
                const match = /http:\/\/[^\s)]+/.exec(err.message);
                onProxyReady(match ? match[0] : `http://${options.proxyOwnIp}:${options.proxyPort}/`);
                return;
              }

              settle('reject', err, resolve, reject);
              return;
            }

            const payload = (result ?? {}) as Record<string, unknown>;
            if (payload.cookie || payload.loginCookie) {
              settle('resolve', payload, resolve, reject);
            } else {
              settle(
                'reject',
                new Error('Authentication completed but Amazon returned no cookie payload. Try again.'),
                resolve,
                reject,
              );
            }
          },
        );
      } catch (error) {
        settle(
          'reject',
          error instanceof Error ? error : new Error(String(error)),
          resolve,
          reject,
        );
      }
    }));
  }

  private assertInit(): void {
    if (!this.initialized) {
      throw new Error('AlexaRemoteExt not initialized — call init() first');
    }
  }

  async getDevices(): Promise<AlexaDevice[]> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getDevices((error: Error | null, result) => {
        if (error) reject(error);
        else resolve(((result as Record<string, unknown>)?.devices ?? result) as unknown as AlexaDevice[]);
      });
    });
  }

  async getDeviceInfo(serialNumber: string): Promise<AlexaDevice | undefined> {
    this.assertInit();
    const exactMatch = this.lookupDevice(serialNumber);
    if (exactMatch) {
      return exactMatch;
    }

    const devices = await this.getDevices();
    const normalized = serialNumber.trim().toLowerCase();
    return devices.find(
      (d) =>
        d.serialNumber === serialNumber ||
        d.accountName?.trim().toLowerCase() === normalized,
    );
  }

  async sendCommand(device: string, command: string, value: string | null = null): Promise<unknown> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.sendCommand(device, command, value, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async setDoNotDisturb(device: string, enabled: boolean): Promise<unknown> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.setDoNotDisturb(device, enabled, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async getAutomationRoutines(): Promise<AlexaRoutine[]> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getAutomationRoutines((error: Error | null, result) => {
        if (error) reject(error);

        else if (Array.isArray(result)) resolve(result as AlexaRoutine[]);
        else if ((result as Record<string, unknown>)?.automations) resolve((result as Record<string, unknown>).automations as unknown as AlexaRoutine[]);
        else if (result && typeof result === 'object') resolve(Object.values(result) as AlexaRoutine[]);
        else resolve([]);
      });
    });
  }

  async executeRoutine(routineIdOrUtterance: string): Promise<unknown> {
    this.assertInit();
    const routines = await this.getAutomationRoutines();

    const routine = routines.find(
      (r) =>
        r.automationId === routineIdOrUtterance ||
        r.name?.toLowerCase() === routineIdOrUtterance.toLowerCase(),
    );

    if (!routine) {
      throw new Error(
        `Routine not found: "${routineIdOrUtterance}". Use Get Routines to list available routines.`,
      );
    }

    return new Promise((resolve, reject) => {

      const serialNumbers = this.alexa.serialNumbers ?? {};
      const serial = Object.keys(serialNumbers)[0] ?? null;
      this.alexa.executeAutomationRoutine(serial, routine, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async sendSequenceCommand(sequence: AlexaSequenceNode): Promise<unknown> {
    this.assertInit();

    const serial = this._extractDeviceSerialFromSequence(sequence) ?? this._getFirstDeviceSerial();
    const serialNumbers = this.alexa.serialNumbers ?? {};

    let devOrSerial: unknown = (serial && serialNumbers[serial]) ?? serial;

    if (!devOrSerial) {

      await new Promise<void>((res) => this.alexa.initDeviceState(res));
      devOrSerial = this._getFirstDeviceSerial();
    }

    if (!devOrSerial) {
      throw new Error(
        'No Alexa device found. Ensure your devices are online and your Alexa account is properly initialized.',
      );
    }

    return new Promise((resolve, reject) => {
      this.alexa.sendSequenceCommand(devOrSerial, sequence, (error: Error | null, result: unknown) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async sendSequenceCommandStr(device: string, command: string, value: string | null = null): Promise<unknown> {
    this.assertInit();
    const serialNumbers = this.alexa.serialNumbers ?? {};
    const devOrSerial: unknown = (device && serialNumbers[device]) ?? device;
    if (!devOrSerial) {
      throw new Error(`Device "${device}" not found in your Alexa account.`);
    }
    return new Promise((resolve, reject) => {
      this.alexa.sendSequenceCommand(devOrSerial, command, value, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  private _extractDeviceSerialFromSequence(seq: AlexaSequenceNode): string | null {
    const node = (seq.startNode ?? null) as NodeWithPayload | null;
    if (!node) return null;

    if (node.operationPayload?.deviceSerialNumber) {
      const s = node.operationPayload?.deviceSerialNumber;
      if (s && s !== 'ALEXA_CURRENT_DSN') return s;
    }

    const first = node.nodesToExecute?.[0];
    if (first?.operationPayload?.deviceSerialNumber) {
      const s = first.operationPayload?.deviceSerialNumber;
      if (s && s !== 'ALEXA_CURRENT_DSN') return s;
    }
    return null;
  }

  private _getFirstDeviceSerial(): string | undefined {
    const serials = Object.keys(this.alexa.serialNumbers ?? {});
    return serials[0];
  }

  async speak(
    device: string,
    text: string,
    locale: string,
    type: 'regular' | 'ssml' | 'announcement' = 'regular',
  ): Promise<unknown> {
    if (type === 'announcement') {
      return this.sendAnnouncement([device], text, locale);
    }
    const sequence = buildSingleSequence(buildSpeakNode(device, text, locale));
    return this.sendSequenceCommand(sequence);
  }

  async setVolume(device: string, volume: number, locale = 'en-US'): Promise<unknown> {
    this.assertInit();
    return this.sendSequenceCommand(buildSingleSequence(buildVolumeNode(device, volume, locale)));
  }

  async playMusic(
    device: string,
    provider: string,
    search: string,
    locale = 'en-US',
    duration = 0,
  ): Promise<unknown> {
    this.assertInit();

    if (duration > 0) {
      return this.sendSequenceCommand(
        buildSingleSequence(buildMusicNode(device, provider, search, locale, duration)),
      );
    }

    return new Promise((resolve, reject) => {
      this.alexa.playMusicProvider(device, provider, search, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async sendAnnouncement(devices: string[], text: string, locale: string): Promise<unknown> {
    this.assertInit();
    if (devices.length === 0) {
      throw new Error('At least one Alexa device is required to send an announcement.');
    }

    const targetDevices = devices.map((serial) => {
      const dev = this.alexa.find(serial);
      if (!dev) throw new Error(`Unknown device serial: "${serial}"`);
      return { deviceSerialNumber: dev.serialNumber, deviceTypeId: dev.deviceType };
    });

    const firstDev = this.alexa.find(devices[0]);
    const customerId: string = firstDev?.deviceOwnerCustomerId ?? 'ALEXA_CUSTOMER_ID';

    const sequence = {
      '@type': 'com.amazon.alexa.behaviors.model.Sequence',
      startNode: {
        '@type': 'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode',
        type: 'AlexaAnnouncement',
        operationPayload: {
          expireAfter: 'PT5S',
          content: [
            {
              locale,
              display: { title: '', body: text },
              speak: { type: 'text', value: text },
            },
          ],
          target: {
            customerId,
            devices: targetDevices,
          },
        },
      },
    };

    return new Promise((resolve, reject) => {
      this.alexa.sendSequenceCommand(devices[0], sequence, (error: Error | null, result: unknown) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async getSmarthomeDevices(): Promise<AlexaSmarthomeDevice[]> {
    this.assertInit();
    return new Promise((resolve, reject) => {

      this.alexa.getSmarthomeDevicesV2((error: Error | null, result) => {
        if (error) reject(error);
        else resolve((Array.isArray(result) ? result : []) as unknown as AlexaSmarthomeDevice[]);
      });
    });
  }

  async controlSmarthomeDevice(
    entity: string,
    action: string,
    value?: string,
  ): Promise<unknown> {
    this.assertInit();

    const parameters: Record<string, string> = { action };
    if (value !== undefined && value !== null && value !== '') {
      parameters.value = value;
    }
    return new Promise((resolve, reject) => {
      this.alexa.executeSmarthomeDeviceAction(
        entity,
        parameters,
        (error: Error | null, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
    });
  }

  async getNotifications(): Promise<AlexaNotification[]> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getNotifications((error: Error | null, result) => {
        if (error) reject(error);
        else resolve(((result as Record<string, unknown>)?.notifications ?? result) as unknown as AlexaNotification[]);
      });
    });
  }

  async createNotification(
    device: string,
    type: 'Alarm' | 'Reminder',
    label: string,
    alarmTime: string,
  ): Promise<unknown> {
    this.assertInit();
    const date = new Date(alarmTime);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: "${alarmTime}". Use ISO 8601 (e.g. 2026-03-21T17:05:00)`);
    }

    const notification = this.alexa.createNotificationObject(device, type, label, date, 'ON', null, null);
    if (!notification) {
      throw new Error(`Device "${device}" not found. Ensure the device is online and your Alexa account is initialized.`);
    }

    return new Promise((resolve, reject) => {
      this.alexa.createNotification(notification, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async deleteNotification(notificationId: string): Promise<unknown> {
    this.assertInit();
    const notifications = await this.getNotifications();
    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification) {
      throw new Error(`Notification "${notificationId}" not found.`);
    }
    return new Promise((resolve, reject) => {
      this.alexa.deleteNotification(notification as unknown as Record<string, unknown>, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async createList(name: string): Promise<unknown> {
    this.assertInit();
    const amazonPage = this.alexa._options?.amazonPage ?? 'amazon.com';
    return new Promise((resolve, reject) => {
      this.alexa.httpsGet(
        `https://www.${amazonPage}/alexashoppinglists/api/v2/lists`,
        (error: Error | null, result) => {
          if (error) reject(error);
          else resolve(result);
        },
        { method: 'POST', data: JSON.stringify({ listName: name, listType: 'CUSTOM' }) },
      );
    });
  }

  async deleteList(listId: string, version: number): Promise<unknown> {
    this.assertInit();
    const amazonPage = this.alexa._options?.amazonPage ?? 'amazon.com';
    return new Promise((resolve, reject) => {
      this.alexa.httpsGet(
        `https://www.${amazonPage}/alexashoppinglists/api/v2/lists/${listId}?version=${version}`,
        (error: Error | null, result) => {
          if (error) reject(error);
          else resolve(result);
        },
        { method: 'DELETE' },
      );
    });
  }

  async getLists(): Promise<AlexaList[]> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getListsV2((error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result as unknown as AlexaList[]);
      });
    });
  }

  async addListItem(listType: string, text: string): Promise<AlexaListItem> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.addListItem(listType, text, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result as unknown as AlexaListItem);
      });
    });
  }

  async getListItems(listId: string): Promise<AlexaListItem[]> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getListItemsV2(listId, {}, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result as unknown as AlexaListItem[]);
      });
    });
  }

  async removeListItem(listId: string, itemId: string, version: number): Promise<unknown> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.deleteListItem(listId, itemId, { version }, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async getAccount(): Promise<unknown> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getAccount((error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async getContacts(): Promise<unknown> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getContacts((error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async getMusicProviders(): Promise<unknown> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getMusicProviders((error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async getBluetooth(cached = true): Promise<AlexaBluetoothState[]> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getBluetooth(cached, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(((result as Record<string, unknown>)?.bluetoothStates ?? result) as unknown as AlexaBluetoothState[]);
      });
    });
  }

  async connectBluetooth(device: string, mac: string): Promise<unknown> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.connectBluetooth(device, mac, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async disconnectBluetooth(device: string): Promise<unknown> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.disconnectBluetooth(device, '', (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async unpairBluetooth(device: string, mac: string): Promise<unknown> {
    this.assertInit();
    return new Promise((resolve, reject) => {

      this.alexa.unpaireBluetooth(device, mac, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async getDeviceVolume(serial: string): Promise<number | null> {
    this.assertInit();
    return new Promise((resolve) => {
      this.alexa.getAllDeviceVolumes((error: Error | null, result) => {
        if (error || !result) return resolve(null);
        const data = result as { volumes?: Array<{ dsn?: string; speakerVolume?: number }> };
        const entry = data.volumes?.find((v) => v.dsn === serial);
        resolve(entry?.speakerVolume ?? null);
      });
    });
  }

  async getPlayerInfo(device: string): Promise<AlexaPlayerInfo> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getPlayerInfo(device, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result as unknown as AlexaPlayerInfo);
      });
    });
  }

  async getPlayerQueue(device: string, size = 50): Promise<AlexaPlayerQueue> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getPlayerQueue(device, size, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve((result ?? {}) as AlexaPlayerQueue);
      });
    });
  }

  async getConversations(options: { unread?: boolean; latest?: boolean } = {}): Promise<AlexaConversation[]> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getConversations(options, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(((result as Record<string, unknown>)?.conversations ?? result) as unknown as AlexaConversation[]);
      });
    });
  }

  async sendTextMessage(conversationId: string, text: string): Promise<unknown> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.sendTextMessage(conversationId, text, (error: Error | null, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  getInternalCookieData(): unknown {
    const opts = this.alexa._options;

    if (opts?.formerRegistrationData) return opts.formerRegistrationData;

    if (opts?.cookie) return opts.cookie;
    return null;
  }

  async getMultiRoomGroups(): Promise<AlexaMultiRoomGroup[]> {
    this.assertInit();
    return new Promise((resolve, reject) => {
      this.alexa.getWholeHomeAudioGroups((error: Error | null, result) => {
        if (error) reject(error);
        else resolve((result ?? []) as unknown as AlexaMultiRoomGroup[]);
      });
    });
  }

  lookupDevice(serialOrName: string): AlexaDevice | null {
    return (this.alexa.find(serialOrName) as AlexaDevice | null | undefined) ?? null;
  }

  onPushEvent(eventType: AlexaPushEventType, handler: (payload: AlexaPushEvent) => void): this {
    return this.on(eventType, handler);
  }

  offPushEvent(eventType: AlexaPushEventType, handler: (payload: AlexaPushEvent) => void): this {
    return this.off(eventType, handler);
  }

  disconnect(): void {
    try {
      this.alexa.stop?.();
    } catch { /* noop */ }
    this.initialized = false;
    this.removeAllListeners();
  }
}

function hasRegistrationFields(data: Record<string, unknown>): boolean {
  return (
    (typeof data.loginCookie === 'string' && data.loginCookie.length > 0) ||
    (typeof data.refreshToken === 'string' && data.refreshToken.length > 0)
  );
}

function applyCookieToInitOptions(initOpts: AlexaInitOptions, cookieData: unknown): boolean {
  if (typeof cookieData === 'string') {
    initOpts.cookie = cookieData;
    return true;
  }
  const data = cookieData as Record<string, unknown>;

  if (typeof data.localCookie === 'string') {
    initOpts.cookie = data;
    return true;
  }

  let applied = false;
  if (typeof data.cookie === 'string') {
    initOpts.cookie = data.cookie;
    applied = true;
  }
  if (data.formerRegistrationData && typeof data.formerRegistrationData === 'object') {
    const frd = data.formerRegistrationData as Record<string, unknown>;
    if (typeof frd.localCookie === 'string') {
      initOpts.cookie = frd;
      applied = true;
    } else if (typeof frd.cookie === 'string' || hasRegistrationFields(frd)) {
      initOpts.formerRegistrationData = frd;
      applied = true;
    }
  } else if (hasRegistrationFields(data)) {
    initOpts.formerRegistrationData = data;
    applied = true;
  }
  return applied;
}

function assertValidCookiePayload(cookiePath: string, cookieData: unknown): void {
  if (typeof cookieData === 'string') {
    if (cookieData.trim().length === 0) {
      throw new Error(
        `Cookie file "${cookiePath}" is empty. Run Auth -> Authenticate to generate a valid cookie file.`,
      );
    }
    return;
  }

  if (!cookieData || typeof cookieData !== 'object') {
    throw new Error(
      `Cookie file "${cookiePath}" is not a valid JSON cookie payload. Run Auth -> Authenticate to regenerate it.`,
    );
  }

  if (isEncryptedEnvelope(cookieData)) {
    throw new Error(
      `Cookie file "${cookiePath}" is encrypted but cannot be decrypted with the current environment. ` +
      `Ensure N8N_ENCRYPTION_KEY is set and unchanged, then restart n8n.`,
    );
  }
}

function loadCookiePayload(cookiePath: string): { raw: string; cookieData: unknown } {
  const raw = readCookieFile(cookiePath);
  let cookieData: unknown;
  try {
    cookieData = JSON.parse(raw);
  } catch {
    cookieData = raw;
  }
  assertValidCookiePayload(cookiePath, cookieData);
  return { raw, cookieData };
}

export function normalizeProxyPort(value: unknown): number | undefined {
  const port = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(port) && port > 0 ? port : undefined;
}

export function stopLoginProxyServer(): void {
  try {
    AlexaCookie2.stopProxyServer();
  } catch {
    /* noop */
  }
}

export async function createAlexaFromCredentials(
  credentials: Record<string, unknown>,
  usePushConnection = false,
  cookieOverride?: Record<string, unknown>,
): Promise<AlexaRemoteExt> {
  const alexa = new AlexaRemoteExt();
  const initOptions: AlexaInitOptions = {
    alexaServiceHost: credentials.alexaServiceHost as string,
    amazonPage: credentials.amazonPage as string,
    acceptLanguage: credentials.acceptLanguage as string,
    usePushConnection,
  };
  const cookiePath = credentials.cookieFile as string;
  let raw: string | undefined;
  let cookieData: unknown;
  if (cookieOverride) {
    cookieData = cookieOverride;
  } else {
    ({ raw, cookieData } = loadCookiePayload(cookiePath));
  }
  if (!applyCookieToInitOptions(initOptions, cookieData)) {
    throw new Error(
      `Cookie file "${cookiePath}" has an invalid structure. Expected fields like localCookie, cookie, loginCookie/refreshToken, or formerRegistrationData.`,
    );
  }

  try {
    await alexa.init(initOptions);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Proxy Server could not be initialized')) {
      const hint =
        'If n8n runs in Docker, ensure this port is mapped and avoid using localhost as Proxy IP from external browsers.';
      // eslint-disable-next-line @n8n/community-nodes/require-node-api-error
      throw new Error(`${error.message}. ${hint}`);
    }
    // eslint-disable-next-line @n8n/community-nodes/require-node-api-error
    throw error;
  }

  if (cookiePath && !cookieOverride) {
    let lastWrittenJson = raw;

    const persistCookieData = (data: unknown) => {
      try {
        const json = JSON.stringify(data, null, 2);
        if (json !== lastWrittenJson) {
          writeCookieFile(cookiePath, json);
          lastWrittenJson = json;
        }
      } catch { /* noop */ }
    };

    const freshData = alexa.getInternalCookieData();
    if (freshData) {
      persistCookieData(freshData);
    }

    alexa.on('cookie', () => {
      const updatedData = alexa.getInternalCookieData();
      if (updatedData) {
        persistCookieData(updatedData);
      }
    });

  }
  return alexa;
}

function extractFormerRegistrationData(cookieData: unknown): Record<string, unknown> {
  if (!cookieData || typeof cookieData !== 'object') {
    throw new Error('Cookie payload is invalid. Run Auth -> Authenticate first.');
  }

  const data = cookieData as Record<string, unknown>;

  const formerRegistrationData =
    data.formerRegistrationData && typeof data.formerRegistrationData === 'object'
      ? (data.formerRegistrationData as Record<string, unknown>)
      : data;

  if (typeof formerRegistrationData.loginCookie !== 'string' || formerRegistrationData.loginCookie.length === 0) {
    throw new Error(
      'Cookie payload cannot be refreshed because loginCookie is missing. Run Auth -> Authenticate again.',
    );
  }

  if (typeof formerRegistrationData.refreshToken !== 'string' || formerRegistrationData.refreshToken.length === 0) {
    throw new Error(
      'Cookie payload cannot be refreshed because refreshToken is missing. Run Auth -> Authenticate again.',
    );
  }

  return formerRegistrationData;
}

const CSRF_ENDPOINT_PATHS = [
  '/api/language',
  '/spa/index.html',
  '/api/devices-v2/device?cached=false',
  '/templates/oobe/d-device-pick.handlebars',
  '/api/strings',
];

const CSRF_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36';

function mergeSetCookieHeaders(cookie: string, setCookieHeaders: string[] | undefined): string {
  if (!setCookieHeaders?.length) return cookie;
  const jar = new Map<string, string>();
  for (const part of cookie.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) jar.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
  }
  for (const header of setCookieHeaders) {
    const pair = header.split(';')[0];
    const idx = pair.indexOf('=');
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function csrfHttpGet(
  url: string,
  cookie: string,
  amazonPage: string,
  redirectsLeft = 3,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: 'GET',
        headers: {
          DNT: '1',
          'User-Agent': CSRF_USER_AGENT,
          Referer: `https://alexa.${amazonPage}/spa/index.html`,
          Cookie: cookie,
          Accept: '*/*',
          Origin: `https://alexa.${amazonPage}`,
        },
        timeout: 10_000,
      },
      (res) => {
        const merged = mergeSetCookieHeaders(cookie, res.headers['set-cookie']);
        res.resume();
        if (
          res.statusCode !== undefined &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          redirectsLeft > 0
        ) {
          const next = new URL(res.headers.location, url).toString();
          res.on('end', () => {
            csrfHttpGet(next, merged, amazonPage, redirectsLeft - 1).then(resolve, reject);
          });
          return;
        }
        res.on('end', () => resolve(merged));
      },
    );
    req.on('timeout', () => req.destroy(new Error(`CSRF request to ${url} timed out`)));
    req.on('error', reject);
    req.end();
  });
}

async function fetchCsrfForCookie(
  localCookie: string,
  amazonPage: string,
): Promise<{ localCookie: string; csrf: string } | undefined> {
  let cookie = localCookie;
  for (const path of CSRF_ENDPOINT_PATHS) {
    try {
      cookie = await csrfHttpGet(`https://alexa.${amazonPage}${path}`, cookie, amazonPage);
    } catch {
      continue;
    }
    const match = /csrf=([^;]+)/.exec(cookie);
    if (match) return { localCookie: cookie, csrf: match[1] };
  }
  return undefined;
}

export async function refreshAlexaCookieFromCredentials(
  credentials: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const cookiePath = credentials.cookieFile as string;
  const { cookieData } = loadCookiePayload(cookiePath);

  const normalizedProxyPort = normalizeProxyPort(credentials.proxyPort) ?? 3456;

  const formerRegistrationData = extractFormerRegistrationData(cookieData);
  const topLevelMacDms =
    cookieData && typeof cookieData === 'object'
      ? (cookieData as Record<string, unknown>).macDms
      : undefined;

  const refreshedCookie = await new Promise<Record<string, unknown>>((resolve, reject) => {
    AlexaCookie2.refreshAlexaCookie(
      {
        alexaServiceHost: credentials.alexaServiceHost as string,
        amazonPage: credentials.amazonPage as string,
        acceptLanguage: credentials.acceptLanguage as string,
        proxyOwnIp: (credentials.proxyOwnIp as string | undefined) || 'localhost',
        proxyPort: normalizedProxyPort,
        formerRegistrationData,
      },
      (error: Error | null, result: unknown) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result || typeof result !== 'object') {
          reject(new Error('Cookie refresh returned an invalid payload.'));
          return;
        }

        const refreshedCookie = result as Record<string, unknown>;

        if (
          typeof refreshedCookie.loginCookie !== 'string' ||
          typeof refreshedCookie.refreshToken !== 'string' ||
          typeof refreshedCookie.localCookie !== 'string'
        ) {
          reject(
            new Error(
              'Cookie refresh returned an incomplete payload. Run Auth -> Authenticate again.',
            ),
          );
          return;
        }

        if (!refreshedCookie.macDms) {
          refreshedCookie.macDms = formerRegistrationData.macDms ?? topLevelMacDms;
        }

        if (!refreshedCookie.macDms) {
          reject(
            new Error(
              'Cookie refresh succeeded but the stored registration is missing macDms (the device keys), ' +
                'so the refreshed cookie cannot be validated without an interactive browser login. ' +
                'Run Auth -> Authenticate again to generate a complete cookie.',
            ),
          );
          return;
        }

        resolve(refreshedCookie);
      },
    );
  });

  const localCookie = refreshedCookie.localCookie as string;
  if (!/csrf=/.test(localCookie)) {
    const amazonPage =
      (typeof refreshedCookie.amazonPage === 'string' && refreshedCookie.amazonPage) ||
      (credentials.amazonPage as string);
    const recovered = await fetchCsrfForCookie(localCookie, amazonPage);
    if (!recovered) {
      throw new Error(
        'Cookie refresh succeeded but Amazon returned no csrf token, so the refreshed session cannot be validated. ' +
          'This is usually transient — run Refresh Cookie again.',
      );
    }
    refreshedCookie.localCookie = recovered.localCookie;
    refreshedCookie.csrf = recovered.csrf;
  }

  return refreshedCookie;
}