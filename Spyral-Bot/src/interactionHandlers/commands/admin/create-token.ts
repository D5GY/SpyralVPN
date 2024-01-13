import { ChatInputCommandInteraction } from 'discord.js';
import SpyralAPI from '../../../Utils/spyralAPI';
import Utils from '../../../Utils';
import config from '../../../config';

export default async (interaction: ChatInputCommandInteraction) => {
  const days = interaction.options.getInteger('days', true);

  await interaction.deferReply({ ephemeral: true });

  const token = await SpyralAPI.generateToken(interaction.user.id, days);

  await interaction.editReply({ embeds: [
    Utils.baseEmbed(interaction.client.user, config.colors.main)
      .setTitle('Token generated')
      .setDescription(`Generated a token for ${days} ${Utils.pluralize('day', days)}\nToken: ${token}`)
  ] });
};