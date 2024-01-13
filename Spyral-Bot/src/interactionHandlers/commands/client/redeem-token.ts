import { ChatInputCommandInteraction, chatInputApplicationCommandMention as commandMention } from 'discord.js';
import SpyralAPI from '../../../Utils/spyralAPI';
import Utils from '../../../Utils';
import config from '../../../config';

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });
  const code = interaction.options.getString('token', true);
  const response = await SpyralAPI.redeemToken(interaction.user.id, code);
  if (response === null)
    return interaction.editReply({ embeds: [
      Utils.baseEmbed(interaction.client.user, config.colors.bad)
        .setTitle('Error')
        .setDescription(`You are not registered. Please use the ${commandMention('client register', interaction.commandId)} command.`)
    ]});

  
  if (response) try {
    await (await interaction.guild!.members.fetch(interaction.user.id)).roles.add(config.customerRoleId);
  } catch (error) {
    console.error('Error adding customer role:', error);
  }

  if (response)
    return interaction.editReply({ embeds: [
      Utils.baseEmbed(interaction.client.user, config.colors.main)
        .setTitle('Token redeemed')
        .setDescription(
          `You have successfully redeemed your token, please use the ${commandMention('client config', interaction.commandId)
          } command to create and get your OpenVPN config!`)
    ] });
  else
    return interaction.editReply({ embeds: [
      Utils.baseEmbed(interaction.client.user, config.colors.bad)
        .setTitle('Invalid token')
        .setDescription('The token you have provided is not valid. It is either expired or already used')
    ] });
};