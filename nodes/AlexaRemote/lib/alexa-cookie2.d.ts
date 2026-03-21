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
	interface AlexaCookieModule {
		generateAlexaCookie(
			email: string | undefined,
			password: string | undefined,
			config: AlexaCookieConfig,
			callback: (err: Error | null, result: unknown) => void,
		): void;
		stopProxyServer(callback?: () => void): void;
	}
	const instance: AlexaCookieModule;
	export = instance;
}
