import { useCallback, useMemo } from 'react';

import { useSetting } from './hooks/useSetting';

const translations = {
  en: {
    appTitle: 'Welcome to UI-TARS Desktop',
    remoteVolcanoIntro:
      'You can also experience the remote versions on Volcano Engine:',
    computerOperator: 'Computer Operator',
    browserOperator: 'Browser Operator',
    computerOperatorDescription:
      'Use the UI-TARS model to automate and complete tasks directly on your computer with AI assistance.',
    browserOperatorDescription:
      'Let the UI-TARS model help you automate browser tasks, from navigating pages to filling out forms.',
    useLocalComputer: 'Use Local Computer',
    useLocalBrowser: 'Use Local Browser',
    newSession: 'New Session',
    newChat: 'New Chat',
    screenshot: 'ScreenShot',
    thinking: 'Thinking...',
    chatPlaceholder: 'What can I do for you today?',
    platform: 'Platform',
    home: 'Home',
    history: 'History',
    more: 'More',
    delete: 'Delete',
    settings: 'Settings',
    vlmSettings: 'VLM Settings',
    chatSettings: 'Chat Settings',
    operatorSettings: 'Operator Settings',
    reportSettings: 'Report Settings',
    generalSettings: 'General Settings',
    localOperatorSettings: 'Local Operator Settings',
    localComputerOperator: 'Local Computer Operator',
    localBrowserOperator: 'Local Browser Operator',
    remoteComputerOperator: 'Remote Computer Operator',
    remoteBrowserOperator: 'Remote Browser Operator',
    language: 'Language',
    languageDescription: 'Control the language used in LLM conversations',
    selectLanguage: 'Select language',
    english: 'English',
    chinese: 'Chinese',
    maxLoop: 'Max Loop',
    maxLoopDescription: 'Enter a number between 25-200',
    loopWaitTime: 'Loop Wait Time (ms)',
    loopWaitDescription: 'Enter a number between 0-3000',
    defaultSearchEngine: 'Default Search Engine:',
    selectSearchEngine: 'Select a search engine',
    reportStorageBaseUrl: 'Report Storage Base URL',
    utioBaseUrl: 'UTIO Base URL',
    checkUpdates: 'Check Updates',
    checking: 'Checking...',
    releaseNotes: 'Release Notes:',
    noUpdateAvailable: 'No update available',
    unpackagedNoUpdate: 'Unpackaged version does not support update check!',
    currentVersionLatest: 'current version: {version} is the latest version',
    importPresetConfig: 'Import Preset Config',
    presetUpdated: 'Preset updated successfully',
    presetUpdateFailed: 'Failed to update preset',
    presetReset: 'Reset to manual mode successfully',
    clear: 'Clear',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
    agree: 'Agree',
    getStart: 'Get Start',
    vlmDialogDescription:
      'Enter VLM settings to enable the model to control the local computer or browser.',
    vlmProvider: 'VLM Provider',
    selectVlmProvider: 'Select VLM provider',
    vlmBaseUrl: 'VLM Base URL',
    enterVlmBaseUrl: 'Enter VLM Base URL',
    vlmApiKey: 'VLM API Key',
    enterVlmApiKey: 'Enter VLM API_Key',
    vlmModelName: 'VLM Model Name',
    enterVlmModelName: 'Enter VLM Model Name',
    useResponsesApi: 'Use Responses API',
    responseApiUnsupported: 'Response API is not supported by this model',
    checkingResponseApi: 'Checking Response API support...',
    checkModelAvailability: 'Check Model Availability',
    checkingModel: 'Checking Model...',
    fillRequiredBeforeResponses:
      'Please fill in all required fields before enabling Response API',
    fillRequiredBeforeModelCheck:
      'Please fill in all required fields before checking model availability',
    modelAvailable:
      'Model "{modelName}" is available and working correctly{suffix}',
    responseApiSupported: '. Response API is supported.',
    responseApiNotSupported: '. But Response API is not supported.',
    modelNotResponding: 'Model "{modelName}" is not responding correctly',
    failedConnectModel: 'Failed to connect to model: {message}',
    settingsSaved: 'Settings saved successfully',
    settingsCleared: 'All settings cleared successfully',
    settingsClearFailed: 'Failed to clear settings',
    unknownError: 'Unknown error occurred',
    deleteSession: 'Delete Session',
    deleteSessionDescription:
      'The current session is running. Navigating away will forcibly stop the session. Do you still want to proceed?',
    navigationAlert: 'Navigation Alert',
    navigationAlertDescription:
      'The current instance is running. Navigating away will forcibly stop the instance. Do you still want to proceed?',
    terminateCurrentInstance: 'Terminate the current instance?',
    terminateDescription:
      'After termination, the current remote instance will be reclaimed, and the task will be paused',
    terminate: 'Terminate',
    freeTrialAgreement: 'Free Trial Service Agreement',
    freeTrialIntro:
      'As part of our research, we offer a 30-minute free trial of our cloud service powered by Volcano Engine, where you can experience UI-TARS with remote computer and browser operations without purchasing model service and computing resources.',
    freeTrialDataNotice:
      'By agreeing to use this service, your data will be transmitted to the servers. Please note that.',
    freeTrialDataCompliance:
      'In compliance with relevant regulations, you should avoid entering any sensitive personal information. All records on the servers will be exclusively used for academic research purposes and will not be utilized for any other activities.',
    freeTrialThanks:
      'Thank you for your support of the UI-TARS research project!',
    freeTrialDontShow: "I agree. Don't show this again",
    callUserTooltip:
      "send last instructions when you done for ui-tars's 'CALL_USER'",
  },
  zh: {
    appTitle: '欢迎使用 UI-TARS Desktop',
    remoteVolcanoIntro: '你也可以在火山引擎体验远程版本：',
    computerOperator: '电脑操作助手',
    browserOperator: '浏览器操作助手',
    computerOperatorDescription:
      '使用 UI-TARS 模型在本机电脑上自动执行和完成任务。',
    browserOperatorDescription:
      '让 UI-TARS 模型帮你自动完成浏览器任务，例如打开网页、导航和填写表单。',
    useLocalComputer: '使用本机电脑',
    useLocalBrowser: '使用本机浏览器',
    newSession: '新会话',
    newChat: '新建对话',
    screenshot: '截图',
    thinking: '思考中...',
    chatPlaceholder: '今天想让我帮你做什么？',
    platform: '平台',
    home: '首页',
    history: '历史记录',
    more: '更多',
    delete: '删除',
    settings: '设置',
    vlmSettings: 'VLM 设置',
    chatSettings: '对话设置',
    operatorSettings: '操作器设置',
    reportSettings: '报告设置',
    generalSettings: '通用设置',
    localOperatorSettings: '本地操作器设置',
    localComputerOperator: '本机电脑操作器',
    localBrowserOperator: '本地浏览器操作器',
    remoteComputerOperator: '远程电脑操作器',
    remoteBrowserOperator: '远程浏览器操作器',
    language: '语言',
    languageDescription: '控制 LLM 对话使用的语言',
    selectLanguage: '选择语言',
    english: '英文',
    chinese: '中文',
    maxLoop: '最大循环次数',
    maxLoopDescription: '请输入 25-200 之间的数字',
    loopWaitTime: '循环等待时间（毫秒）',
    loopWaitDescription: '请输入 0-3000 之间的数字',
    defaultSearchEngine: '默认搜索引擎：',
    selectSearchEngine: '选择搜索引擎',
    reportStorageBaseUrl: '报告存储 Base URL',
    utioBaseUrl: 'UTIO Base URL',
    checkUpdates: '检查更新',
    checking: '检查中...',
    releaseNotes: '发布说明：',
    noUpdateAvailable: '当前没有可用更新',
    unpackagedNoUpdate: '未打包版本不支持检查更新！',
    currentVersionLatest: '当前版本 {version} 已是最新版本',
    importPresetConfig: '导入预设配置',
    presetUpdated: '预设已更新',
    presetUpdateFailed: '预设更新失败',
    presetReset: '已切换回手动模式',
    clear: '清空',
    cancel: '取消',
    save: '保存',
    confirm: '确认',
    agree: '同意',
    getStart: '开始使用',
    vlmDialogDescription: '填写 VLM 设置后，模型才能控制本机电脑或浏览器。',
    vlmProvider: 'VLM 服务商',
    selectVlmProvider: '选择 VLM 服务商',
    vlmBaseUrl: 'VLM Base URL',
    enterVlmBaseUrl: '请输入 VLM Base URL',
    vlmApiKey: 'VLM API Key',
    enterVlmApiKey: '请输入 VLM API Key',
    vlmModelName: 'VLM 模型名称',
    enterVlmModelName: '请输入 VLM 模型名称',
    useResponsesApi: '使用 Responses API',
    responseApiUnsupported: '该模型不支持 Response API',
    checkingResponseApi: '正在检查 Response API 支持情况...',
    checkModelAvailability: '检查模型可用性',
    checkingModel: '正在检查模型...',
    fillRequiredBeforeResponses: '启用 Response API 前，请先填写所有必填项',
    fillRequiredBeforeModelCheck: '检查模型可用性前，请先填写所有必填项',
    modelAvailable: '模型“{modelName}”可用，运行正常{suffix}',
    responseApiSupported: '，并且支持 Response API。',
    responseApiNotSupported: '，但不支持 Response API。',
    modelNotResponding: '模型“{modelName}”没有正常响应',
    failedConnectModel: '连接模型失败：{message}',
    settingsSaved: '设置已保存',
    settingsCleared: '所有设置已清空',
    settingsClearFailed: '清空设置失败',
    unknownError: '发生未知错误',
    deleteSession: '删除会话',
    deleteSessionDescription:
      '当前会话正在运行。离开页面会强制停止该会话，确定继续吗？',
    navigationAlert: '导航提醒',
    navigationAlertDescription:
      '当前实例正在运行。离开页面会强制停止该实例，确定继续吗？',
    terminateCurrentInstance: '终止当前实例？',
    terminateDescription: '终止后，当前远程实例会被回收，任务也会暂停。',
    terminate: '终止',
    freeTrialAgreement: '免费试用服务协议',
    freeTrialIntro:
      '作为研究项目的一部分，我们提供由火山引擎支持的 30 分钟云服务免费试用。你可以在无需购买模型服务和计算资源的情况下，体验 UI-TARS 的远程电脑和浏览器操作能力。',
    freeTrialDataNotice:
      '同意使用此服务即表示你的数据将被传输到服务器，请注意这一点。',
    freeTrialDataCompliance:
      '根据相关法规，请避免输入任何敏感个人信息。服务器上的所有记录仅用于学术研究目的，不会用于其他活动。',
    freeTrialThanks: '感谢你支持 UI-TARS 研究项目！',
    freeTrialDontShow: '我同意，不再显示',
    callUserTooltip: '完成 UI-TARS 的 CALL_USER 请求后，发送上一条指令',
  },
} as const;

type Language = keyof typeof translations;
type TranslationKey = keyof typeof translations.en;

export function useI18n() {
  const { settings } = useSetting();

  const language = useMemo<Language>(() => {
    const browserLanguage = navigator.language.toLowerCase();
    if (settings.language === 'zh' || browserLanguage.startsWith('zh')) {
      return 'zh';
    }

    return 'en';
  }, [settings.language]);

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) => {
      let message: string = translations[language][key] || translations.en[key];

      if (values) {
        Object.entries(values).forEach(([name, value]) => {
          message = message.replace(`{${name}}`, String(value));
        });
      }

      return message;
    },
    [language],
  );

  return { language, t };
}
