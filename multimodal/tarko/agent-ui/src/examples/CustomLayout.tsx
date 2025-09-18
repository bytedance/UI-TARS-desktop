import React from 'react';
import { 
  App, 
  Home, 
  Sidebar, 
  Navbar, 
  ChatPanel,
  WebUIConfigProvider 
} from '../index';

// Example 1: Custom Layout with hooks
export const CustomLayoutExample = () => (
  <App
    // Hooks
    onBeforeInit={() => {
      console.log('App initializing...');
    }}
    onAfterInit={() => {
      console.log('App initialized!');
    }}
    
    // Slots
    navbar={
      <Navbar 
        items={
          <div className="flex items-center gap-4">
            <span>Custom Navbar Content</span>
            <button className="btn btn-primary">Custom Action</button>
          </div>
        }
        leftActions={<div>Left Actions</div>}
        rightActions={<div>Right Actions</div>}
      />
    }
    
    sidebar={
      <Sidebar 
        items={
          <div className="p-4">
            <h3 className="font-bold mb-4">Custom Sidebar</h3>
            <ul className="space-y-2">
              <li><a href="#" className="block p-2 hover:bg-gray-100 rounded">Item 1</a></li>
              <li><a href="#" className="block p-2 hover:bg-gray-100 rounded">Item 2</a></li>
              <li><a href="#" className="block p-2 hover:bg-gray-100 rounded">Item 3</a></li>
            </ul>
          </div>
        }
        header={<div className="p-4 border-b">Custom Header</div>}
        footer={<div className="p-4 border-t">Custom Footer</div>}
      />
    }
    
    main={<ChatPanel />}
    
    // Layout options
    layout="default"
    theme="auto"
  />
);

// Example 2: Custom Home Page
export const CustomHomeExample = () => (
  <WebUIConfigProvider>
    <Home
      welcomeMessage={
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Custom Agent TARS
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Your personalized AI assistant experience
          </p>
        </div>
      }
      
      quickActions={[
        <button key="new-chat" className="btn btn-primary">
          Start New Chat
        </button>,
        <button key="upload" className="btn btn-secondary">
          Upload Document
        </button>,
        <button key="templates" className="btn btn-outline">
          Browse Templates
        </button>
      ]}
      
      customSections={[
        <div key="stats" className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Your Statistics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">42</div>
              <div className="text-sm text-gray-600">Conversations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">1.2k</div>
              <div className="text-sm text-gray-600">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">15</div>
              <div className="text-sm text-gray-600">Projects</div>
            </div>
          </div>
        </div>
      ]}
      
      variant="dashboard"
      layout="grid"
    />
  </WebUIConfigProvider>
);

// Example 3: Minimal Layout
export const MinimalLayoutExample = () => (
  <App
    layout="minimal"
    main={
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Minimal Interface</h1>
          <p className="text-gray-600 mb-8">Clean and distraction-free</p>
          <ChatPanel />
        </div>
      </div>
    }
  />
);

// Example 4: Completely Custom Layout
export const CompletelyCustomExample = () => (
  <App layout="custom">
    <div className="h-screen flex flex-col">
      {/* Custom header */}
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">My Custom Agent Interface</h1>
      </header>
      
      {/* Custom main area */}
      <main className="flex-1 flex">
        <aside className="w-64 bg-gray-100 p-4">
          <nav>
            <ul className="space-y-2">
              <li><a href="#" className="block p-2 rounded hover:bg-gray-200">Dashboard</a></li>
              <li><a href="#" className="block p-2 rounded hover:bg-gray-200">Chat</a></li>
              <li><a href="#" className="block p-2 rounded hover:bg-gray-200">Settings</a></li>
            </ul>
          </nav>
        </aside>
        
        <section className="flex-1 p-6">
          <ChatPanel />
        </section>
      </main>
      
      {/* Custom footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>&copy; 2024 Custom Agent TARS</p>
      </footer>
    </div>
  </App>
);
