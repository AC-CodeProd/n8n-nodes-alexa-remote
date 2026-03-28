export interface AlexaDevice {
	serialNumber: string;
	deviceType: string;
	softwareVersion: string;
	macAddress?: string;
	deviceFamily: string;
	deviceOwnerCustomerId: string;
	online: boolean;
	accountName: string;
	capabilities?: AlexaDeviceCapability[];
}

export interface AlexaDeviceCapability {
	type: string;
	version: string;
	interfaceName: string;
}

export interface AlexaSmarthomeDevice {

	endpointId?: string;
	id?: string;
	friendlyName: string;

	applianceId?: string;
	manufacturerName?: string;
	friendlyDescription?: string;
	isEnabled?: boolean;
	actions?: string[];

	legacyAppliance?: {
		applianceId?: string;
		friendlyDescription?: string;
		manufacturerName?: string;
		isEnabled?: boolean;
		actions?: string[];
	};
}

export interface AlexaRoutine {
	automationId: string;
	name: string;
	enabled: boolean;
	triggers: AlexaRoutineTrigger[];
	sequence: AlexaSequenceNode;
}

export interface AlexaRoutineTrigger {
	id: string;
	type: string;
	payload: Record<string, unknown>;
}

export interface AlexaSequenceNode {
	'@type': string;
	startNode?: AlexaOperationNode | AlexaParallelNode | AlexaSerialNode;
}

export interface AlexaOperationNode {
	'@type': 'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode';
	type: string;
	skillId?: string;
	operationPayload: AlexaSpeakPayload | AlexaMusicPayload | AlexaVolumePayload | AlexaPromptPayload | AlexaBuiltinPayload | AlexaSoundPayload | Record<string, unknown> | string;
}

export interface AlexaParallelNode {
	'@type': 'com.amazon.alexa.behaviors.model.ParallelNode';
	nodesToExecute: AlexaOperationNode[];
}

export interface AlexaSerialNode {
	'@type': 'com.amazon.alexa.behaviors.model.SerialNode';
	nodesToExecute: (AlexaOperationNode | AlexaParallelNode)[];
}

export interface AlexaSpeakPayload {
	deviceType: string;
	deviceSerialNumber: string;
	locale: string;
	customerId: string;
	textToSpeak: string;
}

export interface AlexaMusicPayload {
	deviceType: string;
	deviceSerialNumber: string;
	locale: string;
	customerId: string;
	musicProviderId: string;
	searchPhrase: string;
	waitTimeInSeconds?: number;
}

export interface AlexaVolumePayload {
	deviceType: string;
	deviceSerialNumber: string;
	locale: string;
	customerId: string;
	value: number;
}

export interface AlexaPromptPayload {
	deviceType: string;
	deviceSerialNumber: string;
	locale: string;
	customerId: string;
	promptType: string;
}

export interface AlexaNotification {
	id: string;
	deviceSerialNumber: string;
	type: 'Alarm' | 'Reminder' | 'Timer' | string;
	reminderLabel?: string | null;
	alarmTime: number;
	originalDate?: string;
	originalTime?: string;
	status: 'ON' | 'OFF' | string;
	[key: string]: unknown;
}

export interface AlexaList {
	listId: string;
	name: string;
	state: string;
	version: number;
	items?: AlexaListItem[];
}

export interface AlexaListItem {
	id: string;
	value: string;
	version: number;
	completed: boolean;
	createdDateTime: string;
	updatedDateTime: string;
}

export type AlexaApiResult<T = unknown> = T | null;

export interface AlexaInitOptions {
	alexaServiceHost: string;
	amazonPage: string;
	acceptLanguage: string;
  usePushConnection?: boolean;
	cookieRefreshInterval?: number;

	proxyOwnIp?: string;
	proxyPort?: number;
	setupProxy?: boolean;

	cookie?: string | Record<string, unknown>;
}

export type AlexaPushEventType =
	| 'ws-message'
	| 'ws-device-activity'
	| 'ws-volume-change'
	| 'ws-bluetooth-state-change'
	| 'ws-device-connection-change'
	| 'ws-notification-change'
	| 'ws-todo-change'
	| 'ws-audio-player-state-change'
	| 'ws-media-change'
	| 'ws-unknown-message';

export interface AlexaPushEvent {
	command: string;
	payload: Record<string, unknown>;
	destinationUserId?: string;
}

export interface AlexaBluetoothDevice {
	address: string;
	friendlyName?: string;
	connected: boolean;
	profiles?: string[];
}

export interface AlexaBluetoothState {
	deviceSerialNumber: string;
	friendlyName?: string;
	pairedDeviceList?: AlexaBluetoothDevice[];
}

export interface AlexaPlayerInfoData {
	state?: string;
	playerType?: string;
	infoText?: { title?: string; subText1?: string; subText2?: string };
	miniArtUrl?: string;
	progress?: { mediaLength?: number; mediaProgress?: number };
	volume?: { volume?: number; muted?: boolean };
	transport?: { shuffle?: boolean; repeat?: string };
	provider?: { providerDisplayName?: string };
}

export interface AlexaPlayerInfo {
	playerInfo?: AlexaPlayerInfoData;
}

export interface AlexaConversation {
	conversationId: string;
	participants?: Array<{ id?: string; name?: string; isCurrentUser?: boolean }>;
	latestMessage?: { id: string; createdDate: number; text?: string; contentType?: string };
}

export interface AlexaSoundPayload {
	deviceType: string;
	deviceSerialNumber: string;
	locale: string;
	customerId: string;
	soundStringId: string;
}

export interface AlexaBuiltinPayload {
	deviceType: string;
	deviceSerialNumber: string;
	locale: string;
	customerId: string;
}

export interface AlexaMultiRoomGroup {
	id: string;
	name: string;
	members?: Array<{ serialNumber?: string; dsn?: string; applianceId?: string; name?: string }>;
}
