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
import { generateKeyPairSync } from 'crypto';
import { appPrivateKeyBase64 } from './app_private';
import { REGISTER_URL } from './shared';
import { logger } from '../logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SignJWT: any, importPKCS8: any;

(async () => {
  const jose = await import('jose');
  SignJWT = jose.SignJWT;
  importPKCS8 = jose.importPKCS8;
})();

const APP_DIR_NAME = '.ui-tars-desktop';
const LOCAL_KEY_PATH = path.join(app.getPath('home'), APP_DIR_NAME);

const LOCAL_PUB_KEY = 'local_public_v2.pem';
const LOCAL_PRIV_KEY = 'local_private_v2.pem';

const ALGO = 'RS256';

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
    logger.error(`[Auth] Retrying request...`);
    return fetchWithRetry(url, options, retries - 1);
  }
}

// @ts-ignore: deprecated code, will be removed in future release
const createAuthRequestInterceptor = () => {
  return async (axiosConfig: AxiosRequestConfig) => {
    const deviceId = await getDeviceId();
    const ts = Date.now();

    const localDevicePrivBase64 = await getLocalPrivKey('origin');

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
      'X-Device-Id': await getDeviceId(),
      'X-Timestamp': ts.toString(),
      Authorization: `Bearer ${authToken}`,
    };

    return axiosConfig;
  };
};

async function getAuthHeader() {
  const deviceId = await getDeviceId();
  const ts = Date.now();

  const localDevicePrivBase64 = await getLocalPrivKey('origin');

  const localDevicePrivateKey = await importPKCS8(localDevicePrivBase64, ALGO);
  const authToken = await new SignJWT({
    deviceId,
    ts,
  })
    .setProtectedHeader({ alg: ALGO })
    .sign(localDevicePrivateKey);

  return {
    'X-Device-Id': await getDeviceId(),
    'X-Timestamp': ts.toString(),
    Authorization: `Bearer ${authToken}`,
  };
}

let cachedDeviceId: string | null = null;
async function getDeviceId(): Promise<string> {
  if (!cachedDeviceId) {
    cachedDeviceId = await machineId();
    logger.log('[Auth] getDeviceId:', cachedDeviceId);
  }
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
        publicKey: await getLocalPubKey('base64'),
        privateKey: await getLocalPrivKey('base64'),
      };
    }
  }

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const publicKeyPath = path.join(LOCAL_KEY_PATH, LOCAL_PUB_KEY);
  const privateKeyPath = path.join(LOCAL_KEY_PATH, LOCAL_PRIV_KEY);

  // Make sure the dir exists
  if (!fs.existsSync(LOCAL_KEY_PATH)) {
    // Set the dir permissions to be accessible only by the current user
    fs.mkdirSync(LOCAL_KEY_PATH, { mode: 0o700 });
  }

  fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o600 });
  fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });

  return {
    publicKey: Buffer.from(publicKey, 'utf-8').toString('base64'),
    privateKey: Buffer.from(privateKey, 'utf-8').toString('base64'),
  };
}

async function getAppPrivKeyFromEnv(): Promise<CryptoKey> {
  if (!appPrivateKeyBase64) {
    logger.error('[Auth] Private key is not set');
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

async function getLocalPubKey(format: 'base64' | 'origin'): Promise<string> {
  const publicKeyPath = path.join(LOCAL_KEY_PATH, LOCAL_PUB_KEY);
  if (!fs.existsSync(publicKeyPath)) {
    throw new Error('Private key not found');
  }
  const localPublicKeyPem = fs.readFileSync(publicKeyPath, 'utf-8');
  if (format === 'origin') {
    return localPublicKeyPem;
  }
  const publicKeyBase64 = Buffer.from(localPublicKeyPem, 'utf-8').toString(
    'base64',
  );
  return publicKeyBase64;
}

async function getLocalPrivKey(format: 'base64' | 'origin'): Promise<string> {
  const privateKeyPath = path.join(LOCAL_KEY_PATH, LOCAL_PRIV_KEY);
  if (!fs.existsSync(privateKeyPath)) {
    throw new Error('Private key not found');
  }
  const localPrivateKeyPem = fs.readFileSync(privateKeyPath, 'utf-8');
  if (format === 'origin') {
    return localPrivateKeyPem;
  }
  const privateKeyBase64 = Buffer.from(localPrivateKeyPem, 'utf-8').toString(
    'base64',
  );
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
        'X-Device-Id': await getDeviceId(),
        'X-Timestamp': ts.toString(),
      },
      body: JSON.stringify({
        deviceId,
        devicePublicKey,
        ts,
        signature,
      }),
    });
    logger.log('[Auth] Register Response:', data);
    if (data.code == 0) {
      return true;
    }
  } catch (error) {
    logger.error('[Auth] Register Error:', (error as Error).message);
    throw error;
  }
  return false;
}

export { getAuthHeader, registerDevice };
