import { existsSync } from 'node:fs';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { AlexaRemoteExt } from '../../lib/alexa-remote-ext';
import { writeCookieFile } from '../../lib/cookie-crypto';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['auth'],
      },
    },
    options: [
      {
        name: 'Authenticate',
        value: 'authenticate',
        description:
          'Start the proxy and wait for Amazon login. Once executed, open the proxy URL (http://[Proxy Own IP]:[Proxy Port]/ from your credentials) in your browser to complete the Amazon login.',
        action: 'Authenticate via proxy',
      },
    ],
    default: 'authenticate',
  },
  {
    displayName: 'Once the workflow is running, open the proxy URL (http://[Proxy Own IP]:[Proxy Port]/ as configured in your credentials) in your browser to complete the Amazon login.',
    name: 'authNotice',
    type: 'notice',
    default: '',
    displayOptions: {
      show: {
        resource: ['auth'],
        operation: ['authenticate'],
      },
    },
  },
  {
    displayName: 'Login Timeout (Minutes)',
    name: 'loginTimeout',
    type: 'number',
    default: 5,
    displayOptions: {
      show: {
        resource: ['auth'],
        operation: ['authenticate'],
      },
    },
    description:
      'Maximum time to wait for the user to complete the Amazon login in their browser (minutes)',
  },
];

export async function execute(
  this: IExecuteFunctions,
  credentials: Record<string, unknown>,
): Promise<INodeExecutionData[][]> {
  const loginTimeout = (this.getNodeParameter('loginTimeout', 0, 5) as number) * 60 * 1000;
  const cookiePath = credentials.cookieFile as string;
  const proxyOwnIp = credentials.proxyOwnIp as string;
  const proxyPort = credentials.proxyPort as number;
  const proxyUrl = `http://${proxyOwnIp}:${proxyPort}`;

  if (!proxyOwnIp || !Number.isFinite(proxyPort) || proxyPort <= 0) {
    throw new NodeOperationError(
      this.getNode(),
      'Proxy IP and Proxy Port must be configured in credentials before authentication.',
    );
  }

  if (!Number.isFinite(loginTimeout) || loginTimeout <= 0) {
    throw new NodeOperationError(
      this.getNode(),
      'Login Timeout must be greater than 0 minutes.',
    );
  }

  const authProxy = new AlexaRemoteExt();
  let resolvedProxyUrl = proxyUrl;

  let cookieStr: Record<string, unknown>;
  try {
    cookieStr = await authProxy.startProxyAuth(
      {
        alexaServiceHost: credentials.alexaServiceHost as string,
        amazonPage: credentials.amazonPage as string,
        acceptLanguage: credentials.acceptLanguage as string,
        proxyOwnIp,
        proxyPort,
      },
      loginTimeout,
      (url) => {
        resolvedProxyUrl = url;
        this.logger.info(`[Alexa Remote] Proxy ready — open your browser: ${url}`);
      },
    );
  } finally {
    authProxy.disconnect();
  }

  if (cookiePath) {
    try {
      const toWrite = JSON.stringify(cookieStr, null, 2);
      writeCookieFile(cookiePath, toWrite);
      this.logger.info(`[Alexa Remote] Cookie saved to: ${cookiePath}`);
    } catch (writeError) {
      const msg = writeError instanceof Error ? writeError.message : String(writeError);
      throw new NodeOperationError(
        this.getNode(),
        `Authentication succeeded but failed to write cookie file: ${msg}`,
      );
    }
  }

  return [
    [
      {
        json: {
          success: true,
          message: 'Authentication successful. Cookie saved.',
          cookieFile: credentials.cookieFile as string,
          proxyUrl: resolvedProxyUrl,
        },
      },
    ],
  ];
}

export function guardCookieFile(
  this: IExecuteFunctions,
  credentials: Record<string, unknown>,
): void {
  if (!credentials.cookieFile) {
    throw new NodeOperationError(
      this.getNode(),
      'Cookie File Path is required. Set a valid path in the credentials (e.g. /home/node/.n8n/.alexa-cookie.json).',
    );
  }

  const cookiePath = credentials.cookieFile as string;

  if (!existsSync(cookiePath)) {
    throw new NodeOperationError(
      this.getNode(),
      `Cookie file not found at "${cookiePath}". Run the "Auth → Authenticate" operation first to complete Amazon login.`,
      {
        description:
          'Add this node with Resource = "Auth" and Operation = "Authenticate", run it once, and follow the browser login prompt.',
      },
    );
  }
}
