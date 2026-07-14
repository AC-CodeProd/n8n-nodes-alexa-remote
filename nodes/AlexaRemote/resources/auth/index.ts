import { existsSync } from 'node:fs';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  AlexaRemoteExt,
  createAlexaFromCredentials,
  normalizeProxyPort,
  refreshAlexaCookieFromCredentials,
  stopLoginProxyServer,
} from '../../lib/alexa-remote-ext';
import { writeCookieFile } from '../../lib/cookie-crypto';

function getRefreshErrorDetails(err: unknown): { message: string; code?: string } {
  const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
  const rawCode =
    err && typeof err === 'object'
      ? (err as NodeJS.ErrnoException).code
      : undefined;
  return { message, code: typeof rawCode === 'string' ? rawCode : undefined };
}

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
      {
        name: 'Refresh Cookie',
        value: 'refreshCookie',
        description: 'Force a token refresh and save the updated cookie to disk. Use with a Schedule Trigger to keep your session alive.',
        action: 'Refresh cookie',
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
  const operation = this.getNodeParameter('operation', 0) as string;

  if (operation === 'refreshCookie') {
    const cookiePath = credentials.cookieFile as string;
    let alexa: AlexaRemoteExt | undefined;

    try {
      const refreshedCookie = await refreshAlexaCookieFromCredentials(credentials);

      this.logger.info(
        `[Alexa Remote] Refresh resolved: loginCookie=${typeof refreshedCookie.loginCookie === 'string'}, localCookie=${typeof refreshedCookie.localCookie === 'string'}, refreshToken=${typeof refreshedCookie.refreshToken === 'string'}, macDms=${Boolean(refreshedCookie.macDms)}, csrf=${typeof refreshedCookie.csrf === 'string'}`,
      );

      alexa = await createAlexaFromCredentials(credentials, false, refreshedCookie);
      const devices = await alexa.getDevices();

      if (!Array.isArray(devices)) {
        throw new Error('Alexa device canary returned an invalid response.');
      }

      this.logger.info(`[Alexa Remote] Refresh validation succeeded: devicesCount=${devices.length}`);

      const dataToPersist = alexa.getInternalCookieData() ?? refreshedCookie;
      let cookieFormat: string;
      try {
        cookieFormat = writeCookieFile(cookiePath, JSON.stringify(dataToPersist, null, 2));
      } catch (writeError) {
        const msg = writeError instanceof Error ? writeError.message : String(writeError);
        throw new NodeOperationError(
          this.getNode(),
          `Cookie refreshed and validated, but writing the cookie file failed: ${msg}`,
        );
      }

      return [
        [
          {
            json: {
              success: true,
              message: 'Cookie refreshed and validated successfully.',
              cookieFile: cookiePath,
              cookieFormat,
              devicesCount: devices.length,
            },
          },
        ],
      ];
    } catch (err) {
      if (err instanceof NodeOperationError) {
        // eslint-disable-next-line @n8n/community-nodes/require-node-api-error
        throw err;
      }

      const { message: msg, code } = getRefreshErrorDetails(err);

      this.logger.error(
        `[Alexa Remote] Refresh cookie failed: ${msg}${code ? ` | code=${code}` : ''}`,
      );

      if (['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH'].includes(code ?? '')) {
        throw new NodeOperationError(
          this.getNode(),
          `Network error while refreshing cookie: ${msg}`,
          {
            description:
              'This is a temporary DNS or connectivity issue. Check your internet connection and try again.',
          },
        );
      }

      if (
        msg.includes('interactive login would be required') ||
        msg.includes('Proxy Server could not be initialized') ||
        /please open http:\/\//i.test(msg)
      ) {
        stopLoginProxyServer();
        throw new NodeOperationError(
          this.getNode(),
          'Cookie refresh could not be validated without an interactive login. Run Auth → Authenticate again.',
          {
            description:
              'The refreshed cookie was rejected during headless validation (commonly a missing device JWT/macDms or an expired registration), so alexa-remote2 tried to fall back to the interactive login proxy. A full re-authentication is required — the proxy cannot complete an automated refresh.',
          },
        );
      }

      if (msg.includes('No tokens in Register response')) {
        throw new NodeOperationError(
          this.getNode(),
          'Cookie refresh was rejected by Amazon. Run Auth → Authenticate again.',
          {
            description:
              'Amazon did not return the expected registration tokens during refresh.',
          },
        );
      }

      throw new NodeOperationError(this.getNode(), `Failed to refresh cookie: ${msg}`);
    } finally {
      alexa?.disconnect();
    }
  }

  const loginTimeout = (this.getNodeParameter('loginTimeout', 0, 5) as number) * 60 * 1000;
  const cookiePath = credentials.cookieFile as string;
  const proxyOwnIp = credentials.proxyOwnIp as string;
  const proxyPort = normalizeProxyPort(credentials.proxyPort);

  if (!proxyOwnIp || proxyPort === undefined) {
    throw new NodeOperationError(
      this.getNode(),
      'Proxy IP and Proxy Port must be configured in credentials before authentication.',
    );
  }

  const proxyUrl = `http://${proxyOwnIp}:${proxyPort}`;

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

  let cookieFormat = 'missing';
  if (cookiePath) {
    try {
      const toWrite = JSON.stringify(cookieStr, null, 2);
      cookieFormat = writeCookieFile(cookiePath, toWrite);
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
          cookieFormat,
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
