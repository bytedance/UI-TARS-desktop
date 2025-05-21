/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import logo from '@resources/logo-full.png?url';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { BROWSER_OPERATOR, COMPUTER_OPERATOR } from '@renderer/const';
import { useNavigate } from 'react-router';
import { Button } from '@renderer/components/ui/button';

export const WelcomePage = () => {
  const navigate = useNavigate();

  const toRemoteComputer = () => {
    navigate('/remote/computer');
  };

  const toLocalComputer = () => {
    navigate('/local/computer');
  };

  const toRemoteBrowser = () => {
    navigate('/remote/browser');
  };

  const toLocalBrowser = () => {
    navigate('/local/browser');
  };

  return (
    <div className="h-full flex items-end">
      <div className="w-full flex flex-col items-center pb-6 px-4">
        {/* <img src={logo} alt="logo" className="h-20" /> */}
        <h1 className="text-2xl font-semibold mt-1 mb-4">
          Welcome to UI-TARS Desktop
        </h1>
        <div className="flex gap-2">
          <Card>
            <CardHeader>
              <CardTitle>{COMPUTER_OPERATOR}</CardTitle>
              <CardDescription>
                Let UI-TARS-Desktop take control of your computer for GUI
                automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-26 h-30"></div>
            </CardContent>
            <CardFooter className="gap-3">
              <Button onClick={toRemoteComputer}>Use Remote Computer</Button>
              <Button onClick={toLocalComputer} variant="secondary">
                Use Local Computer
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{BROWSER_OPERATOR}</CardTitle>
              <CardDescription>
                Run a background browser to perform GUI tasks without
                interrupting users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-26 h-30"></div>
            </CardContent>
            <CardFooter className="gap-3">
              <Button onClick={toRemoteBrowser}>Use Remote Browser</Button>
              <Button onClick={toLocalBrowser} variant="secondary">
                Use Local Browser
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
