// Core App Component (legacy)
export { AgentWebUI } from './standalone/app';

// Provider
export { WebUIConfigProvider } from './config/webui-config-provider';

// Composable Components (New API)
export { ComposableApp as App } from './components/ComposableApp';
export { ComposableHome as Home } from './components/ComposableHome';
export { ComposableSidebar as Sidebar } from './components/ComposableSidebar';
export { ComposableNavbar as Navbar } from './components/ComposableNavbar';

// Original Components (Direct access)
export { default as OriginalApp } from './standalone/app/App';
export { default as OriginalHome } from './standalone/home/HomePage';
export { Sidebar as OriginalSidebar } from './standalone/sidebar';
export { Navbar as OriginalNavbar } from './standalone/navbar';
export { ChatPanel } from './standalone/chat/ChatPanel';
export { WorkspacePanel } from './standalone/workspace/WorkspacePanel';
export { Layout } from './standalone/app/Layout';

// Hooks
export { useSession } from './common/hooks/useSession';
export { useReplayMode } from './common/hooks/useReplayMode';
export { useThemeInitialization } from './common/hooks/useThemeInitialization';

// State & Atoms
export { layoutModeAtom, initializeLayoutModeAtom } from './common/state/atoms/ui';

// CSS - Import for component styling
import './entry.css';
