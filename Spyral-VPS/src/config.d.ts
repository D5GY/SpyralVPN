import { WebhookClient } from 'discord.js';

interface Config {
  Port: number;
  SecurityHeader: number[];
  AmsterdamIp: string;
  OpenVPNLogsFile: string;
  connectionLogsWebhook: WebhookClient;
  location: string;
  embed: {
    thumbnailUrl: string;
    authorIconURL: string,
    location: string;
  };
  colors: Record<string, number>;
  NetworkInterface: string;
  apiUrl: string;
}

declare const config: Config;

export default config;
