import { ClientOptions, Snowflake, WebhookClient } from 'discord.js';

interface Config {
  token: string;
  spyralGuildId: Snowflake;
  apiKey: string;
  clientOptions: ClientOptions;
  colors: Record<string, number>;
  webhooks: Record<string, WebhookClient>;
  spyralDomain: string;
  websiteUrl: string;
  pricingUrl: string;
  apiUrl: string;
  customerRoleId: Snowflake;
  ticketParentId: Snowflake;
  supportRoleId: Snowflake;
  resellerRoleId: Snowflake;
  adminRoleId: Snowflake;
  emojis: Record<string, Snowflake>;
  serverAddresses: Record<string, string>;
}

declare const config: Config;

export default config;
