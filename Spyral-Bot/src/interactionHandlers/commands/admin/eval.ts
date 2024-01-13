import { ChatInputCommandInteraction, codeBlock } from 'discord.js';
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-var-requires */
const djs = require('discord.js');
const util: typeof import('util') = require('util');
const config: typeof import('../../../config').default = require('../../../config').default;
const fetch: typeof import('node-fetch').default = require('node-fetch');
/* eslint-enable @typescript-eslint/no-var-requires */
/* eslint-enable @typescript-eslint/no-unused-vars */

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: false });
  try {
    const code = interaction.options.getString('code', true);
    const async = interaction.options.getBoolean('async', false);
    const depth = interaction.options.getInteger('depth', false) ?? undefined;
      
    const result = util.inspect(await eval(async ? `(async()=>{${code}})();` : code), {
      colors: false,
      depth,
    }).replaceAll(interaction.client.token, 'ok boomer').replaceAll(config.apiKey, 'ok mr boomer');

    if (result.length > 1500) {
      const json = await fetch('https://hastebin.skyra.pw/documents', {
        body: result,
        headers: {
          'Content-Type': 'application/json'
        }, method: 'POST'
      }).then(res => res.json());
      return interaction.editReply({ content: `Output posted to https://hastebin.skyra.pw/${json.key}` });
    }

    return interaction.editReply({content: codeBlock('js', result) });
  } catch (error) {
    return interaction.editReply({ content: `ERROR: ${codeBlock('js', util.inspect(error))}` });
  }
};