import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';

import { AuthModal } from './components/auth/AuthModal';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { StatusView } from './components/status/StatusView';
import { CallsView } from './components/calls/CallsView';
import { CallOverlay } from './components/calls/CallOverlay';

const MainLayout = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'status' | 'calls'
  const [activeChat, setActiveChat] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  // Sync dark class on HTML root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0c1317] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00a884] to-[#25d366] flex items-center justify-center font-black text-2xl text-[#111b21] shadow-2xl mb-4 animate-bounce">
          ⚡
        </div>
        <h2 className="text-lg font-bold">AuraWave</h2>
        <p className="text-xs text-[#8696a0] mt-1">Connecting to secure servers...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c1317]">
      {/* Sidebar with Navigation Tabs & Contacts */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeChat={activeChat}
        setActiveChat={setActiveChat}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeTab === 'chats' && (
          <ChatArea activeChat={activeChat} onBack={() => setActiveChat(null)} />
        )}
        {activeTab === 'status' && <StatusView />}
        {activeTab === 'calls' && <CallsView />}
      </div>

      {/* WebRTC Voice & Video Call Overlay (Active across any tab) */}
      <CallOverlay />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CallProvider>
          <MainLayout />
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
