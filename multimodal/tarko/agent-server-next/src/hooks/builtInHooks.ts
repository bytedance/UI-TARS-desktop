/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { cors } from "hono/cors";
import { BuiltInPriorities, HookRegistrationOptions } from "./types";
import { accessLogMiddleware, errorHandlingMiddleware, requestIdMiddleware } from "../middlewares";
import { authMiddleware } from "../middlewares/auth";
import { contextStorage } from "hono/context-storage";


//used in setupMiddlewares
export const RequestIdHook: HookRegistrationOptions = {
    id: 'request-id',
    name: 'Request ID',
    priority: BuiltInPriorities.REQUEST_ID,
    description: 'Generates unique request IDs for tracking',
    handler: requestIdMiddleware,
}

//used in setupMiddlewares
export const ErroHandlingHook: HookRegistrationOptions = {
    id: 'error-handling',
    name: 'Error Handling',
    priority: BuiltInPriorities.ERROR_HANDLING,
    description: 'Global error handling middleware',
    handler: errorHandlingMiddleware,
}

//used in setupMiddlewares
export const ContextStorageHook: HookRegistrationOptions = {
    id: 'context-storage',
    name: 'Context Storage',
    priority: BuiltInPriorities.CONTEXT_STORAGE,
    handler: contextStorage(),
}

/**
 * Check if an origin is allowed for CORS.
 * Allows localhost/127.0.0.1 on the server port, file:// protocol,
 * and any additional origins from TARKO_ALLOWED_ORIGINS env var.
 */
function isAllowedOrigin(origin: string, port: number): boolean {
    const allowedOrigins = new Set([
        `http://localhost:${port}`,
        `http://127.0.0.1:${port}`,
        'file://',
    ]);

    // Support additional origins via environment variable
    const extraOrigins = process.env.TARKO_ALLOWED_ORIGINS;
    if (extraOrigins) {
        for (const o of extraOrigins.split(',')) {
            const trimmed = o.trim();
            if (trimmed) {
                allowedOrigins.add(trimmed);
            }
        }
    }

    if (allowedOrigins.has(origin)) {
        return true;
    }

    // Allow file:// origins (which may have a path suffix)
    if (origin.startsWith('file://')) {
        return true;
    }

    return false;
}

/**
 * Create a CORS hook with origin whitelist based on server port.
 * @param port The server port to allow in CORS origins
 */
export function createCorsHook(port: number): HookRegistrationOptions {
    return {
        id: 'cors',
        name: 'CORS',
        priority: BuiltInPriorities.CORS,
        description: 'Cross-Origin Resource Sharing middleware with origin whitelist',
        handler: cors({
            origin: (origin) => {
                if (!origin || isAllowedOrigin(origin, port)) {
                    return origin || '*';
                }
                return null;
            },
            allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowHeaders: [
                'Content-Type',
                'Authorization',
                'X-Requested-With',
                'X-CSRF-Token',
                'x-user-info',
                'x-jwt-token',
            ],
            credentials: true,
        }),
    };
}

/**
 * @deprecated Use createCorsHook(port) instead for proper origin validation.
 * This export uses permissive CORS with ACCESS_ALLOW_ORIGIN env var fallback to '*'.
 */
export const CorsHook: HookRegistrationOptions = {
    id: 'cors',
    name: 'CORS',
    priority: BuiltInPriorities.CORS,
    description: 'Cross-Origin Resource Sharing middleware (deprecated: use createCorsHook)',
    handler: cors({
        origin: process.env.ACCESS_ALLOW_ORIGIN || '*',
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'X-CSRF-Token',
            'x-user-info',
            'x-jwt-token',
        ],
        credentials: true,
    }),
}


export const AccessLogHook: HookRegistrationOptions = {
    id: 'access-log',
    name: 'Access Log',
    priority: BuiltInPriorities.ACCESS_LOG,
    description: 'Logs HTTP requests and responses',
    handler: accessLogMiddleware,
}



export const AuthHook: HookRegistrationOptions = {
    id: 'auth',
    name: 'Authentication',
    priority: BuiltInPriorities.AUTH,
    description: 'Authentication and authorization middleware',
    handler: authMiddleware,
}

// ---- CSRF Token Management ----

const CSRF_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const CSRF_MAX_TOKENS = 1000;
const csrfTokenStore = new Map<string, number>();

function cleanExpiredCsrfTokens(): void {
    const now = Date.now();
    for (const [token, expiry] of csrfTokenStore) {
        if (expiry <= now) {
            csrfTokenStore.delete(token);
        }
    }
}

export function generateCsrfToken(): string {
    if (csrfTokenStore.size > CSRF_MAX_TOKENS) {
        cleanExpiredCsrfTokens();
    }
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokenStore.set(token, Date.now() + CSRF_TOKEN_EXPIRY_MS);
    return token;
}

function isValidCsrfToken(token: string): boolean {
    const expiry = csrfTokenStore.get(token);
    if (!expiry) return false;
    if (Date.now() > expiry) {
        csrfTokenStore.delete(token);
        return false;
    }
    return true;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Create a CSRF protection hook.
 * Validates X-CSRF-Token header on mutation requests (POST/PUT/DELETE).
 */
export function createCsrfProtectionHook(): HookRegistrationOptions {
    return {
        id: 'csrf-protection',
        name: 'CSRF Protection',
        priority: BuiltInPriorities.AUTH - 10, // Just before auth
        description: 'CSRF token validation for mutation requests',
        handler: async (c, next) => {
            if (SAFE_METHODS.has(c.req.method)) {
                await next();
                return;
            }

            const token = c.req.header('X-CSRF-Token');
            if (!token || !isValidCsrfToken(token)) {
                return c.json({
                    error: 'CSRF token missing or invalid',
                    message: 'A valid CSRF token is required for mutation requests. Obtain one via GET /api/v1/csrf-token.',
                }, 403);
            }

            await next();
        },
    };
}

/**
 * Security headers hook.
 * Adds standard security response headers.
 */
export const SecurityHeadersHook: HookRegistrationOptions = {
    id: 'security-headers',
    name: 'Security Headers',
    priority: BuiltInPriorities.CORS + 10, // Before CORS
    description: 'Adds security response headers',
    handler: async (c, next) => {
        await next();
        c.header('X-Content-Type-Options', 'nosniff');
        c.header('X-Frame-Options', 'DENY');
        c.header('X-XSS-Protection', '1; mode=block');
        c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    },
};
