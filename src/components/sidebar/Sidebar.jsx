import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CircleDot,
  Phone,
  Settings,
  Plus,
  Search,
  CheckCheck,
  Check,
  Users,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import api, { getFullMediaUrl } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { NewChatModal } from './NewChatModal';
import { ProfileModal } from '../profile/ProfileModal';
import { AuraWaveLogo } from '../common/AuraWaveLogo';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  activeChat,
  setActiveChat,
  darkMode,
  setDarkMode,
}) => {
  const { user } = useAuth();
  const { socket, isUserOnline } = useSocket();

  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/chats');
      if (res.data?.success) {
        setChats(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Socket listener for new messages to update lastMessage in chat list
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      setChats((prev) => {
        const chatIdx = prev.findIndex((c) => c._id === newMsg.chatId);
        if (chatIdx > -1) {
          const updatedChat = {
            ...prev[chatIdx],
            lastMessage: newMsg,
            lastMessageTime: newMsg.createdAt,
          };
          const next = [...prev];
          next.splice(chatIdx, 1);
          return [updatedChat, ...next];
        }
        return prev;
      });
    };

    socket.on('new-message', handleNewMessage);
    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket]);

  const filteredChats = chats.filter((chat) => {
    const isGroup = chat.type === 'group';
    const partner = isGroup
      ? null
      : chat.participants?.find((p) => {
          const pId = typeof p === 'object' && p !== null ? (p._id || p.id) : p;
          const uId = user?._id || user?.id;
          return String(pId) !== String(uId);
        });
    const title = isGroup ? chat.name : partner?.username;
    return title?.toLowerCase().includes(search.toLowerCase());
  });

  const formatChatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-full w-full md:w-auto border-r border-[#222d34] bg-[#111b21] z-20 shrink-0">
      {/* 1. LEFT ICON NAVIGATION STRIP (DESKTOP ONLY) */}
      <div className="hidden md:flex w-16 2xl:w-20 3xl:w-24 4xl:w-28 bg-[#202c33] flex-col items-center justify-between py-5 2xl:py-7 3xl:py-9 border-r border-[#222d34] shrink-0">
        <div className="flex flex-col items-center gap-6 2xl:gap-8">
          {/* Brand Logo */}
          <AuraWaveLogo size={42} className="cursor-pointer hover:scale-105 transition 2xl:scale-115 3xl:scale-125" withGlow={true} />

          {/* Navigation tabs */}
          <div className="flex flex-col items-center gap-3 2xl:gap-4">
            <button
              onClick={() => setActiveTab('chats')}
              className={`p-3 2xl:p-3.5 3xl:p-4 rounded-2xl transition cursor-pointer ${
                activeTab === 'chats'
                  ? 'bg-[#00a884] text-[#111b21] shadow-md shadow-[#00a884]/20'
                  : 'text-[#8696a0] hover:text-white hover:bg-[#111b21]'
              }`}
              title="Chats"
            >
              <MessageSquare className="w-5 h-5 2xl:w-6 2xl:h-6 3xl:w-7 3xl:h-7" />
            </button>

            <button
              onClick={() => setActiveTab('status')}
              className={`relative p-3 2xl:p-3.5 3xl:p-4 rounded-2xl transition cursor-pointer ${
                activeTab === 'status'
                  ? 'bg-[#00a884] text-[#111b21] shadow-md shadow-[#00a884]/20'
                  : 'text-[#8696a0] hover:text-white hover:bg-[#111b21]'
              }`}
              title="Status"
            >
              <CircleDot className="w-5 h-5 2xl:w-6 2xl:h-6 3xl:w-7 3xl:h-7" />
              <span className="absolute top-2 right-2 w-2 h-2 2xl:w-2.5 2xl:h-2.5 bg-[#25d366] rounded-full ring-2 ring-[#202c33]" />
            </button>

            <button
              onClick={() => setActiveTab('calls')}
              className={`p-3 2xl:p-3.5 3xl:p-4 rounded-2xl transition cursor-pointer ${
                activeTab === 'calls'
                  ? 'bg-[#00a884] text-[#111b21] shadow-md shadow-[#00a884]/20'
                  : 'text-[#8696a0] hover:text-white hover:bg-[#111b21]'
              }`}
              title="Calls"
            >
              <Phone className="w-5 h-5 2xl:w-6 2xl:h-6 3xl:w-7 3xl:h-7" />
            </button>
          </div>
        </div>

        {/* Bottom controls: Theme toggle & Profile */}
        <div className="flex flex-col items-center gap-4 2xl:gap-5">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 2xl:p-3 rounded-full text-[#8696a0] hover:text-white hover:bg-[#111b21] transition"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-5 h-5 2xl:w-6 2xl:h-6 3xl:w-7 3xl:h-7" /> : <Moon className="w-5 h-5 2xl:w-6 2xl:h-6 3xl:w-7 3xl:h-7" />}
          </button>

          <button
            onClick={() => setProfileModalOpen(true)}
            className="relative w-10 h-10 2xl:w-12 2xl:h-12 3xl:w-14 3xl:h-14 rounded-full overflow-hidden border-2 border-[#00a884] bg-[#111b21] flex items-center justify-center cursor-pointer hover:opacity-90 transition"
            title="Profile Settings"
          >
            {user?.avatar ? (
              <img
                src={getFullMediaUrl(user.avatar)}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-bold text-xs 2xl:text-sm 3xl:text-base text-[#00a884]">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. SECONDARY PANE: CHATS LIST */}
      {activeTab === 'chats' && (
        <div className="w-full md:w-72 lg:w-80 xl:w-96 2xl:w-[420px] 3xl:w-[480px] 4xl:w-[540px] 5xl:w-[620px] shrink-0 flex flex-col h-full bg-[#111b21] relative">
          {/* Mobile WhatsApp Header */}
          <div className="flex md:hidden items-center justify-between px-4 py-3 bg-[#202c33] border-b border-[#2a3942] shadow-sm">
            <div className="flex items-center gap-2.5">
              <AuraWaveLogo size={32} />
              <h1 className="text-lg font-extrabold text-white tracking-wide">
                Aura<span className="text-[#00a884]">Wave</span>
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-[#8696a0] hover:text-white rounded-full transition cursor-pointer"
                title="Toggle theme"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setNewChatModalOpen(true)}
                className="p-2 bg-[#00a884]/20 text-[#00a884] hover:bg-[#00a884]/30 rounded-full transition cursor-pointer"
                title="New Chat"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
              <button
                onClick={() => setProfileModalOpen(true)}
                className="w-8 h-8 rounded-full overflow-hidden border border-[#00a884] bg-[#111b21] flex items-center justify-center cursor-pointer ml-1"
                title="Profile"
              >
                {user?.avatar ? (
                  <img src={getFullMediaUrl(user.avatar)} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-xs text-[#00a884]">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex p-4 2xl:p-5 items-center justify-between border-b border-[#222d34]">
            <h2 className="text-xl 2xl:text-2xl 3xl:text-3xl font-bold text-white flex items-center gap-2">
              Chats
            </h2>
            <button
              onClick={() => setNewChatModalOpen(true)}
              className="p-2 2xl:p-2.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold shadow transition cursor-pointer"
              title="New Chat"
            >
              <Plus className="w-4 h-4 2xl:w-5 2xl:h-5 stroke-[3]" />
            </button>
          </div>

          {/* Search bar */}
          <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 2xl:px-5 2xl:py-4">
            <div className="relative">
              <Search className="absolute left-3.5 2xl:left-4 top-3 2xl:top-3.5 w-4 h-4 2xl:w-5 2xl:h-5 text-[#8696a0]" />
              <input
                type="text"
                placeholder="Search or start new chat"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 2xl:pl-12 pr-4 py-2 2xl:py-3 text-base sm:text-xs 2xl:text-sm 3xl:text-base text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
              />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto space-y-1 px-2 pb-24 md:pb-4 touch-scroll">
            {loading ? (
              <div className="text-center py-10 text-xs 2xl:text-sm text-[#8696a0]">
                Loading chats...
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-sm 2xl:text-base font-semibold text-white mb-1">No chats yet</p>
                <p className="text-xs 2xl:text-sm text-[#8696a0] mb-4">
                  Click the plus icon to start a new chat with any registered user.
                </p>
                <button
                  onClick={() => setNewChatModalOpen(true)}
                  className="px-4 py-2 bg-[#00a884] text-[#111b21] font-bold rounded-xl text-xs 2xl:text-sm"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isGroup = chat.type === 'group';
                const partner = isGroup
                  ? null
                  : chat.participants?.find((p) => {
                      const pId = typeof p === 'object' && p !== null ? (p._id || p.id) : p;
                      const uId = user?._id || user?.id;
                      return String(pId) !== String(uId);
                    });
                const partnerId = partner ? (typeof partner === 'object' ? (partner._id || partner.id) : partner) : null;
                const online = partnerId ? isUserOnline(partnerId) : false;
                const isSelected = activeChat?._id === chat._id;
                const lastMsg = chat.lastMessage;

                return (
                  <div
                    key={chat._id}
                    onClick={() => setActiveChat(chat)}
                    className={`flex items-center gap-3.5 2xl:gap-4 p-3 2xl:p-3.5 3xl:p-4 rounded-2xl cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#2a3942] border border-[#00a884]/30'
                        : 'hover:bg-[#202c33] border border-transparent active:bg-[#202c33]'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative w-12 h-12 2xl:w-14 2xl:h-14 3xl:w-16 3xl:h-16 rounded-full overflow-hidden bg-[#202c33] border border-[#2a3942] flex items-center justify-center shrink-0">
                      {isGroup ? (
                        <Users className="w-5 h-5 2xl:w-6 2xl:h-6 text-[#00a884]" />
                      ) : partner?.avatar ? (
                        <img
                          src={getFullMediaUrl(partner.avatar)}
                          alt={partner.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-[#00a884] 2xl:text-lg 3xl:text-xl">
                          {partner?.username?.[0]?.toUpperCase() || 'C'}
                        </span>
                      )}

                      {online && !isGroup && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 2xl:w-3.5 2xl:h-3.5 bg-[#25d366] rounded-full ring-2 ring-[#111b21]" />
                      )}
                    </div>

                    {/* Chat Text Info */}
                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-sm 2xl:text-base 3xl:text-lg font-bold text-white truncate">
                          {isGroup ? chat.name : partner?.username || 'Unknown'}
                        </h4>
                        <span className="text-[10px] 2xl:text-xs 3xl:text-sm text-[#8696a0] shrink-0 ml-2">
                          {formatChatTime(chat.lastMessageTime || chat.updatedAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs 2xl:text-sm 3xl:text-base text-[#8696a0] truncate flex items-center gap-1">
                          {lastMsg ? (
                            <>
                              {lastMsg.sender === user?._id ||
                              lastMsg.sender?._id === user?._id ? (
                                <CheckCheck className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 inline text-[#53bdeb] shrink-0" />
                              ) : null}
                              <span className="truncate">{lastMsg.content || 'Attachment'}</span>
                            </>
                          ) : (
                            <span className="italic opacity-60">No messages yet</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* WhatsApp Mobile Floating Action Button (FAB) */}
          <button
            onClick={() => setNewChatModalOpen(true)}
            className="md:hidden absolute bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#02906f] active:scale-95 text-[#111b21] shadow-xl shadow-[#00a884]/30 flex items-center justify-center cursor-pointer transition"
            title="Start New Chat"
          >
            <MessageSquare className="w-6 h-6 fill-current stroke-none" />
          </button>
        </div>
      )}

      {/* Modals */}
      {newChatModalOpen && (
        <NewChatModal
          onClose={() => setNewChatModalOpen(false)}
          onChatCreated={(newChat) => {
            setChats((prev) => [newChat, ...prev.filter((c) => c._id !== newChat._id)]);
            setActiveChat(newChat);
          }}
        />
      )}

      {profileModalOpen && (
        <ProfileModal
          onClose={() => setProfileModalOpen(false)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      )}
    </div>
  );
};
