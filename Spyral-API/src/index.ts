import API from './Utils/API';
import udp from 'dgram';
import express, { NextFunction, Request, Response } from 'express';
import config from './config';
import ErrorCodes from './ErrorCodes';
import SocketCommands from './SocketCommands';
import Utils from './Utils/Utils';
import { Client, SocketCommand, TokenData } from 'spyral-types';
import { userMention } from 'discord.js';

const DISCORD_ID_REGEX = /^\d{17,20}$/;

const serverStatus: Record<string, {
  server: string,
  connectedClients: number,
  rx_bytes: string,
  tx_bytes: string,
  openVpnStatus: string,
  lastUpdated: Date
}> = {};

const promises: {
  uniqueId: number;
  resolve: (param?: unknown) => void;
  reject: () => void;
  promise: Promise<unknown>;
}[] = [];

const addPromise = () => {
  let
    resolve: (param?: unknown) => void,
    reject: () => void;

  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  let uniqueId = 0;
  while (uniqueId === 0) {
    const id = Math.floor(Math.random() * 255);
    if (!promises.some(p => p.uniqueId === id))
      uniqueId = id;
  }

  const obj = {
    resolve: (param?: unknown) => resolve(param),
    reject: () => reject(),
    promise,
    uniqueId: uniqueId
  };
  promises.push(obj);
  return obj;
};

const udpSocket = udp.createSocket({
  type: 'udp4',
  recvBufferSize: 8192 * 1024,
  sendBufferSize: 8192 * 1024
});
udpSocket.bind(1337);
udpSocket.on('message', (message, remoteInfo) => {
  const remoteAddress = `${remoteInfo.address}:${remoteInfo.port}`;
  const header = message.subarray(0, config.SecurityHeader.length);

  if (header.length !== config.SecurityHeader.length || header.some((byte, idx) => config.SecurityHeader[idx] !== byte))
    return console.warn(`Received data to socket from ${remoteAddress} that did not contain the correct security header.`);

  try {
    const uniqueId = message.at(config.SecurityHeader.length);
    if (typeof uniqueId !== 'number')
      return console.warn(`Data received from ${remoteAddress} that does not contain a uniqueId.`);

    const buffer = message.subarray(config.SecurityHeader.length + 1);
    const json = JSON.parse(buffer.toString());

    if ('connectedClients' in json) {
      const status = serverStatus[remoteInfo.address];
      if (status) {
        Object.assign(status, json);
        status.lastUpdated = new Date();
      } else {
        serverStatus[remoteInfo.address] = Object.assign({
          server: remoteInfo.address,
          lastUpdated: new Date()
        }, json);
      }
      return;
    }

    const idx = promises.findIndex(p => p.uniqueId === uniqueId);
    const promise = promises[idx];
    if (!promise)
      return console.warn(`Data received from ${remoteAddress} that does not contain a valid uniqueId.`);

    promise.resolve(json);
    promises.splice(idx, 1);
  } catch (error) {
    console.error(`Error when receiving data from ${remoteAddress}:`, error);
  }
});

const send = (json: SocketCommand, location: string) => new Promise((resolve, reject) =>
  udpSocket.send(Buffer.concat([
    Buffer.from(config.SecurityHeader),
    Buffer.from(JSON.stringify(json))
  ]), config.VpsPort, location, (error, bytes) => {
    if (error) {
      console.error(`Failed to send ${json.command} to ${location}:`, error);
      reject(error);
    }
    else {
      console.info(`Sent ${bytes} bytes to ${location}.`);
      resolve(undefined);
    }
  })
);

API.start().then(() => {
  setInterval(() => {
    checkExpiry();
  }, 60 * 1000).unref();
}, error => {
  console.error('Error starting API/Database:', error);
  process.exit(1);
});

const awaitApiResponse = async (promise: typeof promises[number]) => {
  setTimeout(() => {
    promise.resolve();
  }, 30 * 1000).unref();

  const result = await promise.promise;

  return result ?? { error: 'Internal Server Error: Request to remote socket timed out.', code: ErrorCodes.UnknownError };
};

API.express.use(
  express.json(),
  express.urlencoded({ extended: true })
);

const clientPath = express.Router();
const tokenPath = express.Router();

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['api-key'];
  if (!apiKey)
    return res.status(401).json({ error: 'Unauthorized: No API Key Provided.', code: ErrorCodes.NoApiKey });

  if (apiKey !== config.ApiKey)
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key Provided.', code: ErrorCodes.InvalidApiKey });

  next();
};

API.express.get('/ping', async (req, res) => {
  const start = Date.now();
  await API.database.query('SELECT 1');
  res.status(200).json({ database: Date.now() - start });
});
API.express.get('/status', (req, res) => {
  res.status(200).json(serverStatus);
});

clientPath.use(authMiddleware);
tokenPath.use(authMiddleware);

//#region client/
clientPath.get('/', async (req, res) => {
  const userId = req.query.userId as string;

  if (typeof userId !== 'string' && !DISCORD_ID_REGEX.test(userId))
    return res.status(400).json({ error: 'Bad Request: Must provide `userId` as string matching the format of a Discord User ID.', code: ErrorCodes.InvalidUserId });

  const [client] = await API.database.query('SELECT * FROM clients WHERE discord = ?', userId);

  if (!client)
    return res.status(418).json({ error: 'I\'m a teapot: No client found', code: ErrorCodes.NoClientFound });

  return res.status(200).json(client);
});

clientPath.get('/info', async (req, res) => {
  const { username, location: locationKey } = req.query;

  if (!Object.keys(config.VpnIps).includes(locationKey as string))
    return res.status(400).json({ error: 'Bad Request: Invalid VPS Location', code: ErrorCodes.InvalidLocation });

  const location = config.VpnIps[locationKey as keyof typeof config['VpnIps']];

  const promise = addPromise();

  try {
    await send({
      command: SocketCommands.GetClientInfo,
      uniqueId: promise.uniqueId,
      username,
    }, location);

    const response = await awaitApiResponse(promise) as Record<string, unknown>;

    res.status('error' in response ? 500 : 200).json(response);
  } catch (error) {
    promise.resolve();
    console.error('Error occoured sending/receiving data to VPS:', error);
    res.status(500).json({ error: 'Internal Server Error: Unknown', code: ErrorCodes.UnknownError });
  }
});

clientPath.post('/register', async (req, res) => {
  const { userId, username } = req.body;

  if (typeof userId !== 'string' && !DISCORD_ID_REGEX.test(userId))
    return res.status(400).json({ error: 'Bad Request: Must provide `userId` as string matching the format of a Discord User ID.', code: ErrorCodes.InvalidUserId });

  if (typeof username !== 'string')
    return res.status(400).json({ error: 'Bad Request: Must provide `username` field as a string.', code: ErrorCodes.InvalidUsernameType });

  if (!/^[a-z0-9]{1,32}$/i.test(username))
    return res.status(400).json({
      error: 'Bad Request: The `username` field must only contain characters a-z and 0-9, and be less than 32 characters in length.',
      code: ErrorCodes.InvalidUsername
    });

  const [existingClient] = await API.database.query<Client>(
    'SELECT username, discord FROM clients WHERE LOWER(`username`) = ? OR discord = ?',
    username.toLowerCase(), userId
  );
  if (existingClient) {
    res.status(400);
    if (existingClient.username === username)
      return res.json({ error: 'Bad Request: A client is already registered with the provided username.', code: ErrorCodes.UsernameInUse });
    else
      return res.json({ error: 'Bad Request: This client is already registered.', code: ErrorCodes.AlreadyRegistered });
  }

  await API.database.query('INSERT INTO clients (discord, location, expiry, username) VALUES (?, ?, ?, ?)', userId, 'TBA', new Date(Date.now() + 86400000), username);

  res.status(204).end();

  await config.webhooks.clientLogs.send({
    embeds: [{
      color: config.EmbedColor,
      description: 'Client Registered.',
      fields: [
        { name: 'Username', value: username },
        { name: 'Discord', value: userMention(userId) }
      ]
    }]
  });
});

clientPath.post('/create-config', async (req, res) => {
  const { username, location: locationKey, webhookId, webhookToken } = req.body;

  if (!Object.keys(config.VpnIps).includes(locationKey))
    return res.status(400).json({ error: 'Bad Request: Invalid VPS Location', code: ErrorCodes.InvalidLocation });

  const location = config.VpnIps[locationKey as keyof typeof config['VpnIps']];

  const promise = addPromise();

  try {
    await send({
      command: SocketCommands.CreateClientOvpn,
      uniqueId: promise.uniqueId,
      username,
      webhookId,
      webhookToken
    }, location);

    const response = await awaitApiResponse(promise) as { error: string; code: ErrorCodes };
    if ('error' in response) {
      return res.status(500).json(response);
    }

    await API.database.query('UPDATE clients SET location = ? WHERE username = ?', locationKey, username);

    res.status(204).end();

    await config.webhooks.clientLogs.send({
      embeds: [{
        color: config.EmbedColor,
        description: 'Client config created.',
        fields: [
          { name: 'Username', value: username },
          { name: 'Location', value: locationKey }
        ]
      }]
    });
  } catch (error) {
    promise.resolve();
    console.error('Error occoured sending/receiving data to VPS:', error);
    res.status(500).json({ error: 'Internal Server Error: Unknown', code: ErrorCodes.UnknownError });
  }
});
//#endregion

//#region token/
tokenPath.get('/', async (req, res) => {
  const token = req.query.token;

  const [tokenData] = await API.database.query<TokenData>('SELECT * FROM tokens WHERE code = ?', token);

  if (!tokenData)
    return res.status(400).json({ error: 'Bad Request: Token is not valid', code: ErrorCodes.InvalidToken });
  else
    return res.status(200).json(tokenData);
});

tokenPath.post('/create', async (req, res) => {
  const token = await Utils.generateToken(API.database);
  const { days, generatedBy } = req.body;
  await API.database.query('INSERT INTO tokens (code, time, generatedby) VALUES (?, ?, ?)', token, days, generatedBy);

  res.status(200).json({ token });

  await config.webhooks.tokenLogs.send({
    embeds: [{
      color: config.EmbedColor,
      description: 'Token created.',
      fields: [
        { name: 'Token', value: token },
        { name: 'Generated By', value: userMention(generatedBy) }
      ]
    }]
  });
});

tokenPath.post('/bulk-create', async (req, res) => {
  const { days, generatedBy, amount } = req.body;

  const tokens = [];

  while (tokens.length < amount) {
    const token = await Utils.generateToken(API.database);
    await API.database.query('INSERT INTO tokens (code, time, generatedby) VALUES (?, ?, ?)', token, days, generatedBy);
    tokens.push(token);
  }

  res.status(200).json({ tokens });
  
  await config.webhooks.tokenLogs.send({
    embeds: [{
      color: config.EmbedColor,
      description: 'bulk tokens created.',
      fields: [
        { name: 'Amount', value: tokens.length.toString() },
        { name: 'Generated By', value: req.headers['x-forwarded-for']?.toString() ?? 'Unknown IP' }
      ]
    }]
  });
});

tokenPath.post('/redeem', async (req, res) => {
  const { userId, token } = req.body;

  if (typeof userId !== 'string' && !DISCORD_ID_REGEX.test(userId))
    return res.status(400).json({ error: 'Bad Request: Must provide `userId` as string matching the format of a Discord User ID.', code: ErrorCodes.InvalidUserId });

  const [client] = await API.database.query<Client>('SELECT * FROM clients WHERE discord = ?', userId);

  if (!client)
    return res.status(418).json({ error: 'I\'m a teapot: No client found', code: ErrorCodes.NoClientFound });

  const [tokenData] = await API.database.query<{ time: number }>('SELECT time from tokens WHERE code = ? AND redeemed = ?', token, 0);
  if (!tokenData)
    return res.status(400).json({ error: 'Bad Request: The token provided was unable to be redeemed.', code: ErrorCodes.UnableToRedeem });

  const expiryTimestamp = client.expiry.getTime();
  const now = Date.now();
  const time = tokenData.time * 86400000;

  const newExpiry = (expiryTimestamp < now ? now : expiryTimestamp) + time;

  await API.database.query('UPDATE tokens SET redeemed = 1, redeemer = ? WHERE code = ?', userId, token);

  await API.database.query('UPDATE clients SET expiry = ? WHERE discord = ?', new Date(newExpiry), userId);

  res.status(204).end();

  await config.webhooks.tokenLogs.send({
    embeds: [{
      color: config.EmbedColor,
      description: 'A token has been redeemed.',
      fields: [
        { name: 'Token', value: token },
        { name: 'Redeemed By', value: `${userMention(userId)} (${client.username})` }
      ]
    }]
  });
});
//#endregion

API.express.use('/client', clientPath);
API.express.use('/token', tokenPath);

async function checkExpiry() {
  const clients = await API.database.query<Client>('SELECT username, location FROM clients WHERE (expiry < NOW()) AND (location != \'TBA\')');
  if (!clients.length) return;
  for (const client of clients) {
    try {
      for (const ip of Object.values(config.VpnIps)) {
        await send({
          command: SocketCommands.RevokeAccess,
          uniqueId: -1,
        }, ip);
      }

      await config.webhooks.clientLogs.send({
        embeds: [{
          color: config.EmbedColor,
          description: 'Client time expired revoked config.',
          fields: [
            { name: 'Client', value: client.username },
            { name: 'Location', value: client.location }
          ]
        }]
      });

    } catch (error) {
      console.error(`Error revoking access for ${client.username}:`, error);
    }
  }

  await API.database.query('UPDATE clients SET location = \'TBA\' WHERE expiry < NOW()');
}
