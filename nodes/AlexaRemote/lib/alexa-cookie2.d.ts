declare module 'alexa-cookie2' {
  interface AlexaCookieConfig {
    proxyOnly?: boolean;
    setupProxy?: boolean;
    proxyOwnIp?: string;
    proxyPort?: number;
    proxyListenBind?: string;
    alexaServiceHost?: string;
    amazonPage?: string;
    acceptLanguage?: string;
    proxyLogLevel?: string;
  }

  interface AlexaCookieRefreshConfig {
    alexaServiceHost?: string;
    amazonPage?: string;
    acceptLanguage?: string;
    proxyOwnIp?: string;
    proxyPort?: number;
    formerRegistrationData: Record<string, unknown>;
  }

  interface AlexaCookieModule {
    generateAlexaCookie(
      email: string | undefined,
      password: string | undefined,
      config: AlexaCookieConfig,
      callback: (err: Error | null, result: unknown) => void,
    ): void;

    refreshAlexaCookie(
      config: AlexaCookieRefreshConfig,
      callback: (err: Error | null, result: unknown) => void,
    ): void;

    stopProxyServer(callback?: () => void): void;
  }

  const instance: AlexaCookieModule;
  export = instance;
}