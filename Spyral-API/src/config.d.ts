import { ConnectionConfig } from 'mysql';
import { WebhookClient } from 'discord.js';

interface Config {
  Port: number;
  DatabaseConfig: ConnectionConfig;
  VpnIps: Record<string, string>;
  VpsPort: number;
  SecurityHeader: number[];
  ApiKey: string;
  webhooks: Record<string, WebhookClient>
  EmbedColor: number
}

declare const config: Config;

export default config;