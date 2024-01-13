import { GuildMember, time } from 'discord.js';
import config from '../config';
import Utils from '../Utils';

export default async (member: GuildMember) => {
  config.webhooks.memberJoin.send({ embeds: [
    Utils.baseEmbed(member.client.user, config.colors.good)
      .setTitle('New member joined')
      .setDescription(`There are now ${member.guild.memberCount} members`)
      .setThumbnail(member.displayAvatarURL())
      .addFields(
        { name: 'Member', value: `${member} | ${member.user.tag} | ${member.id}` },
        { name: 'Account created', value: `${time(member.user.createdAt, 'F')} | ${time(member.user.createdAt, 'R')}` }
      )
  ]});
};