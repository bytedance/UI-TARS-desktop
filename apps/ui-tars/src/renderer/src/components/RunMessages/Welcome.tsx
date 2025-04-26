/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import logo from '@resources/logo-full.png?url';

export const WelcomePage = () => {
  return (
    <div className="h-2/5 flex items-end">
      <div className="w-full text-center flex flex-col items-center pb-8">
        <img src={logo} alt="logo" className="h-20" />
        <h1 className="text-2xl font-semibold mt-1">
          Welcome to UI-TARS Desktop
        </h1>
      </div>
    </div>
  );
};
