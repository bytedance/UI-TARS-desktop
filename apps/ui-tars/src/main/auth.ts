/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
// import { SignJWT, importPKCS8, generateKeyPair } from 'jose';
import { machineId } from 'node-machine-id';
import { AxiosRequestConfig } from 'axios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SignJWT: any, importPKCS8: any, generateKeyPair: any;

(async () => {
  const jose = await import('jose');
  SignJWT = jose.SignJWT;
  importPKCS8 = jose.importPKCS8;
  generateKeyPair = jose.generateKeyPair;
})();

const APP_DIR_NAME = '.ui-tars-desktop';
const LOCAL_KEY_PATH = path.join(app.getPath('home'), APP_DIR_NAME);

const LOCAL_PUB_KEY = 'local_public.pem';
const LOCAL_PRIV_KEY = 'local_private.pem';

const ALGO = 'RS256';

const REGISTER_URL = `https://sd0ksn32cirbt02vttjf0.apigateway-cn-beijing.volceapi.com/api/v1/register`;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 1,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  } catch (error) {
    if (retries <= 0) throw error;
    console.error(`[Auth] Retrying request...`);
    return fetchWithRetry(url, options, retries - 1);
  }
}

const createAuthRequestInterceptor = () => {
  return async (axiosConfig: AxiosRequestConfig) => {
    const deviceId = await getDeviceId();
    const ts = Date.now();

    const localDevicePrivBase64 = await getLocalPrivKeyBase64();

    const localDevicePrivateKey = await importPKCS8(
      localDevicePrivBase64,
      ALGO,
    );
    const authToken = await new SignJWT({
      deviceId,
      ts,
    })
      .setProtectedHeader({ alg: ALGO })
      .sign(localDevicePrivateKey);

    axiosConfig.headers = {
      ...axiosConfig.headers,
      'X-Device-Id': cachedDeviceId,
      'X-Timestamp': ts.toString(),
      Authorization: `Bearer ${authToken}`,
    };

    return axiosConfig;
  };
};

async function getAuthHeader() {
  const deviceId = await getDeviceId();
  const ts = Date.now();

  const localDevicePrivBase64 = await getLocalPrivKeyBase64();

  const localDevicePrivateKey = await importPKCS8(localDevicePrivBase64, ALGO);
  const authToken = await new SignJWT({
    deviceId,
    ts,
  })
    .setProtectedHeader({ alg: ALGO })
    .sign(localDevicePrivateKey);

  return {
    'X-Device-Id': cachedDeviceId,
    'X-Timestamp': ts.toString(),
    Authorization: `Bearer ${authToken}`,
  };
}

let cachedDeviceId: string | null = null;
async function getDeviceId(): Promise<string> {
  if (!cachedDeviceId) {
    cachedDeviceId = await machineId();
  }
  console.log('[Auth] getDeviceId:', cachedDeviceId);
  return cachedDeviceId;
}

async function genKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  if (fs.existsSync(LOCAL_KEY_PATH)) {
    const publicKeyPath = path.join(LOCAL_KEY_PATH, LOCAL_PUB_KEY);
    const privateKeyPath = path.join(LOCAL_KEY_PATH, LOCAL_PRIV_KEY);
    if (fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath)) {
      return {
        publicKey: await getLocalPubKeyBase64(),
        privateKey: await getLocalPrivKeyBase64(),
      };
    }
  }

  const { publicKey, privateKey } = await generateKeyPair(ALGO, {
    extractable: true,
  });

  const publicKeySpki = await crypto.subtle.exportKey('spki', publicKey);
  const publicKeyStringBase64 = Buffer.from(publicKeySpki).toString('base64');
  const privateKeyPkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey);
  const privateKeyStringBase64 =
    Buffer.from(privateKeyPkcs8).toString('base64');

  const publicKeyPath = path.join(LOCAL_KEY_PATH, LOCAL_PUB_KEY);
  const privateKeyPath = path.join(LOCAL_KEY_PATH, LOCAL_PRIV_KEY);

  // Make sure the dir exists
  if (!fs.existsSync(LOCAL_KEY_PATH)) {
    // Set the dir permissions to be accessible only by the current user
    fs.mkdirSync(LOCAL_KEY_PATH, { mode: 0o700 });
  }
  fs.writeFileSync(
    publicKeyPath,
    `-----BEGIN PUBLIC KEY-----\n${publicKeyStringBase64}\n-----END PUBLIC KEY-----`,
    { mode: 0o600 },
  );
  fs.writeFileSync(
    privateKeyPath,
    `-----BEGIN PRIVATE KEY-----\n${privateKeyStringBase64}\n-----END PRIVATE KEY-----`,
    { mode: 0o600 },
  );

  return {
    publicKey: publicKeyStringBase64,
    privateKey: privateKeyStringBase64,
  };
}

async function getAppPrivKeyFromEnv(): Promise<CryptoKey> {
  const appPrivateKeyBase64 = process.env.UI_TARS_APP_PRIVATE_KEY_BASE64;
  if (!appPrivateKeyBase64) {
    throw new Error('Private key is not set');
  }

  const appPrivateKeyString = Buffer.from(
    appPrivateKeyBase64,
    'base64',
  ).toString('utf-8');

  const appPrivateKey = await importPKCS8(appPrivateKeyString, ALGO);

  return appPrivateKey;
}

/*
async function getAppPrivKeyFromPkg(): Promise<CryptoKey> {
}
*/

async function getLocalPubKeyBase64(): Promise<string> {
  const publicKeyPath = path.join(LOCAL_KEY_PATH, LOCAL_PUB_KEY);
  if (!fs.existsSync(publicKeyPath)) {
    throw new Error('Private key not found');
  }
  const localPublicKeyPem = fs.readFileSync(publicKeyPath, 'utf-8');
  const publicKeyBase64 = localPublicKeyPem;
  // .replace('-----BEGIN PUBLIC KEY-----', '')
  // .replace('-----END PUBLIC KEY-----', '')
  // .replace(/[\r\n]/g, '');
  return publicKeyBase64;
}

async function getLocalPrivKeyBase64(): Promise<string> {
  const privateKeyPath = path.join(LOCAL_KEY_PATH, LOCAL_PRIV_KEY);
  if (!fs.existsSync(privateKeyPath)) {
    throw new Error('Private key not found');
  }
  const localPrivateKeyPem = fs.readFileSync(privateKeyPath, 'utf-8');
  const privateKeyBase64 = localPrivateKeyPem;
  // .replace('-----BEGIN PRIVATE KEY-----', '')
  // .replace('-----END PRIVATE KEY-----', '')
  // .replace(/[\r\n]/g, '');
  return privateKeyBase64;
}

async function registerDevice(): Promise<boolean> {
  const { publicKey: devicePublicKey } = await genKeyPair();
  const deviceId = await getDeviceId();
  const ts = Date.now();

  // TODO: get app private key from app package
  const appPrivateKey = await getAppPrivKeyFromEnv();

  const signature = await new SignJWT({
    deviceId,
    devicePublicKey,
    ts,
  })
    .setProtectedHeader({ alg: ALGO })
    .sign(appPrivateKey);

  try {
    const data = await fetchWithRetry(REGISTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        devicePublicKey,
        ts,
        signature,
      }),
    });
    console.log('[Auth] Register Response:', data);
    if (data.status >= 0) {
      return true;
    }
  } catch (error) {
    console.error('[Auth] Register Error:', (error as Error).message);
    throw error;
  }
  return false;
}

export { getAuthHeader, registerDevice };
