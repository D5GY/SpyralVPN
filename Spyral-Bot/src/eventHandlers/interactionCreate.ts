import { Awaitable, Interaction, InteractionType } from 'discord.js';
import { promises as fs } from 'fs';
import { join } from 'path';

type InteractionHandler = (interaction: Interaction, ...args: string[]) => Awaitable<void>;
const interactionHandlers = new Map<string, InteractionHandler>();

const unfoldString = (str: string) => {
  const majors = str.split('_');
  const minors = majors.map(value => value.split(','));
  const minorCounts = minors.map(value => value.length);
  const totalCount = minorCounts.reduce((prev, cur) => (prev * cur));
  const subs = new Array<string>(totalCount);

  for (let i = 0; i < totalCount; i++) {
    const indexTree = new Array<number>(majors.length);
    indexTree[indexTree.length - 1] = i;

    for (let j = indexTree.length - 2; j >= 0; j--) {
      indexTree[j] = (indexTree[j + 1] - (indexTree[j + 1] % minorCounts[j + 1])) / minorCounts[j + 1];
      indexTree[j + 1] %= minorCounts[j + 1];
    }

    const subsArr = indexTree.map((value, index) => minors[index][value]);
    subs[i] = subsArr.join('_');
  }

  return subs;
};

type InteractionHandlerType = 'buttons' | 'commands' | 'contextmenus' | 'selectmenus';

const importFiles = async (type: InteractionHandlerType, ...path: string[]) => {
  try {
    const folder = join(__dirname, '..', 'interactionHandlers', type, ...path);
    const files = await fs.readdir(folder);
    for (const fileName of files) {
      try {
        if (!fileName.endsWith('.js')) {
          importFiles(type, ...path, fileName);
          continue;
        }
        const mod = (await import(join(folder, fileName))).default as InteractionHandler;

        const handlerIds = unfoldString(fileName.slice(0, -3));

        for (const handlerId of handlerIds)
          interactionHandlers.set([type.slice(0, -1), ...path, handlerId].join('_'), mod);
      } catch (error) {
        console.error(`Error loading ${[type, ...path, fileName].join('/')}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error loading ${type}:`, error);
  }
};

importFiles('commands');
importFiles('buttons');

type InteractionFileTypes = 'command' | 'button' | 'contextmenu' | 'selectmenu';

export default async (interaction: Interaction) => {
  let id: `${InteractionFileTypes}_${string}` | null = null;
  const parameters: string[] = [];
  const normalizeName = (name: string) => {
    const normalized = name.replace(/ /g, '_').split('_');
    let removeFrom: number | null = null;
    for (let i = 0; i < normalized.length; i++) {
      const part = normalized[i];
      if (!part.startsWith('p:')) continue;
      parameters.push(part.slice(2));
      removeFrom ??= i;
    }
    if (removeFrom) normalized.splice(removeFrom);
    return normalized.join('_').toLowerCase();
  };
  if (interaction.isChatInputCommand()) {
    id = `command_${interaction.commandName}`;
    if (interaction.type === InteractionType.ApplicationCommand) {
      try {
        const group = interaction.options.getSubcommandGroup();
        if (group)
          id = `${id}_${group}`;
        // eslint-disable-next-line no-empty
      } catch { }

      try {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand)
          id = `${id}_${subcommand}`;
        // eslint-disable-next-line no-empty
      } catch { }
    }
  }
  else if (interaction.isButton()) {
    const customId = normalizeName(interaction.customId);
    if (customId.startsWith('retryInteraction'))
      id = `command_${customId.split('_')[1]}`;
    else
      id = `button_${customId}`;
  }
  else if (interaction.isAnySelectMenu()) {
    id = `selectmenu_${normalizeName(interaction.customId)}`;
  }
  else if (interaction.isUserContextMenuCommand())
    id = `contextmenu_${normalizeName(interaction.commandName)}`;

  const handler = id && interactionHandlers.get(id);
  try {
    await handler?.(interaction, ...parameters);
  } catch (error) {
    console.error(error);
    if (!interaction.isRepliable()) return;
    const options = {
      content: 'An unknown error has occoured completing this interaction. Please report this error to an Administrator.',
      ephermeral: interaction.ephemeral ?? true
    };
    if (interaction.replied || interaction.deferred)
      await interaction.editReply(options);
    else
      await interaction.reply(options);
  }
};