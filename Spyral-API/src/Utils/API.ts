import config from '../config.js';
import Database from './Database';
import express from 'express';

export default class API {
  public static database: Database = new Database();
  public static express: express.Express = express();

  private static started = false;

  public static async start() {
    if (this.started) {
      throw new Error('API already started');
    }

    this.started = true;
    this.express.listen(config.Port, () => {
      console.info(`API started listening on port ${config.Port}`);
    });
    
    try {
      await this.database.connect();
      console.info('Database connected');
    } catch (error) {
      console.error(error);
    }
  }
}