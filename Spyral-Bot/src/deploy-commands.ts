import { REST } from '@discordjs/rest';
import {
  RESTPutAPIApplicationCommandsJSONBody as JSONBody,
  RESTPutAPIApplicationCommandsResult as JSONResponse,
  ApplicationCommandOptionType as OptionType,
  Routes,
  RESTPutAPIApplicationGuildCommandsResult,
  PermissionFlagsBits
} from 'discord-api-types/v10';

import config from './config';

const applicationId = Buffer.from(config.token.split('.')[0], 'base64').toString();

const rest = new REST({ version: '10' }).setToken(config.token);

const buildCommand = (name: string, description: string, permissions?: bigint) => ({
  name, description, default_member_permissions: permissions?.toString()
});

const buildOption = <T extends OptionType>(name: string, description: string, type: T, required: boolean) => ({
  name, description, type, required
});

const buildOptionChoice = <T extends string | number>(name: string, value: T) => ({ name, value });

const globalCommands: JSONBody = [
];

const guildCommands: JSONBody = [
  buildCommand('ping', 'Displays ping information.'), {
    ...buildCommand('status', 'Displays Spyral VPN status information.'),
    options: [{
      ...buildOption('server', 'The server you would like to retrive the status for.', OptionType.String, true),
      choices: [
        buildOptionChoice('Arizona, Phoenix (US)', 'london'),
        buildOptionChoice('London, England (UK)', 'arizona')
      ]
    }]
  }
  , {
    ...buildCommand('purge', 'Purge messages from this channel.', PermissionFlagsBits.ManageMessages),
    options: [{
      ...buildOption('amount', 'The maximum amount of messages to purge.', OptionType.Integer, true),
      max_value: 100,
      min_value: 2
    },
    buildOption('before', 'Before a certian message. (Cannot be used with after)', OptionType.String, false),
    buildOption('after', 'After a certian message. (Cannot be used with before)', OptionType.String, false),
    buildOption('from', 'From a specific user. (May not delete exact number of messages)', OptionType.User, false)]
  }, {
    ...buildCommand('admin', 'Spyral Admin commands.', PermissionFlagsBits.Administrator),
    options: [{
      ...buildOption('create-token', 'Generate a SpyralVPN token.', OptionType.Subcommand, false),
      options: [{
        ...buildOption('days', 'The amount of time the token should give.', OptionType.Integer, true),
        choices: [30, 90].map(days => buildOptionChoice(`${days} Days`, days))
      }]
    }, {
      ...buildOption('eval', 'Evalute an expression.', OptionType.Subcommand, false),
      options: [
        buildOption('code', 'The code to evaluate.', OptionType.String, true),
        buildOption('async', 'Whether the code should be evaluated inside an asynchronous function.', OptionType.Boolean, false)
      ]
    }],
  }, {
    ...buildCommand('client', 'Spyral client commands.'), 
    options: [
      buildOption('info', 'Get your current client information.', OptionType.Subcommand, false), {
        ...buildOption('config', 'Get your current OpenVPN config file.', OptionType.Subcommand, false),
        options: [{
          ...buildOption('location', 'The location of the VPN you want to use.', OptionType.String, false),
          choices: [
            buildOptionChoice('Arizona, Phoenix (US)', 'Arizona'),
            buildOptionChoice('London, England (UK)', 'London')
          ]
        }]
      }, {
        ...buildOption('redeem-token', 'Redeem your SpyralVPN token.', OptionType.Subcommand, false),
        options: [{
          ...buildOption('token', 'The token to redeem.', OptionType.String, true),
          max_length: 12,
          min_length: 12
        }]
      }, {
        ...buildOption('register', 'Register an account with SpyralVPN.', OptionType.Subcommand, false),
        options: [{
          ...buildOption('username', 'Your unique username for SpyralVPN.', OptionType.String, true),
          max_length: 32,
          min_length: 2
        }]
      }
    ]
  }
];

(async () => {
  const resultA = await rest.put(Routes.applicationCommands(applicationId), {
    body: globalCommands
  }) as JSONResponse;
  console.log('PUT GLOBAL commands:', resultA);
  const resultB = await rest.put(Routes.applicationGuildCommands(applicationId, config.spyralGuildId), {
    body: guildCommands
  }) as RESTPutAPIApplicationGuildCommandsResult;
  console.log('PUT GUILD commands:', resultB);
})().catch(console.error);
