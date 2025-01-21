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
export const stringify = (obj: any) => {
  return JSON.stringify(
    obj,
    (key, value) => {
      const MAX_LEN = 200;
      if (typeof value === 'string' && value.length > MAX_LEN) {
        return `${value.slice(0, MAX_LEN)}...`;
      }
      return value;
    },
    2,
  );
};
