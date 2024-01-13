import Database from './Database';

export default class Utils {
  public static randomStringGenerator(string = 'abcdefghijklmnopqrstuvwxyzZBCDEFGHIJKLMNOPQRSTUVWXYZ0987654321', length = 12) {
    let token = '';
    for (let i = 0; i < length; i++) {
      token += string.charAt(Math.floor(Math.random() * string.length));
    }
    return token;
  }

  public static async generateToken(database: Database): Promise<string> {
    for (let i = 0; i < 4; i++) {
      const token: string = this.randomStringGenerator();
      const [existing] = await database.query('SELECT * FROM tokens WHERE code = ?', token);
      if (!existing) return token;
    }

    throw new Error('Unable to generate a token');
  }
}