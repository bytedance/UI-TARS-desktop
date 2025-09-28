/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

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



export const CorsHook: HookRegistrationOptions = {
    id: 'cors',
    name: 'CORS',
    priority: BuiltInPriorities.CORS,
    description: 'Cross-Origin Resource Sharing middleware',
    handler: cors({
        origin: process.env.ACCESS_ALLOW_ORIGIN || '*',
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
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
