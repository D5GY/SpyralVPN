import { ActivityType, Client } from 'discord.js';
import config from './config';
import { promises as fs } from 'fs';
import { join } from 'path';
import SpyralAPI from './Utils/spyralAPI';

const client = new Client(config.clientOptions);
client.login(config.token);

fs.readdir(join(__dirname, 'eventHandlers')).then(async files => {
  for (const fileName of files) {
    const mod = (await import(join(__dirname, 'eventHandlers', fileName))).default as (...args: unknown[]) => Awaited<void>;

    client.on(fileName.slice(0, -3), mod);
  }
});

setInterval(async () => {
  const serverStatus = await SpyralAPI.getVpnServerStatus();
  let count = 0;
  for (const key in serverStatus)
    count += serverStatus[key].connectedClients; 

  client.user?.setActivity({
    name: `${count} Connected clients.`,
    type: ActivityType.Watching
  });
}, 30 * 10000).unref(); // 5 mins