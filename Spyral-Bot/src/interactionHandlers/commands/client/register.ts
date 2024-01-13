import { ChatInputCommandInteraction } from 'discord.js';
import SpyralAPI from '../../../Utils/spyralAPI';
import Utils from '../../../Utils';
import config from '../../../config';

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: false });
  const username = interaction.options.getString('username', true);
  const statusCode = await SpyralAPI.registerClient(interaction.user.id, username);

  if (statusCode === 0) {
    return interaction.editReply({ embeds: [
      Utils.baseEmbed(interaction.client.user, config.colors.main)
        .setTitle('Registration Success')
        .setDescription(`You have successfully registered as ${username}`)
    ] });
  } else {
    return interaction.editReply({ embeds: [
      Utils.baseEmbed(interaction.client.user, config.colors.bad)
        .setTitle('Registration Failure')
        .setDescription(statusCode)
    ]});
  }
};