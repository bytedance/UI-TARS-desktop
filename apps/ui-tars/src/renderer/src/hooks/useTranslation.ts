import { useSetting } from './useSetting';

type Language = 'en' | 'zh';

const translations: Record<Language, Record<string, string>> = {
  en: {
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.clear': 'Clear',
    'common.agree': 'Agree',
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
    'chat.max_loop_desc': 'Enter a number between 25-200',
    'chat.loop_interval_placeholder': 'Enter a number between 0-3000',

    'chat.input.placeholder': 'What can I do for you today?',

    'common.select_language': 'Select language',
    'common.select_search_engine': 'Select a search engine',
    'common.settings_saved': 'Settings saved successfully',
    'common.unknown_error': 'Unknown error occurred',

    'session.new_session': 'New Session',

    'clear_history.aria_clear_messages': 'Clear messages',
    'clear_history.title': 'Clear Chat History',
    'clear_history.description':
      'This will clear all chat messages. This action cannot be undone.',

    'vlm_dialog.title': 'VLM Configuration Required',
    'vlm_dialog.description':
      'Missing VLM configuration. Operator requires these settings to run. Would you like to configure VLM parameters?',

    'free_trial.title': 'Free Trial Service Agreement',
    'free_trial.p1':
      'As part of our research, we offer a 30-minute free trial of our cloud service powered by Volcano Engine, where you can experience UI-TARS with remote computer and browser operations without purchasing model service and computing resources.',
    'free_trial.p2_bold':
      'By agreeing to use this service, your data will be transmitted to the servers. Please note that.',
    'free_trial.p2':
      'In compliance with relevant regulations, you should avoid entering any sensitive personal information. All records on the servers will be exclusively used for academic research purposes and will not be utilized for any other activities.',
    'free_trial.p3':
      'Thank you for your support of the UI-TARS research project!',
    'free_trial.checkbox_label': "I agree. Don't show this again",

    'remote_status.init.title': 'Initializing',
    'remote_status.init.desc': 'Preparing Cloud {name} connection...',
    'remote_status.unavailable.title': 'Unavailable',
    'remote_status.unavailable.desc':
      'This resource is from history and no longer available',
    'remote_status.queuing.title': 'Queuing',
    'remote_status.queuing.desc': 'Waiting in queue to establish connection',
    'remote_status.connecting.title': 'Connecting',
    'remote_status.connecting.desc': 'Establishing Cloud {name} connection...',
    'remote_status.connected.title': 'Connected',
    'remote_status.connected.desc':
      'Cloud {name} connection established successfully',
    'remote_status.expired.title': 'Session Expired',
    'remote_status.expired.desc':
      'The Cloud {name} session has expired. Please create a new chat.',
    'remote_status.error.title': 'Connection Error',
    'remote_status.error.desc':
      'Failed to establish Cloud {name} connection. Please try again.',
    'remote_status.queue_position': 'Position in queue: #{queueNum}',

    'vlm.import_preset': 'Import Preset Config',
    'vlm.provider': 'VLM Provider',
    'vlm.select_provider': 'Select VLM provider',
    'vlm.base_url': 'API Base URL',
    'vlm.base_url_placeholder': 'Enter API Base URL',
    'vlm.api_key': 'API Key',
    'vlm.api_key_placeholder': 'Enter API Key',
    'vlm.model_name': 'Model Name / Endpoint',
    'vlm.model_name_placeholder': 'Enter model name / endpoint',
    'vlm.use_responses_api': 'Use Responses API',
    'vlm.responses_api_not_supported':
      'Response API is not supported by this model',
    'vlm.responses_api_checking': 'Checking Response API support...',
    'vlm.update_preset_failed': 'Failed to update preset',
    'vlm.unknown_error': 'Unknown error occurred',
    'vlm.reset_manual_success': 'Reset to manual mode successfully',
    'vlm.fill_required_before_responses_api':
      'Please fill in all required fields before enabling Response API',
    'vlm.settings_saved': 'Settings saved successfully',
    'vlm.fill_required_before_check':
      'Please fill in all required fields before checking model availability',
    'vlm.checking_model': 'Checking Model...',
    'vlm.check_model_availability': 'Check Model Availability',
    'vlm.failed_connect_model': 'Failed to connect to model',
    'vlm.select_provider_error':
      'Please select a VLM Provider to enhance resolution',
    'vlm.model_check_success_supported':
      'Model "{modelName}" is available. Responses API is supported.',
    'vlm.model_check_success_not_supported':
      'Model "{modelName}" is available. Responses API is not supported.',
    'vlm.model_check_error_not_responding':
      'Model "{modelName}" is not responding correctly',

    'operator.default_search_engine': 'Default Search Engine',

    'report.storage_base_url': 'Report Storage Base URL',
    'report.storage_base_url_placeholder':
      'https://your-report-storage-endpoint.com/upload',
    'report.utio_base_url': 'UTIO Base URL',
    'report.utio_base_url_placeholder':
      'https://your-utio-endpoint.com/collect',

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
    'preset.import_success': 'Preset imported successfully',
    'preset.import_failed': 'Failed to import preset',
    'preset.remote_url_placeholder': 'https://example.com/preset.yaml',
    'preset.last_updated': 'Last updated: {date}',

    'remote_settings.title': '{operator} Settings',
    'remote_settings.description':
      'For long-term stable usage, sign in to the Volcengine FaaS console to upgrade.',
    'remote_settings.step': 'Step {step}',
    'remote_settings.read_document': 'Read Remote Document',
    'remote_settings.remote_settings': 'Remote Settings',
    'remote_settings.vlm_settings': 'VLM Settings',
    'remote_settings.view_document_guide': 'View document guide',
    'remote_settings.get_started': 'Get Started',

    'remote_computer.sandbox_manager_url': 'Sandbox Manager URL',
    'remote_computer.sandbox_manager_url_placeholder':
      'Enter Sandbox Manager URL',
    'remote_computer.user_token': 'User Token',
    'remote_computer.user_token_placeholder': 'Enter User Token',
    'remote_computer.vnc_proxy_server': 'VNC Proxy Server',
    'remote_computer.vnc_proxy_server_placeholder': 'Enter VNC Proxy Server',
    'remote_computer.establish_ip': 'Establish IP',
    'remote_computer.establish_ip_placeholder': 'Enter Establish IP',

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
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.clear': '清空',
    'common.agree': '同意',
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
    'chat.max_loop_desc': '请输入 25-200 之间的数字',
    'chat.loop_interval_placeholder': '请输入 0-3000 之间的数字',

    'chat.input.placeholder': '今天我可以为您做什么？',

    'common.select_language': '请选择语言',
    'common.select_search_engine': '请选择搜索引擎',
    'common.settings_saved': '设置已保存',
    'common.unknown_error': '发生未知错误',

    'session.new_session': '新建会话',

    'clear_history.aria_clear_messages': '清空对话消息',
    'clear_history.title': '清空聊天记录',
    'clear_history.description': '这将清空当前会话的所有消息，且无法撤销。',

    'vlm_dialog.title': '需要模型配置',
    'vlm_dialog.description':
      '缺少模型配置，运行该操作需要这些设置。是否现在去配置模型参数？',

    'free_trial.title': '免费试用服务协议',
    'free_trial.p1':
      '作为研究的一部分，我们提供由火山引擎驱动的 30 分钟云服务免费试用，您无需购买模型服务与计算资源即可体验 UI-TARS 的远程电脑与浏览器操作。',
    'free_trial.p2_bold':
      '同意使用该服务即表示您的数据将会传输至服务器，请知悉。',
    'free_trial.p2':
      '为遵守相关法规，请避免输入任何敏感个人信息。服务器上的所有记录仅用于学术研究目的，不会用于其他活动。',
    'free_trial.p3': '感谢您对 UI-TARS 研究项目的支持！',
    'free_trial.checkbox_label': '我同意，不再提示',

    'remote_status.init.title': '初始化中',
    'remote_status.init.desc': '正在准备连接云{name}...',
    'remote_status.unavailable.title': '不可用',
    'remote_status.unavailable.desc': '该资源来自历史记录，已不可用',
    'remote_status.queuing.title': '排队中',
    'remote_status.queuing.desc': '正在排队等待建立连接',
    'remote_status.connecting.title': '连接中',
    'remote_status.connecting.desc': '正在建立云{name}连接...',
    'remote_status.connected.title': '已连接',
    'remote_status.connected.desc': '云{name}连接已建立',
    'remote_status.expired.title': '会话已过期',
    'remote_status.expired.desc': '云{name}会话已过期，请新建会话。',
    'remote_status.error.title': '连接失败',
    'remote_status.error.desc': '无法建立云{name}连接，请重试。',
    'remote_status.queue_position': '队列位置：#{queueNum}',

    'vlm.import_preset': '导入预设配置',
    'vlm.provider': '模型提供方',
    'vlm.select_provider': '请选择模型提供方',
    'vlm.base_url': 'API 地址',
    'vlm.base_url_placeholder': '请输入 API 地址',
    'vlm.api_key': 'API 密钥',
    'vlm.api_key_placeholder': '请输入 API 密钥',
    'vlm.model_name': '模型名称/接入点',
    'vlm.model_name_placeholder': '请输入模型名称/接入点',
    'vlm.use_responses_api': '启用 Responses API',
    'vlm.responses_api_not_supported': '该模型不支持 Responses API',
    'vlm.responses_api_checking': '正在检查 Responses API 支持情况...',
    'vlm.update_preset_failed': '预设更新失败',
    'vlm.unknown_error': '发生未知错误',
    'vlm.reset_manual_success': '已重置为手动模式',
    'vlm.fill_required_before_responses_api':
      '启用 Responses API 前，请先填写所有必填项',
    'vlm.settings_saved': '设置已保存',
    'vlm.fill_required_before_check': '检查模型可用性前，请先填写所有必填项',
    'vlm.checking_model': '检查中...',
    'vlm.check_model_availability': '检查模型可用性',
    'vlm.failed_connect_model': '连接模型失败',
    'vlm.select_provider_error': '请选择模型提供方以提升分辨率',
    'vlm.model_check_success_supported':
      '模型“{modelName}”可用，且支持 Responses API。',
    'vlm.model_check_success_not_supported':
      '模型“{modelName}”可用，但不支持 Responses API。',
    'vlm.model_check_error_not_responding': '模型“{modelName}”响应异常',

    'operator.default_search_engine': '默认搜索引擎',

    'report.storage_base_url': '报告存储地址',
    'report.storage_base_url_placeholder':
      'https://your-report-storage-endpoint.com/upload',
    'report.utio_base_url': 'UTIO 上报地址',
    'report.utio_base_url_placeholder':
      'https://your-utio-endpoint.com/collect',

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
    'preset.import_success': '预设导入成功',
    'preset.import_failed': '预设导入失败',
    'preset.remote_url_placeholder': 'https://example.com/preset.yaml',
    'preset.last_updated': '上次更新：{date}',

    'remote_settings.title': '{operator} 设置',
    'remote_settings.description':
      '如需长期稳定使用，可登录火山引擎 FaaS 控制台进行升级。',
    'remote_settings.step': '第 {step} 步',
    'remote_settings.read_document': '阅读远程使用说明',
    'remote_settings.remote_settings': '远程配置',
    'remote_settings.vlm_settings': '模型设置',
    'remote_settings.view_document_guide': '查看文档指南',
    'remote_settings.get_started': '开始使用',

    'remote_computer.sandbox_manager_url': 'Sandbox 管理地址',
    'remote_computer.sandbox_manager_url_placeholder':
      '请输入 Sandbox 管理地址',
    'remote_computer.user_token': '用户令牌',
    'remote_computer.user_token_placeholder': '请输入用户令牌',
    'remote_computer.vnc_proxy_server': 'VNC 代理服务',
    'remote_computer.vnc_proxy_server_placeholder': '请输入 VNC 代理服务',
    'remote_computer.establish_ip': '建立连接 IP',
    'remote_computer.establish_ip_placeholder': '请输入建立连接 IP',

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
