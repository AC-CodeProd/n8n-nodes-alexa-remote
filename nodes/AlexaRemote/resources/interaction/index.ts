import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { AlexaRemoteExt } from '../../lib/alexa-remote-ext';
import {
  buildBuiltinNode,
  buildSerialSequence,
  buildSingleSequence,
  buildSoundNode,
  buildSpeakNode,
  buildVolumeNode,
  buildWaitNode,
  type BuiltinType,
} from '../../lib/helpers';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['interaction'],
      },
    },
    options: [
      {
        name: 'Builtin',
        value: 'builtin',
        description: 'Play a built-in Alexa action (weather, traffic, Good Morning...)',
        action: 'Play built in alexa action',
      },
      {
        name: 'Play Music',
        value: 'music',
        description: 'Play music from provider',
        action: 'Play music',
      },
      {
        name: 'Set Volume',
        value: 'volume',
        description: 'Set device volume',
        action: 'Set volume',
      },
      {
        name: 'Sound',
        value: 'sound',
        description: 'Play a sound effect',
        action: 'Play sound effect',
      },
      {
        name: 'Speak',
        value: 'speak',
        description: 'Make Alexa speak text',
        action: 'Make alexa speak',
      },
      {
        name: 'Speak All (Multi-Device)',
        value: 'speakAll',
        description: 'Make multiple Echo devices speak in parallel',
        action: 'Speak on multiple devices',
      },
      {
        name: 'Speak At Volume',
        value: 'speakAtVolume',
        description: 'Make Alexa speak at specific volume',
        action: 'Make alexa speak at a volume',
      },
      {
        name: 'Stop',
        value: 'stop',
        description: 'Stop playback on device',
        action: 'Stop playback',
      },
      {
        name: 'Text Command',
        value: 'textCommand',
        description: 'Send a text command to Alexa',
        action: 'Send text command',
      },
      {
        name: 'Wait',
        value: 'wait',
        description: 'Wait a given number of seconds',
        action: 'Wait seconds',
      },
    ],
    default: 'speak',
  },
  {
    displayName: 'Device Name or ID',
    name: 'device',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getEchoDevices' },
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['speak', 'speakAtVolume', 'textCommand', 'stop', 'volume', 'builtin', 'sound', 'music'],
      },
    },
    description:
      'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
  },
  {
    displayName: 'Text',
    name: 'text',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['speak', 'speakAtVolume', 'textCommand', 'speakAll'],
      },
      hide: {
        speakType: ['ssml'],
      },
    },
    description: 'Text to speak or command to send',
  },
  {
    displayName: 'SSML Content',
    name: 'ssmlContent',
    type: 'string',
    typeOptions: { rows: 8 },
    default: '<speak>\n  Hello! <break time="500ms"/> This is an SSML message.\n</speak>',
    required: true,
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['speak', 'speakAtVolume', 'speakAll'],
        speakType: ['ssml'],
      },
    },
    description:
      'SSML markup to send. Must be wrapped in &lt;speak&gt; tags. Supported tags: &lt;break time="500ms"/&gt;, &lt;emphasis&gt;, &lt;prosody rate="slow"&gt;, &lt;say-as interpret-as="characters"&gt;',
  },
  {
    displayName: 'Speak Type',
    name: 'speakType',
    type: 'options',
    options: [
      { name: 'Regular', value: 'regular' },
      { name: 'SSML', value: 'ssml' },
      { name: 'Announcement', value: 'announcement' },
    ],
    default: 'regular',
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['speak', 'speakAtVolume', 'speakAll'],
      },
    },
    description: 'Type of speech',
  },
  {
    displayName: 'Device Names or IDs',
    name: 'devices',
    type: 'multiOptions',
    typeOptions: { loadOptionsMethod: 'getEchoDevices' },
    default: [],
    required: true,
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['speakAll'],
      },
    },
    description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
  },
  {
    displayName: 'Volume',
    name: 'volumeValue',
    type: 'number',
    typeOptions: {
      minValue: 0,
      maxValue: 100,
    },
    default: 50,
    required: true,
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['speakAtVolume', 'volume'],
      },
    },
    description: 'Volume level (0-100)',
  },
  {
    displayName: 'Music Provider',
    name: 'musicProvider',
    type: 'options',
    options: [
      { name: 'Amazon Music', value: 'AMAZON_MUSIC' },
      { name: 'Spotify', value: 'SPOTIFY' },
      { name: 'TuneIn', value: 'TUNEIN' },
      { name: 'Cloud Player', value: 'CLOUDPLAYER' },
    ],
    default: 'AMAZON_MUSIC',
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['music'],
      },
    },
    description: 'Music streaming provider',
  },
  {
    displayName: 'Search Query',
    name: 'searchQuery',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['music'],
      },
    },
    description: 'Search query for music',
  },
  {
    displayName: 'Duration (Seconds)',
    name: 'duration',
    type: 'number',
    default: 0,
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['music'],
      },
    },
    description: 'Duration to play music (0 = unlimited)',
  },
  {
    displayName: 'Builtin Type',
    name: 'builtinType',
    type: 'options',
    options: [
      { name: 'Calendar - Next', value: 'calendarNext' },
      { name: 'Calendar - Today', value: 'calendarToday' },
      { name: 'Calendar - Tomorrow', value: 'calendarTomorrow' },
      { name: 'Clean Up', value: 'cleanup' },
      { name: 'Flash Briefing', value: 'flashbriefing' },
      { name: 'Fun Fact', value: 'funfact' },
      { name: 'Good Morning', value: 'goodmorning' },
      { name: 'Good Night', value: 'goodnight' },
      { name: 'Joke', value: 'joke' },
      { name: 'Sing a Song', value: 'singasong' },
      { name: 'Tell Story', value: 'tellstory' },
      { name: 'Traffic', value: 'traffic' },
      { name: 'Weather', value: 'weather' },
    ],
    default: 'weather',
    required: true,
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['builtin'],
      },
    },
    description: 'Built-in Alexa action to execute',
  },
  {
    displayName: 'Sound ID',
    name: 'soundId',
    type: 'string',
    default: 'amzn1.ask.1p.sound/nature/crickets_01',
    required: true,
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['sound'],
      },
    },
    description: 'Sound string ID (e.g. amzn1.ask.1p.sound/nature/crickets_01)',
  },
  {
    displayName: 'Duration (Seconds)',
    name: 'waitDuration',
    type: 'number',
    typeOptions: { minValue: 1 },
    default: 5,
    required: true,
    displayOptions: {
      show: {
        resource: ['interaction'],
        operation: ['wait'],
      },
    },
    description: 'Number of seconds to wait',
  },
];

async function resolveGroupsToDevices(
  alexa: AlexaRemoteExt,
  ids: string[],
  node: ReturnType<IExecuteFunctions['getNode']>,
): Promise<string[]> {
  const groups = await alexa.getMultiRoomGroups().catch((err: unknown) => {
    throw new NodeOperationError(node, `Failed to fetch Alexa groups: ${String(err)}`, {
      description: 'Check your Alexa credentials and network connection.',
    });
  });

  const groupMap = new Map(
    groups.map((g) => {
      const members = (g.members ?? []) as Array<Record<string, unknown>>;
      const memberSerials = members
        .map((m) => {
          for (const field of ['serialNumber', 'dsn', 'applianceId']) {
            const val = m[field];
            if (typeof val === 'string' && val && alexa.lookupDevice(val) !== null) {
              return val;
            }
          }
          for (const field of ['serialNumber', 'dsn', 'applianceId']) {
            const val = m[field];
            if (typeof val === 'string' && val) return val;
          }
          return undefined;
        })
        .filter((id): id is string => !!id);
      return [g.id, memberSerials] as [string, string[]];
    }),
  );

  const resolved = [
    ...new Set(
      ids.flatMap((id) => {
        const members = groupMap.get(id);
        if (members && members.length > 0) return members;
        const matchedGroup = groups.find((g) => g.id === id);
        if (matchedGroup) {
          const rawMembers = matchedGroup.members ?? [];
          throw new NodeOperationError(
            node,
            `Group "${matchedGroup.name}" resolved to 0 devices.`,
            {
              description: `Raw member data: ${JSON.stringify(rawMembers, null, 2)}\n\nExpected fields: serialNumber, dsn, or applianceId. Please report this so the integration can be fixed.`,
            },
          );
        }
        return [id];
      }),
    ),
  ];

  return resolved;
}

async function resolveGroupToDevices(alexa: AlexaRemoteExt, id: string, node: ReturnType<IExecuteFunctions['getNode']>): Promise<string[]> {
  return resolveGroupsToDevices(alexa, [id], node);
}

export async function execute(
  this: IExecuteFunctions,
  alexa: AlexaRemoteExt,
  operation: string,
  itemIndex: number,
  credentials: Record<string, unknown>,
): Promise<unknown> {
  const locale = credentials.acceptLanguage as string;

  if (operation === 'speak') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    if (!device) {
      throw new NodeOperationError(
        this.getNode(),
        'Device is required — select an Echo device from the dropdown or provide a serial number via an expression.',
        { itemIndex },
      );
    }
    const speakType = this.getNodeParameter('speakType', itemIndex) as string;
    const text =
      speakType === 'ssml'
        ? (this.getNodeParameter('ssmlContent', itemIndex) as string)
        : (this.getNodeParameter('text', itemIndex) as string);

    const devices = await resolveGroupToDevices(alexa, device, this.getNode());

    if (speakType === 'announcement') {
      return alexa.sendAnnouncement(devices, text, locale);
    }
    if (devices.length === 1) {
      return alexa.sendSequenceCommand(
        buildSingleSequence(buildSpeakNode(devices[0], text, locale)),
      );
    }
    return Promise.all(
      devices.map((d) => alexa.sendSequenceCommand(buildSingleSequence(buildSpeakNode(d, text, locale)))),
    );
  }

  if (operation === 'speakAll') {
    const rawDevices = this.getNodeParameter('devices', itemIndex) as string[];
    const speakType = this.getNodeParameter('speakType', itemIndex) as string;
    const text =
      speakType === 'ssml'
        ? (this.getNodeParameter('ssmlContent', itemIndex) as string)
        : (this.getNodeParameter('text', itemIndex) as string);

    const devices = await resolveGroupsToDevices(alexa, rawDevices, this.getNode());

    if (speakType === 'announcement') {
      return alexa.sendAnnouncement(devices, text, locale);
    }
    if (devices.length === 1) {
      return alexa.sendSequenceCommand(
        buildSingleSequence(buildSpeakNode(devices[0], text, locale)),
      );
    }
    return Promise.all(
      devices.map((d) => alexa.sendSequenceCommand(buildSingleSequence(buildSpeakNode(d, text, locale)))),
    );
  }

  if (operation === 'stop') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const devices = await resolveGroupToDevices(alexa, device, this.getNode());
    if (devices.length === 1) {
      return alexa.sendSequenceCommandStr(devices[0], 'deviceStop', null);
    }
    return Promise.all(devices.map((d) => alexa.sendSequenceCommandStr(d, 'deviceStop', null)));
  }

  if (operation === 'music') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const provider = this.getNodeParameter('musicProvider', itemIndex) as string;
    const search = this.getNodeParameter('searchQuery', itemIndex) as string;
    const duration = this.getNodeParameter('duration', itemIndex, 0) as number;
    const devices = await resolveGroupToDevices(alexa, device, this.getNode());
    if (devices.length === 1) {
      return alexa.playMusic(devices[0], provider, search, locale, duration);
    }
    return Promise.all(devices.map((d) => alexa.playMusic(d, provider, search, locale, duration)));
  }

  if (operation === 'speakAtVolume') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const speakType = this.getNodeParameter('speakType', itemIndex) as string;
    const text =
      speakType === 'ssml'
        ? (this.getNodeParameter('ssmlContent', itemIndex) as string)
        : (this.getNodeParameter('text', itemIndex) as string);
    const volumeValue = this.getNodeParameter('volumeValue', itemIndex) as number;

    const devices = await resolveGroupToDevices(alexa, device, this.getNode());

    const originalVolumes = await Promise.all(
      devices.map(async (d) => {
        const vol = await alexa.getDeviceVolume(d).catch(() => null);
        return { device: d, volume: vol };
      }),
    );

    if (speakType === 'announcement') {
      const restoreVolumes = async () => {
        await Promise.all(
          originalVolumes
            .filter((v) => v.volume !== null)
            .map((v) => alexa.setVolume(v.device, v.volume as number, locale)),
        );
      };
      await Promise.all(devices.map((d) => alexa.setVolume(d, volumeValue, locale)));
      await alexa.sendAnnouncement(devices, text, locale);
      const estimatedMs = Math.max(1500, text.length * 70 + 1000);
      setTimeout(() => { void restoreVolumes(); }, estimatedMs);
      return { success: true };
    }

    await Promise.all(
      devices.map((d) => {
        const origVol = originalVolumes.find((v) => v.device === d)?.volume ?? null;
        const nodes = [
          buildVolumeNode(d, volumeValue, locale),
          buildSpeakNode(d, text, locale),
        ];
        if (origVol !== null) {
          nodes.push(buildVolumeNode(d, origVol, locale));
        }
        return alexa.sendSequenceCommand(buildSerialSequence(nodes));
      }),
    );
    return { success: true };
  }

  if (operation === 'textCommand') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const text = this.getNodeParameter('text', itemIndex) as string;
    const devices = await resolveGroupToDevices(alexa, device, this.getNode());
    if (devices.length === 1) {
      return alexa.sendSequenceCommandStr(devices[0], 'textCommand', text);
    }
    return Promise.all(devices.map((d) => alexa.sendSequenceCommandStr(d, 'textCommand', text)));
  }

  if (operation === 'volume') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const volumeValue = this.getNodeParameter('volumeValue', itemIndex) as number;
    const devices = await resolveGroupToDevices(alexa, device, this.getNode());
    if (devices.length === 1) {
      return alexa.setVolume(devices[0], volumeValue, locale);
    }
    return Promise.all(devices.map((d) => alexa.setVolume(d, volumeValue, locale)));
  }

  if (operation === 'builtin') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const builtinType = this.getNodeParameter('builtinType', itemIndex) as BuiltinType;
    const devices = await resolveGroupToDevices(alexa, device, this.getNode());
    if (devices.length === 1) {
      return alexa.sendSequenceCommand(
        buildSingleSequence(buildBuiltinNode(devices[0], builtinType, locale)),
      );
    }
    return Promise.all(
      devices.map((d) => alexa.sendSequenceCommand(buildSingleSequence(buildBuiltinNode(d, builtinType, locale)))),
    );
  }

  if (operation === 'sound') {
    const device = this.getNodeParameter('device', itemIndex) as string;
    const soundId = this.getNodeParameter('soundId', itemIndex) as string;
    const devices = await resolveGroupToDevices(alexa, device, this.getNode());
    if (devices.length === 1) {
      return alexa.sendSequenceCommand(
        buildSingleSequence(buildSoundNode(devices[0], soundId, locale)),
      );
    }
    return Promise.all(
      devices.map((d) => alexa.sendSequenceCommand(buildSingleSequence(buildSoundNode(d, soundId, locale)))),
    );
  }

  if (operation === 'wait') {
    const waitDuration = this.getNodeParameter('waitDuration', itemIndex) as number;
    return alexa.sendSequenceCommand(buildSingleSequence(buildWaitNode(waitDuration)));
  }
  return undefined;
}
