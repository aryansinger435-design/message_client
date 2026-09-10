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
import { MobileBottomNav } from './components/navigation/MobileBottomNav';
import { ProfileModal } from './components/profile/ProfileModal';
import { AuraWaveLogo } from './components/common/AuraWaveLogo';

const MainLayout = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'status' | 'calls'
  const [activeChat, setActiveChat] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('aurawave_theme');
    return saved !== null ? saved === 'dark' : true;
  });
  const [profileOpen, setProfileOpen] = useState(false);

  // Sync dark class on HTML root and persist preference
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aurawave_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aurawave_theme', 'light');
    }
  }, [darkMode]);

  if (loading) {
    return (
      <div className="h-screen h-dvh w-screen bg-[#0c1317] flex flex-col items-center justify-center text-white">
        <AuraWaveLogo size={68} className="mb-4 animate-bounce" withGlow={true} />
        <h2 className="text-xl font-extrabold tracking-wide">
          Aura<span className="text-[#00a884]">Wave</span>
        </h2>
        <p className="text-xs text-[#8696a0] mt-1.5 font-medium">Connecting to secure servers...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="h-screen h-dvh w-screen overflow-hidden bg-[#0c1317] flex flex-col md:flex-row relative">
      {/* ========================================================
          1. MOBILE VIEW (screen width < 768px / md)
         ======================================================== */}
      <div className="flex md:hidden flex-col h-full w-full overflow-hidden relative bg-[#111b21]">
        {activeChat ? (
          /* Active chat takes 100% full screen on phone, with back arrow */
          <div className="w-full h-full flex flex-col overflow-hidden">
            <ChatArea activeChat={activeChat} onBack={() => setActiveChat(null)} />
          </div>
        ) : (
          /* When no chat is open, show current tab view + WhatsApp bottom bar */
          <div className="w-full h-full flex flex-col overflow-hidden">
            <div className="flex-1 w-full overflow-hidden relative">
              {activeTab === 'chats' && (
                <Sidebar
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  activeChat={activeChat}
                  setActiveChat={setActiveChat}
                  darkMode={darkMode}
                  setDarkMode={setDarkMode}
                />
              )}
              {activeTab === 'status' && <StatusView />}
              {activeTab === 'calls' && <CallsView />}
            </div>

            {/* WhatsApp Mobile Bottom Navigation Bar */}
            <MobileBottomNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenProfile={() => setProfileOpen(true)}
            />
          </div>
        )}
      </div>

      {/* ========================================================
          2. DESKTOP VIEW (screen width >= 768px / md)
         ======================================================== */}
      <div className="hidden md:flex h-full w-full overflow-hidden">
        {/* Sidebar: Navigation Icons + Chats List */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        {/* Desktop Viewport */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          {activeTab === 'chats' && (
            <ChatArea activeChat={activeChat} onBack={() => setActiveChat(null)} />
          )}
          {activeTab === 'status' && <StatusView />}
          {activeTab === 'calls' && <CallsView />}
        </div>
      </div>

      {/* Profile Settings Modal when triggered from mobile bottom nav */}
      {profileOpen && (
        <ProfileModal
          onClose={() => setProfileOpen(false)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CallProvider>
          <MainLayout />
          {/* WebRTC Voice & Video Call Overlay (Mounted at root across entire app) */}
          <CallOverlay />
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
