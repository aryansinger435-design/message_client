import React from 'react';
import { MessageSquare, CircleDot, Phone, User, Settings } from 'lucide-react';
import { getFullMediaUrl } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

export const MobileBottomNav = ({
  activeTab,
  setActiveTab,
  onOpenProfile,
}) => {
  const { user } = useAuth();

  return (
    <nav className="md:hidden w-full shrink-0 z-40 bg-[#202c33]/95 backdrop-blur-lg border-t border-[#2a3942] flex items-center justify-around py-1 pb-safe shadow-2xl select-none">
      {/* 1. CHATS TAB */}
      <button
        type="button"
        onClick={() => setActiveTab('chats')}
        className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition active:scale-95 cursor-pointer ${
          activeTab === 'chats' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-white'
        }`}
      >
        <div
          className={`relative p-1 px-3 rounded-full transition ${
            activeTab === 'chats' ? 'bg-[#00a884]/20' : ''
          }`}
        >
          <MessageSquare className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className={`text-[10px] mt-0.5 tracking-wide ${activeTab === 'chats' ? 'font-bold text-[#00a884]' : 'font-medium'}`}>
          Chats
        </span>
      </button>

      {/* 2. UPDATES / STATUS TAB */}
      <button
        type="button"
        onClick={() => setActiveTab('status')}
        className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition active:scale-95 cursor-pointer ${
          activeTab === 'status' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-white'
        }`}
      >
        <div
          className={`relative p-1 px-3 rounded-full transition ${
            activeTab === 'status' ? 'bg-[#00a884]/20' : ''
          }`}
        >
          <CircleDot className="w-5 h-5 stroke-[2.2]" />
          <span className="absolute top-1 right-2.5 w-2 h-2 bg-[#25d366] rounded-full ring-2 ring-[#202c33]" />
        </div>
        <span className={`text-[10px] mt-0.5 tracking-wide ${activeTab === 'status' ? 'font-bold text-[#00a884]' : 'font-medium'}`}>
          Updates
        </span>
      </button>

      {/* 3. CALLS TAB */}
      <button
        type="button"
        onClick={() => setActiveTab('calls')}
        className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition active:scale-95 cursor-pointer ${
          activeTab === 'calls' ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-white'
        }`}
      >
        <div
          className={`relative p-1 px-3 rounded-full transition ${
            activeTab === 'calls' ? 'bg-[#00a884]/20' : ''
          }`}
        >
          <Phone className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className={`text-[10px] mt-0.5 tracking-wide ${activeTab === 'calls' ? 'font-bold text-[#00a884]' : 'font-medium'}`}>
          Calls
        </span>
      </button>

      {/* 4. PROFILE / SETTINGS TAB */}
      <button
        type="button"
        onClick={onOpenProfile}
        className="flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 text-[#8696a0] hover:text-white transition active:scale-95 cursor-pointer"
      >
        <div className="relative p-1 px-3 rounded-full">
          <div className="w-5 h-5 rounded-full overflow-hidden border border-[#00a884] flex items-center justify-center bg-[#111b21]">
            {user?.avatar ? (
              <img
                src={getFullMediaUrl(user.avatar)}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[9px] font-bold text-[#00a884]">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] mt-0.5 font-medium tracking-wide">
          Settings
        </span>
      </button>
    </nav>
  );
};
