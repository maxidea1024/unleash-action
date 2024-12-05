import { UnleashClient } from 'unleash-proxy-client';
import { Metrics } from './metrics';

interface ICreateUnleashActionOptions {
  url: string;
  clientKey: string;
  appName: string;
  context: Record<string, string>;
  features?: string[];
  variants?: string[];
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  setResult: (name: string, value: any) => void;
}

interface IUnleashActionOptions extends ICreateUnleashActionOptions {
  client: UnleashClient;
  metrics: Metrics;
}

export const createUnleashAction = async (
  options: ICreateUnleashActionOptions,
): Promise<void> => {
  const client = createClient(options);
  const metrics = createMetrics(options);
  const action = new UnleashAction({ ...options, client, metrics });
  await action.run();
  await action.end();
};

const createMetrics = (options: ICreateUnleashActionOptions): Metrics => {
  return new Metrics({
    headerName: 'Authorization',
    appName: options.appName,
    url: options.url,
    clientKey: options.clientKey,
  });
};

const createClient = (options: ICreateUnleashActionOptions): UnleashClient => {
  return new UnleashClient({
    appName: options.appName,
    url: options.url,
    clientKey: options.clientKey,
    refreshInterval: 0,
    metricsInterval: 0,
    disableMetrics: true,
  });
};

export class UnleashAction {
  private readonly unleash: UnleashClient;
  private readonly metrics: Metrics;
  private readonly features: string[];
  private readonly variants: string[];
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  private readonly setResult: (name: string, value: any) => void;

  constructor(options: IUnleashActionOptions) {
    this.unleash = options.client;
    this.metrics = options.metrics;

    this.unleash.on('ready', () => {
      console.log('Ready!');
    });

    this.features = options.features || [];
    this.variants = options.variants || [];
    this.setResult = options.setResult;
  }

  async run(): Promise<void> {
    console.log('starting.');
    await this.unleash.start();

    console.log('Checking features.');
    await this.checkFeatures();

    console.log('Checking variants.');
    await this.checkVariants();
  }

  async end(): Promise<void> {
    console.log('Sending metrics.');
    await this.metrics.sendMetrics();

    console.log('Stopping.');
    this.unleash.stop(); // FIXME: stop()에 async가 지원되어야하지 않을까?
  }

  private async checkFeatures(): Promise<void> {
    // this.features.forEach((featureName) => {
    //   const isEnabled = this.unleash.isEnabled(featureName);
    //   this.metrics.count(featureName, isEnabled);
    //   this.setResult(featureName, isEnabled);
    // });
    for (const featureName of this.features) {
      const isEnabled = this.unleash.isEnabled(featureName);
      this.metrics.count(featureName, isEnabled);
      this.setResult(featureName, isEnabled);
    }
  }

  private async checkVariants(): Promise<void> {
    // this.variants.forEach((featureName) => {
    //   const variant = this.unleash.getVariant(featureName);
    //   if (variant.name) {
    //     this.metrics.countVariant(featureName, variant.name);
    //   }
    //   this.metrics.count(featureName, variant.enabled);
    //   this.setResult(featureName, variant.enabled);

    //   if (variant.enabled) {
    //     this.setResult(
    //       `${featureName}_variant`,
    //       variant.payload?.value,
    //     );
    //   }
    // });
    for (const featureName of this.variants) {
      const variant = this.unleash.getVariant(featureName);
      if (variant.name) {
        this.metrics.countVariant(featureName, variant.name);
      }
      this.metrics.count(featureName, variant.enabled);
      this.setResult(featureName, variant.enabled);

      if (variant.enabled) {
        this.setResult(
          `${featureName}_variant`,
          variant.payload?.value,
        );
      }
    }
  }
}
