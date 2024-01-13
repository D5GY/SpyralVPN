import { GuildMember, time } from 'discord.js';
import config from '../config';
import Utils from '../Utils';

export default async (member: GuildMember) => {
  config.webhooks.memberLeave.send({ embeds: [
    Utils.baseEmbed(member.client.user, config.colors.bad)
      .setTitle('Member left')
      .setDescription(`There are now ${member.guild.memberCount} members`)
      .setThumbnail(member.displayAvatarURL())
      .addFields(
        { name: 'Member', value: `${member} | ${member.user.tag} | ${member.id}` },
        { name: 'Member joined', value: `${time(member.joinedAt!, 'F')} | ${time(member.joinedAt!, 'R')}` }
      )
  ]});
};