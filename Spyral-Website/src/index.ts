import express from 'express';
import config from './config';
import { join } from 'path';
import { renderFile } from 'ejs';
const app = express();

app.listen(config.Port, () => {
  console.info(`Spyral Website is running on localhost:${config.Port}`);
});

app.set('html', renderFile);
app.set('views', join(__dirname, 'Pages'));
app.set('view engine', 'ejs');
app.use(express.static(join(__dirname, 'Public')));


app.get('/', (req, res) => {
  res.render('index.ejs', {
    title: 'SpyralVPN - DDoS Protected VPN'
  });
});
app.get('/status', async (req, res) => {
  res.render('status.ejs', {
    title: 'SpyralVPN - Server Status'
  });
});
app.get('/discord', (req, res) => res.redirect(config.SpyralDiscordInvite));
app.get('*', (req, res) => {
  res.render('error.ejs', {
    title: 'SpyralVPN - Error'
  });
});