import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, DiscordAPIError, PermissionFlagsBits, RESTJSONErrorCodes, roleMention, userMention } from 'discord.js';
import config from '../../config';
import Utils from '../../Utils';

const allowPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks
];

export default async (interaction: ButtonInteraction) => {
  const { user, guild } = interaction;
  await interaction.reply({ ephemeral: true, content: 'Please wait whilst I create your ticket.' });
  
  const ticketType = interaction.customId.split('_')[1] as 'sales' | 'support' | 'other';
  const roleId = ticketType === 'sales' ? config.resellerRoleId : config.supportRoleId;

  const ticketChannel = await guild!.channels.create({
    name: 'creating-ticket',
    type: ChannelType.GuildText,
    nsfw: false,
    parent: config.ticketParentId,
    permissionOverwrites: [
      { id: guild!.roles.everyone.id, deny: PermissionFlagsBits.ViewChannel },
      { id: user.id, allow: allowPermissions },
      { id: roleId, allow: allowPermissions }
    ]
  });

  try {
    await ticketChannel.setName(`${ticketType}-${user.username}`);
  } catch (error) {
    if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.StageTopicServerNameServerDescriptionOrChannelNamesContainDisallowedWords)
      await ticketChannel.setName(`${ticketType}-unknown-user`);
    else
      throw error;
  }

  const message = await ticketChannel.send({
    content: roleMention(roleId),
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
    )],
    embeds: [Utils.baseEmbed(interaction.client.user, config.colors.main)
      .setDescription(`Hello ${userMention(user.id)}, a ${roleMention(roleId)} team member will be with you shortly. Please provide infomation we will need to handle this ticket.`)
    ],
    allowedMentions: { roles: [roleId] }
  });
  await message.pin();

  return interaction.editReply({ content: `Your ticket has been created, you can view it in ${ticketChannel}` });
};