import { Collection, ChatInputCommandInteraction, Message, Snowflake } from 'discord.js';

export default async (interaction: ChatInputCommandInteraction) => {
  const amount = interaction.options.getInteger('amount', true);
  if (amount <= 0 || amount > 100) {
    await interaction.reply({
      content: 'Purge amount should be more than 0 and less than 101.',
      ephemeral: true
    });
    return;
  }

  const channel = interaction.channel;

  if (!channel || !('bulkDelete' in channel)) {
    await interaction.reply({
      content: 'Bulk deletes cannot be performed in this channel.',
      ephemeral: true
    });
    return;
  }

  const before = interaction.options.getString('before', false) as Snowflake | null;
  const after = interaction.options.getString('after', false) as Snowflake | null;
  const user = interaction.options.getUser('from', false);
  if (before && after) {
    await interaction.reply({
      ephemeral: true,
      content: 'The `after` and `before` parameters are mutually exclusive, you cannot use both.'
    });
    return;
  }
  let param: Collection<Snowflake, Message> | number = amount;

  await interaction.deferReply({ ephemeral: true });

  if (before || after || user) {
    param = await channel.messages.fetch({
      after: after ?? undefined,
      before: before ?? undefined,
      limit: amount
    });
    if (user) {
      param = param.filter(msg => msg.author.id === user.id);
    }

    param = param.filter(msg => msg.bulkDeletable);
  }

  await channel.bulkDelete(param, true);

  await interaction.editReply({
    content: `Purged ${amount} messages.`
  });
};