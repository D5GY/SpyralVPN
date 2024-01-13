import { ButtonInteraction } from 'discord.js';
import config from '../../config';

export default async (interaction: ButtonInteraction) => {
  const member = await interaction.guild!.members.fetch(interaction.user);
  if (!member.roles.cache.has(config.adminRoleId))
    return interaction.reply({ ephemeral: true, content: 'You don\'t have permissions to do this.' });

  await interaction.channel!.delete();
};