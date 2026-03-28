import type {
	AlexaBuiltinPayload,
	AlexaMusicPayload,
	AlexaOperationNode,
	AlexaParallelNode,
	AlexaPromptPayload,
	AlexaSerialNode,
	AlexaSequenceNode,
	AlexaSoundPayload,
	AlexaSpeakPayload,
	AlexaVolumePayload,
} from './types';

export function buildSpeakNode(
	device: string,
	text: string,
	locale: string,
): AlexaOperationNode {
	const payload: AlexaSpeakPayload = {
		deviceType: 'ALEXA_CURRENT_DEVICE_TYPE',
		deviceSerialNumber: device,
		locale,
		customerId: 'ALEXA_CUSTOMER_ID',
		textToSpeak: text,
	};
	return {
		'@type': 'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode',

		type: 'Alexa.Speak',
		operationPayload: payload,
	};
}

export function buildVolumeNode(device: string, volume: number, locale: string): AlexaOperationNode {
	const payload: AlexaVolumePayload = {
		deviceType: 'ALEXA_CURRENT_DEVICE_TYPE',
		deviceSerialNumber: device,
		locale,
		customerId: 'ALEXA_CUSTOMER_ID',
		value: volume,
	};
	return {
		'@type': 'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode',
		type: 'Alexa.DeviceControls.Volume',
		skillId: 'amzn1.ask.1p.alexadevicecontrols',
		operationPayload: payload,
	};
}

export function buildMusicNode(
	device: string,
	provider: string,
	search: string,
	locale: string,
	duration = 0,
): AlexaOperationNode {
	const payload: AlexaMusicPayload = {
		deviceType: 'ALEXA_CURRENT_DEVICE_TYPE',
		deviceSerialNumber: device,
		locale,
		customerId: 'ALEXA_CUSTOMER_ID',
		musicProviderId: provider,
		searchPhrase: search,
	};
	if (duration > 0) {
		payload.waitTimeInSeconds = duration;
	}
	return {
		'@type': 'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode',
		type: 'Alexa.Music.PlaySearchPhrase',
		operationPayload: JSON.stringify(payload),
	};
}

export function buildPromptNode(
	device: string,
	promptType: string,
	locale: string,
): AlexaOperationNode {
	const payload: AlexaPromptPayload = {
		deviceType: 'ALEXA_CURRENT_DEVICE_TYPE',
		deviceSerialNumber: device,
		locale,
		customerId: 'ALEXA_CUSTOMER_ID',
		promptType,
	};
	return {
		'@type': 'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode',
		type: 'Alexa.CannedTts.Speak',
		operationPayload: payload,
	};
}

export function buildWaitNode(durationSeconds: number): AlexaOperationNode {
	return {
		'@type': 'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode',
		type: 'Alexa.System.Wait',
		operationPayload: { waitTimeInSeconds: durationSeconds },
	};
}

export function buildSingleSequence(node: AlexaOperationNode): AlexaSequenceNode {
	return {
		'@type': 'com.amazon.alexa.behaviors.model.Sequence',
		startNode: node,
	};
}

export function buildSerialSequence(
	nodes: (AlexaOperationNode | AlexaParallelNode)[],
): AlexaSequenceNode {
	const serial: AlexaSerialNode = {
		'@type': 'com.amazon.alexa.behaviors.model.SerialNode',
		nodesToExecute: nodes,
	};
	return {
		'@type': 'com.amazon.alexa.behaviors.model.Sequence',
		startNode: serial,
	};
}

export function buildParallelNode(nodes: AlexaOperationNode[]): AlexaParallelNode {
	return {
		'@type': 'com.amazon.alexa.behaviors.model.ParallelNode',
		nodesToExecute: nodes,
	};
}

export function buildParallelSequence(nodes: AlexaOperationNode[]): AlexaSequenceNode {
	return {
		'@type': 'com.amazon.alexa.behaviors.model.Sequence',
		startNode: buildParallelNode(nodes),
	};
}

export const BUILTIN_TYPES = [
	'weather',
	'traffic',
	'flashbriefing',
	'goodmorning',
	'goodnight',
	'funfact',
	'joke',
	'cleanup',
	'singasong',
	'tellstory',
	'calendarToday',
	'calendarTomorrow',
	'calendarNext',
] as const;

export type BuiltinType = (typeof BUILTIN_TYPES)[number];

const BUILTIN_TYPE_MAP: Record<BuiltinType, string> = {
	weather: 'Alexa.Weather.Play',
	traffic: 'Alexa.Traffic.Play',
	flashbriefing: 'Alexa.FlashBriefing.Play',
	goodmorning: 'Alexa.GoodMorning.Play',
	goodnight: 'Alexa.GoodNight.Play',
	funfact: 'Alexa.FunFact.Play',
	joke: 'Alexa.Joke.Play',
	cleanup: 'Alexa.CleanUp.Play',
	singasong: 'Alexa.SingASong.Play',
	tellstory: 'Alexa.TellStory.Play',
	calendarToday: 'Alexa.Calendar.PlayToday',
	calendarTomorrow: 'Alexa.Calendar.PlayTomorrow',
	calendarNext: 'Alexa.Calendar.PlayNext',
};

export function buildBuiltinNode(device: string, builtinType: BuiltinType, locale: string): AlexaOperationNode {
	const payload: AlexaBuiltinPayload = {
		deviceType: 'ALEXA_CURRENT_DEVICE_TYPE',
		deviceSerialNumber: device,
		locale,
		customerId: 'ALEXA_CUSTOMER_ID',
	};
	return {
		'@type': 'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode',
		type: BUILTIN_TYPE_MAP[builtinType] ?? 'Alexa.Weather.Play',
		operationPayload: payload,
	};
}

export function buildSoundNode(device: string, soundId: string, locale: string): AlexaOperationNode {
	const payload: AlexaSoundPayload = {
		deviceType: 'ALEXA_CURRENT_DEVICE_TYPE',
		deviceSerialNumber: device,
		locale,
		customerId: 'ALEXA_CUSTOMER_ID',
		soundStringId: soundId,
	};
	return {
		'@type': 'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode',
		type: 'Alexa.Sound',
		skillId: 'amzn1.ask.1p.sound',
		operationPayload: payload,
	};
}

export function formatNotificationTime(isoString: string): string {
	const date = new Date(isoString);
	if (isNaN(date.getTime())) {
		throw new Error(`Invalid date format: "${isoString}". Use ISO 8601 (e.g. 2026-03-19T08:00:00.000)`);
	}
	return date.toISOString().replace('Z', '');
}
