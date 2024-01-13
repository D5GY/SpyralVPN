import { promisify } from 'util';
import { exec as _exec } from 'child_process';
import config from './config';
import { promises as fs } from 'fs';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const exec = promisify(_exec);

const processOptions = {
  cwd: '/etc/openvpn/easy-rsa/'
};

export default class Utils {
  public static async createClientConfig(username: string) {
    await exec(`./easyrsa --batch build-client-full "${username}" nopass`, processOptions).catch(noop);

    const CLIENT_TEMPLATE = (await exec('cat /etc/openvpn/client-template.txt')).stdout;
    const CA_CERT = (await exec('cat /etc/openvpn/easy-rsa/pki/ca.crt')).stdout;
    const CLIENT_CERT = (await exec(`cat /etc/openvpn/easy-rsa/pki/issued/${username}.crt`)).stdout;
    const PRIVATE_CLIENT_KEY = (await exec(`cat /etc/openvpn/easy-rsa/pki/private/${username}.key`)).stdout;
    const TLS_CRYPT = (await exec('cat /etc/openvpn/tls-crypt.key')).stdout;

    return Buffer.from([
      CLIENT_TEMPLATE,
      `<ca>\n${CA_CERT}</ca>`,
      `<cert>\n-----BEGIN CERTIFICATE-----${CLIENT_CERT.split('-----')[2]}-----END CERTIFICATE-----\n</cert>`,
      `<key>\n${PRIVATE_CLIENT_KEY}</key>`,
      `<tls-crypt>\n${TLS_CRYPT}</tls-crypt>`
    ].join('\n'));
  }
  public static async revokeClientConfig(username: string) {
    await exec(`./easyrsa --batch revoke "${username}"`, processOptions);
    await exec('EASYRSA_CRL_DAYS=3650 ./easyrsa gen-crl', processOptions);
    await exec('rm -f /etc/openvpn/crl.pem');
    await exec('cp /etc/openvpn/easy-rsa/pki/crl.pem /etc/openvpn/crl.pem');
    await exec('chmod 644 /etc/openvpn/crl.pem');
    await exec(`sed -i "/^${username},.*/d" /etc/openvpn/ipp.txt`);
    await exec('cp /etc/openvpn/easy-rsa/pki/index.txt{,.bk}');
  }
  public static getNetworkTxBytes() {
    return fs.readFile(`/sys/class/net/${config.NetworkInterface}/statistics/tx_bytes`, { encoding: 'utf-8' });
  }
  public static getNetworkRxBytes() {
    return fs.readFile(`/sys/class/net/${config.NetworkInterface}/statistics/rx_bytes`, { encoding: 'utf-8' });
  }
  public static async getOpenVpnStatus() {
    const fullStatus = (await exec('systemctl status openvpn')).stdout;
    return fullStatus.split('\n')[2];
  }
}