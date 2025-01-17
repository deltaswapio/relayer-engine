import { HttpClient, HttpClientError } from "./http-client.js";

export interface Deltaswapscan {
  listVaas: (
    chain: number,
    emitterAddress: string,
    opts?: DeltaswapscanOptions,
  ) => Promise<DeltaswapscanResult<DeltaswapscanVaa[]>>;
  getVaa: (
    chain: number,
    emitterAddress: string,
    sequence: bigint,
    opts?: DeltaswapscanOptions,
  ) => Promise<DeltaswapscanResult<DeltaswapscanVaa>>;
}

/**
 * Client for the deltaswapscan API that never throws, but instead returns a DeltaswapscanResult that may contain an error.
 */
export class DeltaswapscanClient implements Deltaswapscan {
  private baseUrl: URL;
  private defaultOptions?: DeltaswapscanOptions;
  private client: HttpClient;

  constructor(baseUrl: URL, defaultOptions?: DeltaswapscanOptions) {
    this.baseUrl = baseUrl;
    this.defaultOptions = defaultOptions;
    this.client = new HttpClient({
      timeout: defaultOptions?.timeout,
      retries: defaultOptions?.retries,
      initialDelay: defaultOptions?.initialDelay,
      maxDelay: defaultOptions?.maxDelay,
      cache: defaultOptions?.noCache ? "no-cache" : "default",
    });
  }

  public async listVaas(
    chain: number,
    emitterAddress: string,
    opts?: DeltaswapscanOptions,
  ): Promise<DeltaswapscanResult<DeltaswapscanVaa[]>> {
    try {
      const response = await this.client.get<{
        data: DeltaswapscanVaaResponse[];
      }>(
        `${
          this.baseUrl
        }api/v1/vaas/${chain}/${emitterAddress}?page=${this.getPage(
          opts,
        )}&pageSize=${this.getPageSize(opts)}`,
        opts,
      );

      return {
        data: response.data.map(v => {
          return {
            ...v,
            vaa: Buffer.from(v.vaa, "base64"),
          };
        }),
      };
    } catch (err: Error | any) {
      return { error: err, data: [] };
    }
  }

  public async getVaa(
    chain: number,
    emitterAddress: string,
    sequence: bigint,
    opts?: DeltaswapscanOptions,
  ): Promise<DeltaswapscanResult<DeltaswapscanVaa>> {
    try {
      const response = await this.client.get<{ data: DeltaswapscanVaaResponse }>(
        `${
          this.baseUrl
        }api/v1/vaas/${chain}/${emitterAddress}/${sequence.toString()}`,
        opts,
      );
      return {
        data: {
          ...response.data,
          vaa: Buffer.from(response.data.vaa, "base64"),
        },
      };
    } catch (err: Error | any) {
      return this.mapError(err);
    }
  }

  private mapError(err: Error | any) {
    if (err instanceof HttpClientError) {
      return { error: err };
    }

    return { error: new HttpClientError(err.message) };
  }

  private getPage(opts?: DeltaswapscanOptions) {
    return opts?.page ?? this.defaultOptions?.page ?? 0;
  }

  private getPageSize(opts?: DeltaswapscanOptions) {
    return opts?.pageSize ?? this.defaultOptions?.pageSize ?? 10;
  }
}

export type DeltaswapscanOptions = {
  pageSize?: number;
  page?: number;
  retries?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
  noCache?: boolean;
};

class DeltaswapscanVaaResponse {
  id: string;
  sequence: bigint;
  vaa: string;
  emitterAddr: string;
  emitterChain: number;
}

export type DeltaswapscanVaa = {
  id: string;
  sequence: bigint;
  vaa: Buffer;
  emitterAddr: string;
  emitterChain: number;
  txHash?: string;
};

export type DeltaswapscanResult<T> = {
  error?: HttpClientError;
  data?: T;
};
