import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, GuildChannel } from 'discord.js';
import config from '../../config';
import Utils from '../../Utils';

export default async (interaction: ButtonInteraction) => {
  await interaction.deferReply({ ephemeral: false });

  await (interaction.channel as GuildChannel).permissionOverwrites.edit(interaction.guild!.roles.everyone.id, {
    SendMessages: false
  });

  return interaction.editReply({
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_deny')
        .setLabel('Cancel')
        .setEmoji(config.emojis.crossId)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_confirm')
        .setLabel('Confirm')
        .setEmoji(config.emojis.checkmarkId)
        .setStyle(ButtonStyle.Primary)
    )],
    embeds: [Utils.baseEmbed(interaction.client.user, config.colors.main)
      .setDescription('Are you sure you would like to close this ticket?')
    ]
  });
};