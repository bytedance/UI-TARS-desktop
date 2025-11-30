/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { logger } from '@main/logger';
import { NutJSElectronOperator } from '@main/agent/operator';
import {
  DefaultBrowserOperator,
  RemoteBrowserOperator,
} from '@ui-tars/operator-browser';
import { RemoteComputerOperator } from '@main/remote/operators';
import { getScreenSize } from '@main/utils/screen';

/**
 * 获取 SOP 目录路径
 * 开发环境：使用相对路径
 * 生产环境：使用 app.getAppPath() 获取应用根目录
 */
function getSOPDir(): string {
  if (app.isPackaged) {
    // 生产环境：app.getAppPath() 返回 app.asar 或解压后的目录
    return join(app.getAppPath(), 'sop');
  } else {
    // 开发环境
    return join(__dirname, '../../../ui-tars/sop');
  }
}

interface SOPAction {
  reflection: any;
  thought: string;
  action_type: string;
  action_inputs: {
    key?: string;
    content?: string;
    start_box?: string;
    start_coords?: [number, number];
    [key: string]: any;
  };
}

interface SOP {
  title: string;
  description: string;
  user_instruction: string;
  actions: SOPAction[];
}

interface SOPIndex {
  sops: Array<{
    user_instruction: string;
    file_path: string;
    title: string;
    description: string;
  }>;
}

export class SOPManager {
  private static instance: SOPManager;
  private sopIndex: SOPIndex | null = null;
  private sopCache: Map<string, SOP> = new Map();

  private constructor() {}

  static getInstance(): SOPManager {
    if (!SOPManager.instance) {
      SOPManager.instance = new SOPManager();
    }
    return SOPManager.instance;
  }

  /**
   * 获取 SOP 目录的路径
   */
  private getSOPDir(): string {
    // 在开发环境中，使用相对路径
    if (process.env.NODE_ENV === 'development') {
      return join(__dirname, '../../../ui-tars/sop');
    }
    
    // 在生产环境中，使用 app.getAppPath() 获取应用程序路径
    const appPath = app.getAppPath();
    return join(appPath, 'sop');
  }

  /**
   * 加载 SOP 索引
   */
  async loadSOPIndex(): Promise<void> {
    try {
      const sopDir = this.getSOPDir();
      const tocPath = join(sopDir, 'table_of_contents.md');
      logger.info(`[SOPManager] SOP 目录: ${sopDir}`);
      const tocContent = readFileSync(tocPath, 'utf-8');

      // 提取 JSON 部分
      let jsonMatch = tocContent.match(/```json\n([\s\S]*?)\n```/);
      
      // 如果第一个模式不匹配，尝试第二个模式（没有换行符）
      if (!jsonMatch) {
        jsonMatch = tocContent.match(/```json\r?\n([\s\S]*?)\r?\n```/);
      }
      
      if (!jsonMatch) {
        throw new Error('无法解析 table_of_contents.md 中的 JSON 数据');
      }

      this.sopIndex = JSON.parse(jsonMatch[1]);
      logger.info('[SOPManager] SOP 索引加载成功');
    } catch (error) {
      logger.error('[SOPManager] 加载 SOP 索引失败:', error);
      this.sopIndex = { sops: [] };
    }
  }

  /**
   * 根据用户指令查找匹配的 SOP
   */
  findMatchingSOP(userInstruction: string): string | null {
    if (!this.sopIndex) {
      logger.warn('[SOPManager] SOP 索引未加载');
      return null;
    }

    // 精确匹配
    for (const sop of this.sopIndex.sops) {
      if (sop.user_instruction === userInstruction) {
        logger.info(`[SOPManager] 找到精确匹配的 SOP: ${sop.title}`);
        return sop.file_path;
      }
    }

    // 模糊匹配（包含关系）
    for (const sop of this.sopIndex.sops) {
      if (
        userInstruction.includes(sop.user_instruction) ||
        sop.user_instruction.includes(userInstruction)
      ) {
        logger.info(`[SOPManager] 找到模糊匹配的 SOP: ${sop.title}`);
        return sop.file_path;
      }
    }

    logger.info(`[SOPManager] 未找到匹配的 SOP: ${userInstruction}`);
    return null;
  }

  /**
   * 加载指定的 SOP 文件
   */
  async loadSOP(filePath: string): Promise<SOP | null> {
    // 检查缓存
    if (this.sopCache.has(filePath)) {
      return this.sopCache.get(filePath)!;
    }

    try {
      const sopDir = this.getSOPDir();
      const sopPath = join(sopDir, filePath);
      const sopContent = readFileSync(sopPath, 'utf-8');

      // 提取前置元数据
      let frontMatterMatch = sopContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!frontMatterMatch) {
        throw new Error('无法解析 SOP 文件的前置元数据');
      }

      const frontMatter = frontMatterMatch[1];
      const titleMatch = frontMatter.match(/title:\s*"(.+)"/);
      const descriptionMatch = frontMatter.match(/description:\s*"(.+)"/);
      const userInstructionMatch = frontMatter.match(
        /user_instruction:\s*"(.+)"/,
      );

      // 提取动作序列
      let actionsMatch = sopContent.match(/```json\r?\n([\s\S]*?)\r?\n```/);
      if (!actionsMatch) {
        throw new Error('无法解析 SOP 文件中的动作序列');
      }

      const actions = JSON.parse(actionsMatch[1]);

      const sop: SOP = {
        title: titleMatch ? titleMatch[1] : '',
        description: descriptionMatch ? descriptionMatch[1] : '',
        user_instruction: userInstructionMatch ? userInstructionMatch[1] : '',
        actions,
      };

      // 缓存 SOP
      this.sopCache.set(filePath, sop);

      logger.info(`[SOPManager] SOP 加载成功: ${sop.title}`);
      return sop;
    } catch (error) {
      logger.error(`[SOPManager] 加载 SOP 失败 (${filePath}):`, error);
      return null;
    }
  }

  /**
   * 执行 SOP 中的所有动作
   */
  async executeSOP(
    sop: SOP,
    operator:
      | NutJSElectronOperator
      | DefaultBrowserOperator
      | RemoteComputerOperator
      | RemoteBrowserOperator,
    onActionExecute?: (action: SOPAction, index: number, total: number) => void,
    abortController?: AbortController,
  ): Promise<void> {
    logger.info(`[SOPManager] 开始执行 SOP: ${sop.title}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    for (let i = 0; i < sop.actions.length; i++) {
      // 检查是否收到终止信号
      if (abortController?.signal.aborted) {
        logger.info(`[SOPManager] 收到终止信号，停止执行 SOP: ${sop.title}`);
        throw new Error('SOP执行被用户终止');
      }

      const action = sop.actions[i];
      logger.info(
        `[SOPManager] 执行动作 ${i + 1}/${sop.actions.length}: ${action.action_type}`,
      );

      // 在执行动作前，调用回调函数传递动作信息
      if (onActionExecute) {
        onActionExecute(action, i, sop.actions.length);
      }

      try {
        // 在执行动作前再次检查终止信号
        if (abortController?.signal.aborted) {
          logger.info(`[SOPManager] 收到终止信号，停止执行 SOP: ${sop.title}`);
          throw new Error('SOP执行被用户终止');
        }

        await this.executeAction(action, operator);

        // 在等待期间也要检查终止信号
        if (i < sop.actions.length - 1) {
          // 使用可中断的等待
          const waitTime = 3000;
          const checkInterval = 100; // 每100ms检查一次终止信号
          let elapsed = 0;

          while (elapsed < waitTime) {
            if (abortController?.signal.aborted) {
              logger.info(
                `[SOPManager] 收到终止信号，停止执行 SOP: ${sop.title}`,
              );
              throw new Error('SOP执行被用户终止');
            }
            await new Promise((resolve) => setTimeout(resolve, checkInterval));
            elapsed += checkInterval;
          }
        }
      } catch (error) {
        // 如果是用户终止的错误，直接抛出，不需要额外日志
        if (error instanceof Error && error.message === 'SOP执行被用户终止') {
          throw error;
        }

        logger.error(
          `[SOPManager] 执行动作失败 (${i + 1}/${sop.actions.length}):`,
          error,
        );
        throw error;
      }
    }

    logger.info(`[SOPManager] SOP 执行完成: ${sop.title}`);
  }

  /**
   * 执行单个动作
   */
  private async executeAction(
    action: SOPAction,
    operator:
      | NutJSElectronOperator
      | DefaultBrowserOperator
      | RemoteComputerOperator
      | RemoteBrowserOperator,
  ): Promise<void> {
    // 获取屏幕截图
    //const screenshot = await operator.screenshot();

    // 获取实际屏幕尺寸，并缩放 0.7
    const {
      physicalSize: { width: rawWidth, height: rawHeight },
    } = getScreenSize();

    const screenWidth = rawWidth * 0.7;
    const screenHeight = rawHeight * 0.7;

    let actionInputs = { ...action.action_inputs };

    // 构建执行参数
    const executeParams = {
      prediction: `${action.thought}\nAction: ${action.action_type}(${JSON.stringify(actionInputs)})`,
      parsedPrediction: {
        reflection: action.reflection,
        thought: action.thought,
        action_type: action.action_type,
        action_inputs: actionInputs,
      },
      screenWidth,
      screenHeight,
      scaleFactor: 1,
      factors: [1000, 1000] as [number, number], // 默认值
    };

    // 使用 operator 的 execute 方法执行动作
    await operator.execute(executeParams);
  }
}
