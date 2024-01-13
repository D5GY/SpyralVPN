import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, GuildChannel } from 'discord.js';
import Utils from '../../Utils';
import config from '../../config';

export default async (interaction: ButtonInteraction) => {
  await interaction.deferReply({ ephemeral: false });
  
  const action = interaction.customId.split('_')[1] as 'confirm' | 'deny';

  if (action === 'deny') {
    await (interaction.channel as GuildChannel).permissionOverwrites.edit(interaction.guild!.roles.everyone.id, {
      SendMessages: null
    });
    await interaction.message.delete();
    return interaction.editReply({ content: 'Cancelled, ticket will not be closed.' });
  }
  return interaction.editReply({
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_delete')
        .setLabel('Delete ticket')
        .setStyle(ButtonStyle.Primary)
    )],
    embeds: [Utils.baseEmbed(interaction.client.user, config.colors.main)
      .setDescription('Ticket is now closed.')
    ]
  });
};