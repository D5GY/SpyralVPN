import fetch from 'node-fetch';
import config from '../config';
import { join } from 'path';
import ErrorCodes from '../ErrorCodes';
import { TokenData, ClientConnectionInfo, VpnLocation } from 'spyral-types';
import { RequestInit } from 'node-fetch';
import { ChatInputCommandInteraction, InteractionWebhook } from 'discord.js';

export class SpyralError extends Error {
  public constructor(message: string, public code: ErrorCodes) {
    super(message);
  }
}

export default class SpyralAPI {
  private static async requestApi<T = Record<string, unknown>>(
    method: 'get' | 'post', path: string,
    body: Record<string, unknown>,
    webhook?: InteractionWebhook
  ): Promise<T | { error: string; code: ErrorCodes }> {
    let url = join(config.apiUrl, path);
    const options: RequestInit = {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json'
      },
      method
    };

    if (webhook) {
      body = Object.assign({
        webhookId: webhook.id,
        webhookToken: webhook.token
      }, body);
    }
    
    if (method === 'get')
      url = join(url, `?${Object.entries(body).map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`).join('&')}`);
    else 
      options.body = JSON.stringify(body);
    const response = await fetch(url, options);

    if (response.status >= 500)
      throw new Error(`Internal Server Error from API: ${await response.text()}`);
    else if (response.status === 401)
      throw new Error('Not authorized on Spyral API. Has the API Key changed?');
    else if (response.status === 204)
      // if response not required then typecast T to null
      return null as T;

    return response.json();
  }

  public static async generateToken(generatedBy: string, days: number) {
    const response = await this.requestApi<{ token: string }>('post', 'token/create', { generatedBy, days });
    return (response as { token: string }).token;
  }

  public static async getClient(userId: string) {
    const response = await this.requestApi<Client>('get', 'client', { userId });
    
    return 'error' in response ? null : response;
  }

  public static async registerClient(userId: string, username: string) {
    const response = await this.requestApi<null>('post', 'client/register', { userId, username });

    if (!response)
      return 0;
    else if (response.code === ErrorCodes.InvalidUsername || response.code === ErrorCodes.AlreadyRegistered)
      return response.error;

    throw new SpyralError(response.error, response.code);
  }

  public static async getTokenData(token: string) {
    const response = await this.requestApi<TokenData>('get', 'token', { token });

    return 'error' in response ? null : response;
  }

  public static async redeemToken(userId: string, token: string) {
    const response = await this.requestApi<null>('post', 'token/redeem', { userId, token });

    if (!response)
      return true;
    else if (response.code === ErrorCodes.NoClientFound)
      return null;

    return false;
  }

  public static async createClientOvpnConfig(username: string, location: Exclude<VpnLocation, 'TBA'>, { webhook }: ChatInputCommandInteraction) {
    await this.requestApi<null>('post', 'client/create-config', { username, location }, webhook);
  }

  public static async getClientConnectionInfo(username: string, location: string) {
    const response = await this.requestApi<ClientConnectionInfo | { text: string }>('get', 'client/info', { username, location });
    
    return 'text' in response ? null : response as ClientConnectionInfo;
  }

  public static getVpnServerStatus() {
    return this.requestApi<ServerStatus>('get', 'status', {}) as Promise<ServerStatus>;
  }
}

export interface Client {
  discord: string;
  location: VpnLocation;
  expiry: string;
  username: string;
}

export type ServerStatus = Record<string, {
  server: string;
  connectedClients: number;
  rx_bytes: string;
  tx_bytes: string;
  openVpnStatus: string;
  lastUpdated: Date;
  pingToMainVps: number;
}>
