import udp from 'dgram';
import config from './config';
import Utils from './Utils';
import { createReadStream, promises as fs, constants as fsConstants } from 'fs';
import SocketCommands from './SocketCommands';
import { createInterface } from 'readline';
import { AttachmentBuilder, WebhookClient, time } from 'discord.js';
import { join } from 'path';

let firstLaunch = true;
const connectedClients: [username: string, realAdress: string, connectedSince: Date][] = [];

const checkConnectedInterval = setInterval(() => {
  const clients: [username: string, realAdress: string, connectedSince: Date][] = []; 
  const stream = createInterface({ input: createReadStream(config.OpenVPNLogsFile, 'utf-8') });
  let lineIdx = 0;
  let stop = false;
  stream.on('line', (line) => {
    if (lineIdx++ < 3) return;
    if (line.startsWith('ROUTING TABLE') || stop) return stop = true;
    // Common Name,Real Address,Bytes Received,Bytes Sent,Connected Since
    const [username,realAdress,,,connectedSince] = line.split(',');
    clients.push([username, realAdress, new Date(connectedSince)]);
    
  });
  stream.on('close', async () => {
    try {
      for (const client of connectedClients) if (!clients.some(([ username ]) => username === client[0])) {
        if (!firstLaunch)
          await config.connectionLogsWebhook.send({
            embeds: [{
              color: config.colors.bad,
              thumbnail: { url: config.embed.thumbnailUrl },
              author: { name: 'Spyral', icon_url: config.embed.authorIconURL, url: 'https://spyralvpn.com' },
              title: `Client disconnected from ${config.embed.location}`,
              fields: [
                { name: 'Username', value: client[0] },
                { name: 'Address', value: client[1] },
                { name: 'Time connected', value: time(client[2], 'T') }
              ]
            }]
          });
      }

      for (const client of clients) if (!connectedClients.some(([ username ]) => username === client[0])) {
        if (!firstLaunch)
          await config.connectionLogsWebhook.send({
            embeds: [{
              color: config.colors.good,
              thumbnail: { url: config.embed.thumbnailUrl },
              author: { name: 'Spyral', icon_url: config.embed.authorIconURL, url: 'https://spyralvpn.com' },
              title: `Client connected to ${config.embed.location}`,
              fields: [
                { name: 'Username', value: client[0] },
                { name: 'Address', value: client[1] }
              ]
            }]
          });
      }
      
      connectedClients.length = 0;
      connectedClients.push(...clients);
    } catch (error) {
      console.error(error);
    }
    firstLaunch = false;
    checkConnectedInterval.refresh();
  });
}, 60 * 1000).unref();

const checkServerStatusInterval = setInterval(async () => {
  try {
    const start = Date.now();
    await fetch(join(config.apiUrl, 'ping'));
    const end = Date.now();
    const bytes = await sendAsync(Buffer.concat([
      Buffer.from([...config.SecurityHeader, 0]),
      Buffer.from(JSON.stringify({
        connectedClients: connectedClients.length,
        rx_bytes: await Utils.getNetworkRxBytes(),
        tx_bytes: await Utils.getNetworkTxBytes(),
        openVpnStatus: await Utils.getOpenVpnStatus(),
        pingToMainVps: end - start
      }))
    ]), 1337, config.AmsterdamIp);
    console.info(`Sent ${bytes} bytes to ${config.AmsterdamIp}:1337.`);
  } catch (error) {
    // @ts-expect-error can't be bothered to add types here
    console.error(`Failed to send ${error.bytes} bytes to ${config.AmsterdamIp}:1337:`, error.error);
    throw error;
  }
  checkServerStatusInterval.refresh();
}, 60 * 1000).unref();

const socket = udp.createSocket({
  type: 'udp4',
  recvBufferSize: 8192 * 1024,
  sendBufferSize: 8192 * 1024
});

const sendAsync = (msg: string | Buffer, port: number, ip: string) => new Promise<number>((resolve, reject) => socket.send(msg, port, ip, (error, bytes) => {
  if (error) reject({ error, bytes });
  else resolve(bytes);
}));

const send = async (json: Record<string, unknown>, remoteInfo: udp.RemoteInfo, uniqueId: number) => {
  const remoteAddress = `${remoteInfo.address}:${remoteInfo.port}`;
  try {
    const bytes = await sendAsync(Buffer.concat([
      Buffer.from([...config.SecurityHeader, uniqueId]),
      Buffer.from(JSON.stringify(json))
    ]), remoteInfo.port, remoteInfo.address);
    console.info(`Sent ${bytes} bytes to ${remoteAddress}.`);
  } catch (error) {
    // @ts-expect-error can't be bothered to add types here
    console.error(`Failed to send ${error.bytes} bytes to ${remoteAddress}:`, error.error);
    throw error;
  }
};

socket.on('message', async (message, remoteInfo) => {
  const remoteAddress = `${remoteInfo.address}:${remoteInfo.port}`;
  const header = message.subarray(0, config.SecurityHeader.length);
  if (header.length !== config.SecurityHeader.length || header.some((byte, idx) => config.SecurityHeader[idx] !== byte))
    return console.warn(`Received data to socket from ${remoteAddress} that did not contain the correct security header.`);

  const { command, username, uniqueId, ...options }: SocketCommand = JSON.parse(message.subarray(config.SecurityHeader.length).toString());

  if (command === SocketCommands.CreateClientOvpn) {
    const config = await Utils.createClientConfig(username);
    const client = new WebhookClient({ id: options.webhookId!, token: options.webhookToken! });
    await client.editMessage('@original', {
      content: 'Your OpenVPN config is attached below',
      files: [new AttachmentBuilder(config, {
        description: `OpenVPN Config for ${username}.`,
        name: `${username}.ovpn`
      })]
    });
    await fs.writeFile(join(__dirname, 'spyral-client-configs', `${username}.ovpn`), config);
    console.log(`Created OVPN config for ${username}`);
    await send({ success: true }, remoteInfo, uniqueId);
  } else if (command === SocketCommands.GetClientInfo) {
    let data = '';
    const stream = createInterface({ input: createReadStream(config.OpenVPNLogsFile, 'utf-8') });
    stream.on('line', (line) => {
      if (line.startsWith(username)) {
        data = line;
        return;
      }
      if (line === 'ROUTING TABLE')
        return;
    });
    stream.on('close', () => {
      if (!data) {
        return send({ text: 'Client is not connected.' }, remoteInfo, uniqueId);
      }
      // Common Name,Real Address,Bytes Received,Bytes Sent,Connected Since
      const [
        , ip, bytesRecv, bytesSent, connectedSince
      ] = data.split(',');
      return send({
        port: ip.split(':')[1],
        bytesRecv, bytesSent,
        connectedSince
      }, remoteInfo, uniqueId);
    });
  } else if (command === SocketCommands.RevokeAccess) {
    try {
      await Utils.revokeClientConfig(username);
      const dir = join(__dirname, 'spyral-client-configs', `${username}.ovpn`);
      const access = await fs.access(dir, fsConstants.R_OK).then(() => true).catch(() => false);
      if (access)
        await fs.unlink(dir);
    } catch (error) {
      console.error('Error revoking access:', error);
    }
  }
});

socket.bind(config.Port);

interface SocketCommand {
  command: SocketCommands;
  uniqueId: number;
  username: string;
  webhookId?: string;
  webhookToken?: string;
}