import { fetch } from './fetch.cjs';

interface MetricsOptions {
  headerName: string;
  appName: string;
  url: string;
  clientKey: string;
}

interface VariantBucket {
  [s: string]: number;
}

interface Bucket {
  start: Date;
  stop: Date | null;
  toggles: {
    [s: string]: { yes: number; no: number; variants: VariantBucket };
  };
}

interface Payload {
  bucket: Bucket;
  appName: string;
  instanceId: string;
}

export class Metrics {
  private readonly appName: string;
  private readonly url: string;
  private readonly clientKey: string;
  private readonly headerName: string;
  private bucket: Bucket;

  constructor(options: MetricsOptions) {
    this.appName = options.appName;
    this.url = options.url;
    this.clientKey = options.clientKey;
    this.headerName = options.headerName;
    this.bucket = this.createEmptyBucket();
  }

  private createEmptyBucket(): Bucket {
    return {
      start: new Date(),
      stop: null,
      toggles: {},
    };
  }

  private getPayload(): Payload {
    const bucket = { ...this.bucket, stop: new Date() };
    this.bucket = this.createEmptyBucket();

    return {
      bucket,
      appName: this.appName,
      instanceId: 'workflow',
    };
  }

  private getHeaders() {
    const headers = {
      [this.headerName]: this.clientKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    return headers;
  }

  async sendMetrics(): Promise<void> {
    const url = `${this.url}/client/metrics`;
    const payload = this.getPayload();

    if (this.bucketIsEmpty(payload)) {
      return;
    }

    try {
      await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: this.getHeaders(),
      });
    } catch (e) {
      console.error('Unleash: unable to send feature metrics', e);
    }
  }

  private ensureBucket(name: string) {
    if (!this.bucket.toggles[name]) {
      this.bucket.toggles[name] = {
        yes: 0,
        no: 0,
        variants: {},
      };
    }
  }

  private bucketIsEmpty(payload: Payload) {
    return Object.keys(payload.bucket.toggles).length === 0;
  }

  async count(featureName: string, enabled: boolean): Promise<void> {
    this.ensureBucket(featureName);

    this.bucket.toggles[featureName][enabled ? 'yes' : 'no']++;
  }

  async countVariant(
    featureName: string,
    variant: string,
  ): Promise<void> {
    this.ensureBucket(featureName);

    if (this.bucket.toggles[featureName].variants[variant]) {
      this.bucket.toggles[featureName].variants[variant] += 1;
    } else {
      this.bucket.toggles[featureName].variants[variant] = 1;
    }
  }
}
