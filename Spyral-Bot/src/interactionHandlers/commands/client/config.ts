import { ChatInputCommandInteraction, chatInputApplicationCommandMention as commandMention } from 'discord.js';
import SpyralAPI from '../../../Utils/spyralAPI';
import Utils from '../../../Utils';
import config from '../../../config';
import { VpnLocation } from 'spyral-types';

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });
  const client = await SpyralAPI.getClient(interaction.user.id);

  if (!client)
    return interaction.editReply({ embeds: [
      Utils.baseEmbed(interaction.client.user, config.colors.bad)
        .setTitle('Error')
        .setDescription(`You are not registered. please use the ${commandMention('client register', interaction.commandId)} command.`)
    ] });
  
  const location = (interaction.options.getString('location', false) ?? client.location) as VpnLocation;
  
  if (location === 'TBA') {
    return interaction.editReply({ embeds: [
      Utils.baseEmbed(interaction.client.user, config.colors.bad)
        .setTitle('Location Error')
        .setDescription('Please select a location as you do not have a configured location to automatically select from.')
    ] });
  }

  if (new Date(client.expiry).getTime() <= Date.now())
    return interaction.editReply({ embeds: [
      Utils.baseEmbed(interaction.client.user, config.colors.bad)
        .setTitle('Error')
        .setDescription(`Your time is expired. Please purchase a token and use the ${commandMention('client redeem-token', interaction.commandId)} command to get access.`)
    ] });
  
  if (client.location !== 'TBA' && client.location !== location)
    return await interaction.editReply({ embeds: [
      Utils.baseEmbed(interaction.client.user, config.colors.bad)
        .setTitle('Error')
        .setDescription(`You already have a config setup for ${client.location}, please contact an admin if you wish to change.`)
    ] });

  return SpyralAPI.createClientOvpnConfig(client.username, location, interaction);
};