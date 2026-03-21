import AlexaRemote2 from 'alexa-remote2';
import alexaCookie from 'alexa-cookie2';
import { EventEmitter } from 'node:events';
import { readCookieFile, writeCookieFile } from './cookie-crypto';
import { buildSingleSequence, buildSpeakNode } from './helpers';
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
	AlexaPushEvent,
	AlexaPushEventType,
	AlexaRoutine,
	AlexaSequenceNode,
	AlexaSmarthomeDevice,
} from './types';

type AlexaCb = (err: Error | null, result: unknown) => void;

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
	addListItem(listType: string, text: string, callback: AlexaCb): void;
	getListItems(listId: string, options: object, callback: AlexaCb): void;
	deleteListItem(listId: string, itemId: string, options: object, callback: AlexaCb): void;
	getAccount(callback: AlexaCb): void;
	getContacts(callback: AlexaCb): void;
	getMusicProviders(callback: AlexaCb): void;
	getBluetooth(cached: boolean, callback: AlexaCb): void;
	connectBluetooth(device: string, mac: string, callback: AlexaCb): void;
	disconnectBluetooth(device: string, empty: string, callback: AlexaCb): void;
	unpaireBluetooth(device: string, mac: string, callback: AlexaCb): void;
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
  ): Promise<unknown> {

    let timerHandle: ReturnType<typeof setTimeout> | undefined;
    let proxyCallbackFired = false;

    return new Promise((resolve, reject) => {
      timerHandle = setTimeout(() => {
        JSON.parse = _origParse;
        try { alexaCookie.stopProxyServer(); } catch { /* noop */ }
        reject(new Error(`Authentication timeout after ${loginTimeoutMs / 60000} minutes.`));
      }, loginTimeoutMs);

      const config = {
        proxyOnly: true,
        setupProxy: true,
        proxyOwnIp: options.proxyOwnIp,
        proxyPort: options.proxyPort,
        proxyListenBind: '0.0.0.0',
        alexaServiceHost: 'layla.amazon.fr',
        amazonPage: 'amazon.fr',
        acceptLanguage: 'fr-FR',
        proxyLogLevel: 'info',
      };

      const _origParse = JSON.parse;
      JSON.parse = function (text) {
        if (text === '' || text == null || (typeof text === 'string' && text.trim() === '')) {
          return {};
        }
        return _origParse.call(this, text);
      };

      alexaCookie.generateAlexaCookie(
        undefined,
        undefined,
        config,
        (err: Error | null, result: unknown) => {
          if (err) {
            if (!proxyCallbackFired) {
              proxyCallbackFired = true;
              const match = /http:\/\/[^\s)]+/.exec(err.message);
              onProxyReady(match ? match[0] : `http://${options.proxyOwnIp}:${options.proxyPort}/`);
              return;
            }
            clearTimeout(timerHandle);
            try { alexaCookie.stopProxyServer(); } catch { /* noop */ }
            JSON.parse = _origParse;
            reject(err);
            return;
          }

          const r = result as Record<string, unknown>;
          const hasCookie = r.cookie || r.loginCookie;
          if (hasCookie) {
            clearTimeout(timerHandle);
            try { alexaCookie.stopProxyServer(); } catch { /* noop */ }
            JSON.parse = _origParse;
            resolve(r);
          }
        },
      );
    });
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
		const devices = await this.getDevices();
		return devices.find((d) => d.serialNumber === serialNumber);
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

	async setVolume(device: string, volume: number): Promise<unknown> {
		this.assertInit();

		await this.sendCommand(device, 'volume', String(volume));
		return { success: true, device, volume };
	}

	async playMusic(
		device: string,
		provider: string,
		search: string,
	): Promise<unknown> {
		this.assertInit();

		return new Promise((resolve, reject) => {
			this.alexa.playMusicProvider(device, provider, search, (error: Error | null, result) => {
				if (error) reject(error);
				else resolve(result);
			});
		});
	}

	async sendAnnouncement(devices: string[], text: string, locale: string): Promise<unknown> {
		this.assertInit();

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
			this.alexa.getListItems(listId, {}, (error: Error | null, result) => {
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

	async getPlayerInfo(device: string): Promise<AlexaPlayerInfo> {
		this.assertInit();
		return new Promise((resolve, reject) => {
			this.alexa.getPlayerInfo(device, (error: Error | null, result) => {
				if (error) reject(error);
				else resolve(result as unknown as AlexaPlayerInfo);
			});
		});
	}

	async getPlayerQueue(device: string, size = 50): Promise<unknown> {
		this.assertInit();
		return new Promise((resolve, reject) => {
			this.alexa.getPlayerQueue(device, size, (error: Error | null, result) => {
				if (error) reject(error);
				else resolve(result);
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
		this.removeAllListeners();
	}
}

export async function createAlexaFromCredentials(
	credentials: Record<string, unknown>,
	useWsMqtt = false,
): Promise<AlexaRemoteExt> {
	const alexa = new AlexaRemoteExt();
	const refreshIntervalDays = typeof credentials.refreshInterval === 'number' ? credentials.refreshInterval : 3;
	const cookieRefreshIntervalMs = refreshIntervalDays > 0 ? refreshIntervalDays * 24 * 60 * 60 * 1000 : 0;

	const initOptions: AlexaInitOptions = {
		alexaServiceHost: credentials.alexaServiceHost as string,
		amazonPage: credentials.amazonPage as string,
		acceptLanguage: credentials.acceptLanguage as string,
		useWsMqtt,

		cookieRefreshInterval: cookieRefreshIntervalMs,
	};
	const cookiePath = credentials.cookieFile as string;
	const raw = readCookieFile(cookiePath);
	let cookieData: unknown;
	try {
		cookieData = JSON.parse(raw);
	} catch {
		cookieData = raw;
	}
	initOptions.cookie = typeof cookieData === 'string' ? cookieData : ((cookieData as Record<string, unknown>)?.cookie ?? cookieData) as string | Record<string, unknown>;
	await alexa.init(initOptions);

	if (cookiePath) {
		const freshData = alexa.getInternalCookieData();
		if (freshData) {
			try {
				writeCookieFile(cookiePath, JSON.stringify(freshData, null, 2));
			} catch { /* noop */ }
		}

		const savedCookiePath = cookiePath;
		alexa.on('cookie', () => {
			const updatedData = alexa.getInternalCookieData();
			if (updatedData) {
				try {
					writeCookieFile(savedCookiePath, JSON.stringify(updatedData, null, 2));
				} catch { /* noop */ }
			}
		});
	}
	return alexa;
}
