import { useSetting } from './useSetting';

type Language = 'en' | 'zh';

const translations: Record<Language, Record<string, string>> = {
  en: {
    'settings.title': 'Settings',
    'settings.vlm': 'VLM Settings',
    'settings.chat': 'Chat Settings',
    'settings.operator': 'Operator Settings',
    'settings.report': 'Report Settings',
    'settings.general': 'General Settings',
    'settings.local_browser': 'Local Browser Operator',

    'general.language': 'Language',
    'general.check_updates': 'Check Updates',
    'general.checking': 'Checking...',
    'general.no_update': 'No update available',
    'general.unpackaged': 'Unpackaged version does not support update check!',
    'general.current_version': 'Current Version',
    'general.latest_version': 'Latest Version',
    'general.release_notes': 'Release Notes',

    'chat.language': 'Conversation Language',
    'chat.language_desc': 'Control the language used in LLM conversations',
    'chat.max_loop': 'Max Loop Count',
    'chat.loop_interval': 'Loop Interval (ms)',
    'chat.loop_desc': 'The interval between each action loop.',

    'chat.input.placeholder': 'What can I do for you today?',

    'sidebar.home': 'Home',
    'sidebar.history': 'History',
    'sidebar.settings': 'Settings',
    'sidebar.more': 'More',
    'sidebar.delete': 'Delete',
    'sidebar.platform': 'Platform',

    'preset.import_title': 'Import Preset',
    'preset.description': 'Import the preset model configuration file.',
    'preset.local_file': 'Local File',
    'preset.remote_url': 'Remote URL',
    'preset.select_file': 'Select a YAML file to import settings preset',
    'preset.choose_file': 'Choose File',
    'preset.preset_url': 'Preset URL',
    'preset.auto_update': 'Auto update on startup',
    'preset.cancel': 'Cancel',
    'preset.import': 'Import',
    'preset.remote_management': 'Remote Preset Management',
    'preset.read_only_tooltip':
      'When using remote preset, settings will be read-only',
    'preset.update': 'Update Preset',
    'preset.reset': 'Reset to Manual',

    'home.welcome': 'Welcome to UI-TARS Desktop',
    'home.experience_remote':
      'You can also experience the remote versions on Volcano Engine:',
    'home.computer_operator': 'Computer Operator',
    'home.browser_operator': 'Browser Operator',
    'home.computer_desc':
      'Use the UI-TARS model to automate and complete tasks directly on your computer with AI assistance.',
    'home.browser_desc':
      'Let the UI-TARS model help you automate browser tasks, from navigating pages to filling out forms.',
    'home.use_local_computer': 'Use Local Computer',
    'home.use_local_browser': 'Use Local Browser',
    'home.and': 'and',

    'local_settings.title': 'VLM Settings',
    'local_settings.description':
      'Enter VLM settings to enable the model to control the local computer or browser.',
    'local_settings.get_started': 'Get Started',

    'run.action': 'Action',
    'run.waiting_user': 'Waiting for user to take control',
    'run.thinking': 'Thinking...',
    'run.screenshot': 'Screenshot',
  },
  zh: {
    'settings.title': '设置',
    'settings.vlm': '模型设置',
    'settings.chat': '对话设置',
    'settings.operator': '操作设置',
    'settings.report': '报告设置',
    'settings.general': '通用设置',
    'settings.local_browser': '本地浏览器操作',

    'general.language': '界面语言',
    'general.check_updates': '检查更新',
    'general.checking': '检查中...',
    'general.no_update': '当前已是最新版本',
    'general.unpackaged': '未打包版本不支持更新检查！',
    'chat.language': '对话语言',
    'chat.language_desc': '控制 LLM 对话中使用的语言',
    'chat.max_loop': '最大循环次数',
    'chat.loop_interval': '循环间隔 (ms)',
    'chat.loop_desc': '每次操作循环之间的间隔。',

    'chat.input.placeholder': '今天我可以为您做什么？',

    'sidebar.home': '首页',
    'sidebar.history': '历史记录',
    'sidebar.settings': '设置',
    'sidebar.more': '更多',
    'sidebar.delete': '删除',
    'sidebar.platform': '平台',

    'general.current_version': '当前版本',
    'general.latest_version': '最新版本',
    'general.release_notes': '发布说明',

    'preset.import_title': '导入预设',
    'preset.description': '导入预设模型配置文件。',
    'preset.local_file': '本地文件',
    'preset.remote_url': '远程 URL',
    'preset.select_file': '选择 YAML 文件以导入设置预设',
    'preset.choose_file': '选择文件',
    'preset.preset_url': '预设 URL',
    'preset.auto_update': '启动时自动更新',
    'preset.cancel': '取消',
    'preset.import': '导入',
    'preset.remote_management': '远程预设管理',
    'preset.read_only_tooltip': '使用远程预设时，设置将为只读',
    'preset.update': '更新预设',
    'preset.reset': '重置为手动',

    'home.welcome': '欢迎使用 UI-TARS Desktop',
    'home.experience_remote': '您也可以在火山引擎上体验远程版本：',
    'home.computer_operator': '电脑操作',
    'home.browser_operator': '浏览器操作',
    'home.computer_desc':
      '使用 UI-TARS 模型在 AI 辅助下直接在电脑上自动化完成任务。',
    'home.browser_desc':
      '让 UI-TARS 模型帮助您自动化浏览器任务，从页面导航到表单填写。',
    'home.use_local_computer': '使用本地电脑',
    'home.use_local_browser': '使用本地浏览器',
    'home.and': '和',

    'local_settings.title': '模型设置',
    'local_settings.description':
      '输入模型设置以启用模型控制本地电脑或浏览器。',
    'local_settings.get_started': '开始使用',

    'run.action': '操作',
    'run.waiting_user': '等待用户接管',
    'run.thinking': '思考中...',
    'run.screenshot': '截图',
  },
};

export function useTranslation() {
  const { settings } = useSetting();
  const language = (settings.uiLanguage as Language) || 'en';

  const t = (key: string) => {
    return translations[language]?.[key] || key;
  };

  return { t, language };
}
