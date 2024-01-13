declare module 'spyral-types' {
  export interface ClientConnectionInfo {
    port: `${number}`;
    bytesRecv: number;
    bytesSent: number;
    connectedSince: string;
  }

  export interface SocketCommand {
    command: SocketCommands;
    uniqueId: number;
    [key: string]: unknown;
  }

  export interface Client {
    username: string;
    discord: string;
    expiry: Date;
  }

  export interface TokenData {
    code: string;
    redeemed: 0 | 1;
    redeemer: null | string;
    time: number;
    generatedBy: 'autobuy' | string;
  }

  export type VpnLocation = 'Arizona' | 'London' | 'TBA';
}
