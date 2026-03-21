import type {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class AlexaRemoteApi implements ICredentialType {
  name = 'alexaRemoteApi';

  displayName = 'Alexa Remote API';

  testedBy = 'alexaRemoteApiTest';

  icon = 'file:alexa.svg' as const;

  documentationUrl = 'https://github.com/AC-CodeProd/n8n-nodes-alexa-remote';

  properties: INodeProperties[] = [
    {
      displayName: 'Proxy IP',
      name: 'proxyOwnIp',
      type: 'string',
      default: 'localhost',
      description: 'IP address of your n8n server (for proxy authentication)',
    },
    {
      displayName: 'Proxy Port',
      name: 'proxyPort',
      type: 'number',
      default: 3456,
      description: 'Port for proxy authentication',
    },
    {
      displayName: 'Cookie File Path',
      name: 'cookieFile',
      type: 'string',
      default: `${process.env.N8N_USER_FOLDER ?? '/home/node/.n8n'}/.alexa-cookie.json`,
      placeholder: '/home/node/.n8n/.alexa-cookie.json',
      description:
        'Absolute path where the Amazon authentication cookie is stored on disk. Defaults to the n8n data directory (N8N_USER_FOLDER). The file is encrypted with AES-256-GCM when N8N_ENCRYPTION_KEY is set (recommended for production). Restrict directory permissions to the n8n process only (chmod 700).',
    },

    {
      displayName: 'Amazon Service Host',
      name: 'alexaServiceHost',
      type: 'options',
      options: [
        {
          name: 'USA (pitangui.amazon.com)',
          value: 'pitangui.amazon.com',
        },
        {
          name: 'UK (alexa.amazon.co.uk)',
          value: 'alexa.amazon.co.uk',
        },
        {
          name: 'Germany (layla.amazon.de)',
          value: 'layla.amazon.de',
        },
        {
          name: 'France (layla.amazon.de)',
          value: 'layla.amazon.de',
        },
        {
          name: 'Italy (alexa.amazon.it)',
          value: 'alexa.amazon.it',
        },
        {
          name: 'Australia (alexa.amazon.com.au)',
          value: 'alexa.amazon.com.au',
        },
        {
          name: 'Spain (alexa.amazon.es)',
          value: 'alexa.amazon.es',
        },
        {
          name: 'Brazil (alexa.amazon.com.br)',
          value: 'alexa.amazon.com.br',
        },
      ],
      default: 'pitangui.amazon.com',
    },
    {
      displayName: 'Amazon Page',
      name: 'amazonPage',
      type: 'options',
      options: [
        {
          name: 'amazon.com (USA)',
          value: 'amazon.com',
        },
        {
          name: 'amazon.co.uk (UK)',
          value: 'amazon.co.uk',
        },
        {
          name: 'amazon.de (Germany)',
          value: 'amazon.de',
        },
        {
          name: 'amazon.fr (France)',
          value: 'amazon.fr',
        },
        {
          name: 'amazon.it (Italy)',
          value: 'amazon.it',
        },
        {
          name: 'amazon.es (Spain)',
          value: 'amazon.es',
        },
        {
          name: 'amazon.com.au (Australia)',
          value: 'amazon.com.au',
        },
        {
          name: 'amazon.com.br (Brazil)',
          value: 'amazon.com.br',
        },
      ],
      default: 'amazon.com',
    },
    {
      displayName: 'Language',
      name: 'acceptLanguage',
      type: 'options',
      options: [
        {
          name: 'English (US)',
          value: 'en-US',
        },
        {
          name: 'English (UK)',
          value: 'en-GB',
        },
        {
          name: 'German',
          value: 'de-DE',
        },
        {
          name: 'French',
          value: 'de-DE',
        },
        {
          name: 'Italian',
          value: 'it-IT',
        },
        {
          name: 'Spanish',
          value: 'es-ES',
        },
        {
          name: 'Portuguese (BR)',
          value: 'pt-BR',
        },
      ],
      default: 'en-US',
    },

    {
      displayName: 'Refresh Interval (Days)',
      name: 'refreshInterval',
      type: 'number',
      default: 3,
      description: 'Auto-refresh cookie interval in days',
    },
  ];
}
