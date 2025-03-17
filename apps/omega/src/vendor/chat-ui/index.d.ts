import { atom } from 'jotai';
import * as React$1 from 'react';
import React__default from 'react';

declare enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
}
declare enum MessageType {
  PlainText = 'plain-text',
  File = 'file',
}
interface MessageTypeDescriptor {
  [MessageType.PlainText]: string;
  [MessageType.File]: InputFile;
  [key: string]: unknown;
}
interface MessageItem<T extends MessageTypeDescriptor = MessageTypeDescriptor> {
  id?: string;
  role: MessageRole;
  avatar?: string;
  conversationId?: string;
  timestamp?: number;
  isFinal?: boolean;
  type: keyof T;
  content?: T[keyof T];
  isArchived?: boolean;
  isWelcome?: boolean;
  showCopyButton?: boolean;
  isDeleting?: boolean;
}
declare enum InputFileType {
  Image = 'image',
  PDF = 'pdf',
  Text = 'text',
  Json = 'json',
  Zip = 'zip',
  Audio = 'audio',
  Video = 'video',
  Keynote = 'keynote',
  Powerpoint = 'powerpoint',
  Excel = 'excel',
  Word = 'word',
  PPTX = 'pptx',
  XLSX = 'xlsx',
  DOCX = 'docx',
  Other = 'other',
  JS = 'js',
  TS = 'ts',
  JSX = 'jsx',
  TSX = 'tsx',
  HTML = 'html',
  CSS = 'css',
  SCSS = 'scss',
  LESS = 'less',
  YAML = 'yaml',
  XML = 'xml',
  TOML = 'toml',
  Python = 'py',
  Java = 'java',
  Rust = 'rs',
  Swift = 'swift',
  Go = 'go',
  C = 'c',
  CPP = 'cpp',
  Stylus = 'stylus',
  PHP = 'php',
  Ruby = 'rb',
  Kotlin = 'kt',
  CSharp = 'cs',
  Draft = 'draft',
}
interface InputFile {
  type: InputFileType;
  filename?: string;
  content: string;
  size?: number;
  loading?: boolean;
  isScreenshot?: boolean;
  originalFile?: File;
}

interface ChatStates<T extends MessageTypeDescriptor> {
  inputTextAtom: ReturnType<typeof atom<string>>;
  inputFilesAtom: ReturnType<typeof atom<InputFile[]>>;
  messagesAtom: ReturnType<typeof atom<MessageItem<T>[]>>;
  messageLoadingAtom: ReturnType<typeof atom<boolean>>;
  imageLoadingAtom: ReturnType<typeof atom<boolean>>;
  uploadMessagePromiseRefAtom: ReturnType<
    typeof atom<{
      current: Promise<MessageItem<T> | null> | null;
    }>
  >;
  messageEndRefAtom: ReturnType<
    typeof atom<{
      current: HTMLDivElement | null;
    }>
  >;
  messageSendingAtom: ReturnType<typeof atom<boolean>>;
  isUserScrollingRefAtom: ReturnType<
    typeof atom<{
      current: boolean;
    }>
  >;
}

interface ChatUISlots<T extends MessageTypeDescriptor> {
  /**
   * The slot before input section
   */
  beforeInputContainer?: React.ReactNode;
  /**
   * The slot after the input section
   */
  afterInputContainer?: React.ReactNode;
  /**
   * The slot before the input area
   */
  beforeInputArea?: React.ReactNode;
  /**
   * The slot after the input area
   */
  afterInputArea?: React.ReactNode;
  /**
   * The slot before the message list
   */
  beforeMessageList?: React.ReactNode;
  /**
   * The slot after the message list
   */
  afterMessageList?: React.ReactNode;
  /**
   * The slot before the message
   */
  beforeMessage?: React.ReactNode;
  /**
   * The slot after the message
   */
  afterMessage?: React.ReactNode;
  /**
   * The custom feature buttons
   */
  customFeatures?: React.ReactNode;
  /**
   * Secondary feature buttons
   */
  secondaryFeatures?: React.ReactNode;
  /**
   * Custom send button area
   */
  customSendButton?: React.ReactNode;
  /**
   * custom loading
   */
  customLoading?: React.ReactNode;
  /**
   * The custom message action
   */
  renderCustomMessageActionUI?: (message: MessageItem<T>) => React.ReactNode;
}
interface ChatUIFeatures {
  clearConversationHistory?: boolean;
  uploadFiles?: boolean;
}
interface Avatar {
  user?: React.ReactNode | true;
  assistant?: React.ReactNode | true;
}
interface CommandPanelDataItem {
  icon?: React.ReactNode;
  /**
   * The name for parse result
   */
  name: string;
  /**
   * The text in select panel
   */
  selectText?: string;
  /**
   * The label `@xxx` in input
   */
  label: string;
  /**
   * The description for item
   */
  description?: string;
  /**
   * The items in select panel
   */
  items?: CommandPanelDataItem[];
}
interface CommandPanelConfigValue {
  /**
   * The name of command
   */
  name: string;
  /**
   * The panel title
   */
  data: CommandPanelDataItem[];
}
interface CommandPanelConfig {
  [key: string]: CommandPanelConfigValue;
}
interface ChatUIProps<T extends MessageTypeDescriptor> {
  /**
   * The panel config after user input `@`
   */
  commandPanelConfig?: CommandPanelConfig;
  /**
   * The necessary state and setState method in chat ui
   */
  states?: ChatStates<T>;
  /**
   * The slots for different ui block
   */
  slots?: ChatUISlots<T>;
  /**
   * Features in chat input
   */
  features?: ChatUIFeatures;
  /**
   * The callback implement for send message bahaviour
   */
  onMessageSend?: (
    inputText: string,
    inputFiles: InputFile[],
  ) => void | Promise<void>;
  /**
   * The callback implement for abort message bahaviour
   */
  onMessageAbort?: () => void;
  /**
   * The callback implement for command panel select
   */
  onCommandTrigger?: (command: string) => void;
  /**
   * The callback implement for command panel select
   */
  onCommandSelect?: (command: string, item: CommandPanelDataItem) => void;
  /**
   * The callback implement for command panel delete
   */
  onCommandDelete?: (command: string, item: CommandPanelDataItem) => void;
  /**
   * The callback implement for command panel input
   */
  onSuggestionClick?: (suggestion: string) => void | Promise<void>;
  /**
   * The callback implement for clear conversation history
   */
  onClearConversationHistory?: () => void;
  /**
   * The custom style settings for different ui block
   */
  styles?: {
    message?: React.CSSProperties;
    messageList?: React.CSSProperties;
    input?: React.CSSProperties;
    inputContainer?: React.CSSProperties;
    container?: React.CSSProperties;
  };
  /**
   * The custom class name for different ui block
   */
  classNames?: {
    message?: string;
    messageList?: string;
    input?: string;
    inputContainer?: string;
    container?: string;
  };
  /**
   * The welcome message
   */
  welcomeMessage?: MessageItem<T>;
  /**
   * Whether to disable input
   */
  disableInput?: boolean;
  /**
   *  The conversation id for persistence
   */
  conversationId?: string;
  /**
   * Storage database name for message storage to identify different chats
   */
  storageDbName?: string;
  /**
   * Persistent message storage implement
   */
  customMessageStorage?: MessageStorage<T>;
  /**
   * Integrate custom render method for message in different types
   */
  customMessageRender?: (message: MessageItem<T>) => React.ReactNode;
  /**
   * Whether to auto scroll to bottom
   */
  autoScrollToBottom?: boolean;
  /**
   * Placeholder for input
   */
  inputPlaceholder?: string;
  /**
   * Whether to enable dark mode
   */
  isDark?: boolean;
  /**
   * The suggestions for user
   */
  suggestions?: string[];
  /**
   * Avatar for user and assistant
   */
  avatar?: Avatar;
}

interface MessageStorage<
  T extends MessageTypeDescriptor = MessageTypeDescriptor,
> {
  getMessages: (appId: string) => Promise<MessageItem<T>[]> | MessageItem<T>[];
  uploadMessage: (
    message: MessageItem<T>,
  ) => Promise<MessageItem<T> | undefined> | MessageItem<T> | undefined;
  updateMessage: (
    message: Partial<MessageItem<T>>,
  ) => Promise<MessageItem<T> | undefined> | MessageItem<T> | undefined;
  clearMessages: (appId: string) => Promise<void> | void;
  deleteMessage: (messageId: string) => Promise<void> | void;
}

declare class DefaultMessageStorage<T extends MessageTypeDescriptor>
  implements MessageStorage<T>
{
  private store;
  private cache;
  id: number;
  constructor(dbName: string);
  private getMessageIds;
  getStore(): LocalForage;
  private setMessageIds;
  getMessages(conversationId: string): Promise<MessageItem<T>[]>;
  uploadMessage(message: MessageItem<T>): Promise<MessageItem<T> | undefined>;
  updateMessage(
    message: Partial<MessageItem<T>>,
  ): Promise<MessageItem<T> | undefined>;
  clearMessages(conversationId: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
}

interface ChatOptions<T extends MessageTypeDescriptor> {
  states?: ChatStates<T>;
  conversationId?: string;
  storageDbName?: string;
  customMessageStorage?: MessageStorage<T>;
}
declare function useChat<T extends MessageTypeDescriptor>({
  states,
  storageDbName,
  customMessageStorage: messageStorage,
  conversationId,
}?: ChatOptions<T>): {
  addMessage: (
    rawMessage: MessageItem<T>,
    options?: {
      shouldSyncStorage?: boolean;
    },
  ) => Promise<MessageItem<T> | null>;
  updateMessage: (
    messageInfo: Partial<MessageItem<T>>,
    options?: {
      shouldSyncStorage?: boolean;
      messageId?: string;
      shouldScrollToBottom?: boolean;
    },
  ) => Promise<void>;
  messages: MessageItem<T>[];
  setMessages: (
    args_0: MessageItem<T>[] | ((prev: MessageItem<T>[]) => MessageItem<T>[]),
  ) => void;
  initMessages: () => Promise<
    | {
        isFinal: boolean;
        id?: string;
        role: MessageRole;
        avatar?: string;
        conversationId?: string;
        timestamp?: number;
        type: keyof T;
        content?: T[keyof T] | undefined;
        isArchived?: boolean;
        isWelcome?: boolean;
        showCopyButton?: boolean;
        isDeleting?: boolean;
      }[]
    | undefined
  >;
  clearMessages: () => Promise<void>;
  deleteLastMessage: ({
    deleteUIState,
    deleteStorageRecord,
  }: {
    deleteUIState?: boolean;
    deleteStorageRecord?: boolean;
  }) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  messageLoading: boolean;
  setMessageLoading: (args_0: boolean | ((prev: boolean) => boolean)) => void;
  imageLoading: boolean;
  setImageLoading: (args_0: boolean | ((prev: boolean) => boolean)) => void;
  inputText: string;
  setInputText: (args_0: string | ((prev: string) => string)) => void;
  inputFiles: InputFile[];
  setInputFiles: (
    args_0: InputFile[] | ((prev: InputFile[]) => InputFile[]),
  ) => void;
  messageSending: boolean;
  setMessageSending: (args_0: boolean | ((prev: boolean) => boolean)) => void;
  messageEndRef: {
    current: HTMLDivElement | null;
  };
};

declare function createChatStateAtoms<
  T extends MessageTypeDescriptor,
>(): ChatStates<T>;

interface CopyButtonProps {
  getCopyText: () => string;
  tooltipText?: string;
  successText?: string;
}
declare const CopyButton: React__default.FC<CopyButtonProps>;

type MessageContent =
  | string
  | (
      | {
          type: 'image_url';
          image_url: {
            url: string;
          };
        }
      | {
          type: 'text';
          text: string;
        }
      | string
    )[];
interface PromptMessage {
  role: string;
  content: MessageContent;
}
declare const getFileType: (fileName: string) => InputFileType;
declare function getFileIcon(
  fileName: string,
  size?: number,
): React__default.JSX.Element;
declare function normalizeFilesPrompt(
  inputFiles: InputFile[],
): Promise<PromptMessage[]>;
declare function normalizeFiles(inputFiles: InputFile[]): Promise<InputFile[]>;

declare const handleImage: (
  file: File,
  setInputFiles: React.Dispatch<React.SetStateAction<InputFile[]>>,
) => Promise<void>;
declare const handleFileInput: (
  file: File,
  setInputFiles: React.Dispatch<React.SetStateAction<InputFile[]>>,
) => Promise<void>;

declare function FileItemPreview({
  file,
  handleDelete,
  showDeleteIcon,
  itemStyle,
}: {
  file: InputFile;
  handleDelete?: () => void;
  showDeleteIcon?: boolean;
  itemStyle?: React__default.CSSProperties;
}): React__default.JSX.Element;
declare function FilePreview({
  files,
  handleDelete,
  showDeleteIcon,
  containerStyle,
  itemStyle,
}: {
  files: InputFile[];
  handleDelete?: (index: number) => void;
  showDeleteIcon?: boolean;
  containerStyle?: React__default.CSSProperties;
  itemStyle?: React__default.CSSProperties;
}): React__default.JSX.Element;

interface ParsedItem {
  type: 'commandText' | 'text';
  content: string;
}
declare function parseCommandRules(
  text: string,
  config: CommandPanelConfig,
): ParsedItem[];

declare function CommandPanel({
  config,
  isShow,
  setIsShow,
  inputRef,
  filterText,
  setInputText,
  setFilterText,
  command,
  onSelect,
  isLoading,
}: {
  config: CommandPanelConfigValue;
  isShow: boolean;
  command: string;
  setIsShow: (isShow: boolean) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  filterText: string;
  setInputText: (text: string) => void;
  setFilterText: React.Dispatch<React.SetStateAction<string>>;
  onSelect?: (cmd: string, item: CommandPanelDataItem) => void;
  isLoading: boolean;
}): React$1.JSX.Element;

interface IconProps {
  size?: number;
  className?: string;
}

declare function FigmaIcon({ size, className }: IconProps): React$1.JSX.Element;

interface ChatUIRef {
  triggerCommand: (command: string) => void;
  focusInput: () => void;
  getInputTextArea: () => HTMLTextAreaElement | null | undefined;
}
declare const ChatUIComp: <T extends MessageTypeDescriptor>(
  props: ChatUIProps<T> & {
    ref?: React__default.Ref<ChatUIRef>;
  },
) => React__default.ReactElement;
declare const ChatUI: typeof ChatUIComp;

interface MarkdownRendererProps {
  content: string;
  isDark?: boolean;
  smooth?: boolean;
  streamDelay?: number;
}
declare const MarkdownRenderer: React__default.FC<MarkdownRendererProps>;

export {
  type Avatar,
  type ChatStates,
  ChatUI,
  type ChatUIFeatures,
  type ChatUIProps,
  type ChatUISlots,
  CommandPanel,
  type CommandPanelConfig,
  type CommandPanelConfigValue,
  type CommandPanelDataItem,
  CopyButton,
  DefaultMessageStorage,
  FigmaIcon,
  FileItemPreview,
  FilePreview,
  type InputFile,
  InputFileType,
  MarkdownRenderer,
  type MessageItem,
  MessageRole,
  type MessageStorage,
  MessageType,
  type MessageTypeDescriptor,
  createChatStateAtoms,
  getFileIcon,
  getFileType,
  handleFileInput,
  handleImage,
  normalizeFiles,
  normalizeFilesPrompt,
  parseCommandRules,
  useChat,
};
