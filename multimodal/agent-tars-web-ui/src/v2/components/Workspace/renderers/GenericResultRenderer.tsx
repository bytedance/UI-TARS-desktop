import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiX, FiAlertCircle, FiInfo, FiRefreshCw } from 'react-icons/fi';
import { ToolResultContentPart } from '../../../types';

interface GenericResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * GenericResultRenderer - 智能分析并渲染任意格式的工具结果
 * 
 * 特点:
 * - 自动识别常见的状态模式（成功/失败/信息）
 * - 提取并突出显示关键信息
 * - 优雅处理各种数据结构
 * - 美观一致的卡片式布局
 */
export const GenericResultRenderer: React.FC<GenericResultRendererProps> = ({ part }) => {
  const content = part.text || part.data || {};
  
  // 尝试将字符串内容解析为JSON
  let parsedContent = content;
  if (typeof content === 'string') {
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      // 不是有效的JSON，保持字符串格式
      parsedContent = content;
    }
  }

  // 智能检测结果类型
  const resultInfo = analyzeResult(parsedContent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/30 shadow-sm overflow-hidden max-w-xl w-full">
        {/* 状态头部 */}
        <div className={`py-4 px-5 flex items-center justify-between border-b ${getHeaderClasses(resultInfo.type)}`}>
          <div className="flex items-center">
            {getStatusIcon(resultInfo.type)}
            <span className="font-medium ml-2">{resultInfo.title}</span>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-5">
          {/* 主要消息 */}
          {resultInfo.message && (
            <div className="text-gray-700 dark:text-gray-300 mb-4">
              {resultInfo.message}
            </div>
          )}

          {/* 详细信息区 - 只有在有额外信息时显示 */}
          {resultInfo.details && Object.keys(resultInfo.details).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/30">
              <div className="grid gap-2">
                {Object.entries(resultInfo.details).map(([key, value]) => (
                  <div key={key} className="flex items-start">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">{formatKey(key)}:</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {formatValue(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 空状态处理 */}
          {!resultInfo.message && (!resultInfo.details || Object.keys(resultInfo.details).length === 0) && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-2">
              {resultInfo.type === 'empty' ? 'No content available' : 'Operation completed'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * 分析工具结果并提取关键信息
 */
function analyzeResult(content: any): {
  type: 'success' | 'error' | 'info' | 'empty';
  title: string;
  message: string | null;
  details: Record<string, any>;
} {
  // 默认值
  const result = {
    type: 'info' as const,
    title: 'Operation Result',
    message: null,
    details: {} as Record<string, any>,
  };

  // 处理空内容
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return { ...result, type: 'empty', title: 'Empty Result' };
  }

  // 处理字符串内容
  if (typeof content === 'string') {
    return { ...result, message: content };
  }

  // 处理对象内容
  if (typeof content === 'object') {
    // 检测状态字段
    if ('status' in content) {
      const status = String(content.status).toLowerCase();
      if (status === 'success' || status === 'ok' || status === 'completed') {
        result.type = 'success';
        result.title = 'Success';
      } else if (status === 'error' || status === 'fail' || status === 'failed') {
        result.type = 'error';
        result.title = 'Error';
      }
    }

    // 检测消息字段
    if ('message' in content) {
      result.message = String(content.message);
    } else if ('error' in content) {
      result.message = String(content.error);
      result.type = 'error';
      result.title = 'Error';
    } else if ('msg' in content) {
      result.message = String(content.msg);
    } else if ('content' in content && typeof content.content === 'string') {
      result.message = content.content;
    }

    // 提取标题
    if ('title' in content && typeof content.title === 'string' && content.title.trim()) {
      result.title = content.title;
    } else if (result.message && result.message.length < 50) {
      // 如果消息很短，可以用作标题
      result.title = result.message;
      result.message = null;
    }

    // 收集其他重要字段作为详情
    for (const [key, value] of Object.entries(content)) {
      // 跳过已处理的字段
      if (['status', 'message', 'error', 'msg', 'title'].includes(key)) continue;
      
      // 特殊处理分页信息
      if (key === 'pagination' && typeof value === 'object') {
        for (const [pKey, pValue] of Object.entries(value)) {
          result.details[`pagination.${pKey}`] = pValue;
        }
        continue;
      }
      
      // 添加到详情中
      result.details[key] = value;
    }
  }

  return result;
}

/**
 * 获取状态图标
 */
function getStatusIcon(type: string) {
  switch (type) {
    case 'success':
      return <FiCheck className="text-green-500 dark:text-green-400" size={18} />;
    case 'error':
      return <FiX className="text-red-500 dark:text-red-400" size={18} />;
    case 'empty':
      return <FiInfo className="text-gray-400 dark:text-gray-500" size={18} />;
    case 'info':
    default:
      return <FiInfo className="text-blue-500 dark:text-blue-400" size={18} />;
  }
}

/**
 * 获取头部样式类
 */
function getHeaderClasses(type: string): string {
  switch (type) {
    case 'success':
      return 'border-green-100/50 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/20';
    case 'error':
      return 'border-red-100/50 dark:border-red-800/30 bg-red-50/50 dark:bg-red-900/20';
    case 'empty':
      return 'border-gray-100/50 dark:border-gray-700/30 bg-gray-50/50 dark:bg-gray-800/50';
    case 'info':
    default:
      return 'border-blue-100/50 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-900/20';
  }
}

/**
 * 格式化键名
 */
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1') // 在大写字母前插入空格
    .replace(/^./, (str) => str.toUpperCase()) // 首字母大写
    .replace(/[._]/g, ' '); // 将下划线和点替换为空格
}

/**
 * 格式化值显示
 */
function formatValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 dark:text-gray-500 italic">None</span>;
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (typeof value === 'object') {
    try {
      return <pre className="text-xs bg-gray-50 dark:bg-gray-800/50 p-2 rounded">{JSON.stringify(value, null, 2)}</pre>;
    } catch (e) {
      return String(value);
    }
  }
  
  return String(value);
}
