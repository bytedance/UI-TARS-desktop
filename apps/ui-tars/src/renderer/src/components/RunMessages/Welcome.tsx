/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import logo from '@resources/logo-full.png?url';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@renderer/components/ui/alert';
import { BROWSER_OPERATOR, COMPUTER_OPERATOR } from '@renderer/const';

export const WelcomePage = () => {
  return (
    <div className="h-1/2 flex items-end">
      <div className="w-full text-center flex flex-col items-center pb-6 px-4">
        <img src={logo} alt="logo" className="h-20" />
        <h1 className="text-2xl font-semibold mt-1">
          Welcome to UI-TARS Desktop
        </h1>

        <div className="flex gap-4 mt-6 max-w-4xl text-left">
          <Alert>
            <AlertTitle>{COMPUTER_OPERATOR}</AlertTitle>
            <AlertDescription>
              Let UI-TARS-Desktop take control of your computer for GUI
              automation
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle>{BROWSER_OPERATOR}</AlertTitle>
            <AlertDescription>
              Run a background browser to perform GUI tasks without interrupting
              users
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};
