/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { app } from 'electron';
import { Promisable } from 'type-fest';

export const ensureDockIsShowing = async (action: () => Promisable<void>) => {
  const wasDockShowing = app.dock.isVisible();
  if (!wasDockShowing) {
    await app.dock.show();
  }

  await action();

  if (!wasDockShowing) {
    app.dock.hide();
  }
};

export const ensureDockIsShowingSync = (action: () => void) => {
  const wasDockShowing = app.dock.isVisible();
  if (!wasDockShowing) {
    app.dock.show();
  }

  action();

  if (!wasDockShowing) {
    app.dock.hide();
  }
};
