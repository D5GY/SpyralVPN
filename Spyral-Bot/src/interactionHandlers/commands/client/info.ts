import { ChatInputCommandInteraction, chatInputApplicationCommandMention as commandMention, bold, time, hyperlink } from 'discord.js';
import SpyralAPI from '../../../Utils/spyralAPI';
import Utils from '../../../Utils';
import config from '../../../config';

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: false });
  const client = await SpyralAPI.getClient(interaction.user.id);

  if (!client)
    return interaction.editReply({
      embeds: [
        Utils.baseEmbed(interaction.client.user, config.colors.bad)
          .setTitle('Error')
          .setDescription(`You are not registered. Please use the ${commandMention('client register', interaction.commandId)} command.`)
      ]
    });

  const expiryTimestamp = new Date(client.expiry).getTime();

  const infoEmbed = Utils.baseEmbed(interaction.client.user, config.colors.main)
    .setTitle(`${interaction.user.username} information`)
    .setFields({
      name: 'Client Information',
      value: `Username: ${bold(client.username)}
Expiry: ${expiryTimestamp <= Date.now() ? hyperlink('Expired, purchase time now!', config.pricingUrl) : time(Math.floor(expiryTimestamp / 1000), 'R')}
Location: ${bold(client.location)}`
    });

  if (client.location === 'TBA')
    return await interaction.editReply({
      embeds: [
        infoEmbed.addFields({
          name: 'Client Activity',
          value: `Please create a config. using ${commandMention('client config', interaction.commandId)}`
        })
      ]
    });

  const VPNInfo = await SpyralAPI.getClientConnectionInfo(client.username, client.location);

  return interaction.editReply({
    embeds: [
      infoEmbed
        .addFields({
          name: 'Client Activity',
          value: VPNInfo !== null
            ? `Bytes Received: ${bold(Utils.formatBytes(VPNInfo.bytesRecv))}
Bytes Sent: ${bold(Utils.formatBytes(VPNInfo.bytesSent))}
Time Connected: ${bold(Utils.timeElapsed(new Date(VPNInfo.connectedSince)))}
Connected Port: ${bold(VPNInfo.port)}`
            : 'To see client activity you must be connected to the VPN.'
        })
    ]
  });
};