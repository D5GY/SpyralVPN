import { ChatInputCommandInteraction } from 'discord.js';
import Utils from '../../Utils';
import config from '../../config';
import { join } from 'path';

export default async (interaction: ChatInputCommandInteraction) => {
  const ping = Date.now() - interaction.createdTimestamp;
  await interaction.deferReply({ ephemeral: false });
  const start = Date.now();
  const { database } = await fetch(join(config.apiUrl, 'ping'), { headers: {
    'Content-Type': 'application/json'
  } }).then(res => res.json());
  await interaction.editReply({ embeds: [
    Utils.baseEmbed(interaction.client.user, config.colors.main)
      .setTitle('Ping')
      .setDescription(
        `WebSocket API Ping: ${interaction.client.ws.ping}ms
REST API Ping: ${ping}ms
Database Ping (From API): ${database}ms
Round trip to API: ${Date.now() - start}ms`
      )
  ] });
};