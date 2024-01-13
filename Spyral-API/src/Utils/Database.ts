import { createConnection, Connection } from 'mysql';
import config from '../config';

export default class Database {
  public databaseConnection: Connection;

  public constructor() {
    this.databaseConnection = createConnection(config.DatabaseConfig);
  }

  public connect(): Promise<this> {
    return new Promise((resolve, reject) => this.databaseConnection.connect(error => {
      if (error) reject(error);
      else resolve(this);
    }));
  }

  public disconnect(): Promise<this> {
    return new Promise((resolve, reject) => this.databaseConnection.end(error => {
      if (error) reject(error);
      else resolve(this);
    }));
  }
  
  public query<T = unknown>(sql: string, ...args: unknown[]): Promise<T[]> {
    return new Promise((resolve, reject) => this.databaseConnection.query(sql, args, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    }));
  }
}