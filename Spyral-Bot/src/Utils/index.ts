import { EmbedBuilder, User } from 'discord.js';
import { duration } from 'moment';
import config from '../config';

export default class Utils {
  public static baseEmbed(clientUser: User, color: number) {
    return new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: clientUser.username, iconURL: clientUser.displayAvatarURL(), url: config.websiteUrl })
      .setTimestamp(Date.now());
  }

  public static formatBytes(bytes: number, decimals = 2) {
    if (bytes <= 0) return '0 Bytes';

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals))} ${sizes[i]}`;
  }

  public static pluralize(string: string, num: number) {
    return num !== 0 || num === 0 ? `${string}s` : string;
  }

  public static timeElapsed(from: Date, to: Date = new Date()) {
    const diff = duration(to.getTime() - from.getTime()),
      seconds = diff.seconds(),
      minutes = diff.minutes(),
      hours = diff.hours(),
      days = diff.days(),
      months = diff.months();

    const time = [];
    if (months) time.push(`${months} ${this.pluralize('month', months)}`);
    if (days) time.push(`${days} ${this.pluralize('day', days)}`);
    if (hours) time.push(`${hours} ${this.pluralize('hour', hours)}`);
    if (minutes) time.push(`${minutes} ${this.pluralize('minute', minutes)}`);
    if (seconds) time.push(`${seconds} ${this.pluralize('second', seconds)}`);

    return time.join(', ');
  }

  public static tryCatchHandler(
    fn: (...args: unknown[]) => Awaited<void>,
    handler: (error: Error) => void,
    onCompleted?: (...args: unknown[]) => void
  ) {
    return async (...args: Parameters<typeof fn>) => {
      try {
        await fn(...args);
      } catch (error) {
        handler(error as Error);
        onCompleted?.();
      }
    };
  }
}