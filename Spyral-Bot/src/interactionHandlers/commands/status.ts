import { ChatInputCommandInteraction } from 'discord.js';
import SpyralAPI from '../../Utils/spyralAPI';
import Utils from '../../Utils';
import config from '../../config';

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: false });
  const serverIp = config.serverAddresses[interaction.options.getString('server', true) as keyof typeof config.serverAddresses];
  const serverStatus = (await SpyralAPI.getVpnServerStatus())[serverIp];

  return interaction.editReply({ embeds: [
    Utils.baseEmbed(interaction.client.user, config.colors.main)
      .setDescription(`Status was last updated: ${Utils.timeElapsed(new Date(serverStatus.lastUpdated))} ago`)
      .setFields([
        { name: 'Connected Users', value: serverStatus.connectedClients.toString(), inline: true },
        { name: 'TX Bytes (transmitted)', value: Utils.formatBytes(parseInt(serverStatus.tx_bytes)), inline: true },
        { name: 'RX Bytes (received)', value: Utils.formatBytes(parseInt(serverStatus.rx_bytes)), inline: true },
        { name: 'OpenVPN Status', value: serverStatus.openVpnStatus.trim() },
        { name: 'Ping to main VPS', value: `${serverStatus.pingToMainVps}ms` }
      ])
  ] });
};
