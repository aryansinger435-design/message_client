import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Video,
  MoreVertical,
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  Play,
  Pause,
  Download,
  FileText,
  CornerUpLeft,
  Trash2,
  Smile,
  Volume2,
  Palette,
} from 'lucide-react';
import api, { getFullMediaUrl } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';
import { ChatInput } from './ChatInput';

export const ChatArea = ({ activeChat, onBack }) => {
  const { user } = useAuth();
  const { socket, isUserOnline, typingMap } = useSocket();
  const { startCall } = useCall();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('aurawave_wallpaper') || 'obsidian');
  const [showWallpaperMenu, setShowWallpaperMenu] = useState(false);

  const changeWallpaper = (theme) => {
    setWallpaper(theme);
    localStorage.setItem('aurawave_wallpaper', theme);
    setShowWallpaperMenu(false);
  };

  const messagesEndRef = useRef(null);
  const audioRefs = useRef({});

  // Determine chat partner (for 1-on-1 private chat)
  const isGroup = activeChat?.type === 'group';
  const partner = isGroup
    ? null
    : activeChat?.participants?.find((p) => {
        const pId = typeof p === 'object' && p !== null ? (p._id || p.id) : p;
        const uId = user?._id || user?.id;
        return String(pId) !== String(uId);
      });

  const partnerId = partner ? (typeof partner === 'object' ? (partner._id || partner.id) : partner) : null;
  const isPartnerOnline = partnerId ? isUserOnline(partnerId) : false;
  const isPartnerTyping = activeChat ? typingMap[activeChat._id] : null;

  // Fetch messages when activeChat changes
  useEffect(() => {
    if (!activeChat?._id) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/messages/${activeChat._id}`);
        if (res.data?.success) {
          setMessages(res.data.data.messages || []);
          // Mark all as read
          api.put(`/messages/chat/${activeChat._id}/read-all`).catch(() => {});
          if (socket) {
            socket.emit('mark-read', { chatId: activeChat._id });
          }
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    setReplyMessage(null);
  }, [activeChat?._id]);

  // Listen for real-time socket events
  useEffect(() => {
    if (!socket || !activeChat) return;

    // Join room
    socket.emit('join-chat', activeChat._id);

    const handleNewMessage = (newMsg) => {
      if (newMsg.chatId === activeChat._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });

        // Mark as read immediately if window is open
        if (newMsg.sender._id !== user._id) {
          socket.emit('mark-read', { messageId: newMsg._id, chatId: activeChat._id });
        }
      }
    };

    const handleMessageRead = ({ messageId, userId: readUserId }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId && !msg.readBy.includes(readUserId)) {
            return { ...msg, readBy: [...msg.readBy, readUserId] };
          }
          return msg;
        })
      );
    };

    const handleChatRead = ({ chatId, userId: readUserId }) => {
      if (chatId === activeChat._id) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.readBy.includes(readUserId)) {
              return { ...msg, readBy: [...msg.readBy, readUserId] };
            }
            return msg;
          })
        );
      }
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg))
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                isDeletedForEveryone: true,
                content: '🚫 This message was deleted',
                fileUrl: null,
                voiceMessage: null,
              }
            : msg
        )
      );
    };

    socket.on('new-message', handleNewMessage);
    socket.on('message-read', handleMessageRead);
    socket.on('chat-read', handleChatRead);
    socket.on('reaction-updated', handleReactionUpdated);
    socket.on('message-deleted', handleMessageDeleted);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('message-read', handleMessageRead);
      socket.off('chat-read', handleChatRead);
      socket.off('reaction-updated', handleReactionUpdated);
      socket.off('message-deleted', handleMessageDeleted);
    };
  }, [socket, activeChat?._id, user?._id]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Audio Playback
  const togglePlayAudio = (msgId, audioUrl) => {
    if (playingAudioId === msgId) {
      audioRefs.current[msgId]?.pause();
      setPlayingAudioId(null);
    } else {
      if (playingAudioId && audioRefs.current[playingAudioId]) {
        audioRefs.current[playingAudioId].pause();
      }
      if (!audioRefs.current[msgId]) {
        const audio = new Audio(getFullMediaUrl(audioUrl));
        audio.onended = () => setPlayingAudioId(null);
        audioRefs.current[msgId] = audio;
      }
      audioRefs.current[msgId].play();
      setPlayingAudioId(msgId);
    }
  };

  // Reactions
  const handleReaction = (messageId, reaction) => {
    if (socket && activeChat) {
      socket.emit('message-reaction', {
        messageId,
        reaction,
        chatId: activeChat._id,
      });
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId, deleteType) => {
    try {
      await api.post(`/messages/${messageId}/delete`, { deleteType });
      if (deleteType === 'everyone') {
        if (socket && activeChat) {
          socket.emit('delete-message', {
            messageId,
            chatId: activeChat._id,
            deleteType: 'everyone',
          });
        }
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? {
                  ...msg,
                  isDeletedForEveryone: true,
                  content: '🚫 This message was deleted',
                }
              : msg
          )
        );
      } else {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!activeChat) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#111b21] border-b-8 border-[#00a884] p-8 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-[#202c33] border border-[#2a3942] flex items-center justify-center text-[#00a884] shadow-2xl mb-4">
          <Phone className="w-10 h-10 stroke-[1.5]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">AuraWave for Web</h2>
        <p className="text-sm text-[#8696a0] max-w-md">
          Send and receive messages, make crystal-clear voice and video calls, and share stories with end-to-end reliability.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] overflow-hidden relative">
      {/* 1. CHAT HEADER */}
      <div className="h-16 px-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center gap-3">
          {/* Mobile Back Button */}
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 text-[#8696a0] hover:text-white rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <div className="relative w-10 h-10 rounded-full bg-[#111b21] border border-[#2a3942] flex items-center justify-center overflow-hidden">
            {partner?.avatar ? (
              <img
                src={getFullMediaUrl(partner.avatar)}
                alt={partner.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-bold text-sm text-[#00a884]">
                {(isGroup ? activeChat.name : partner?.username)?.[0]?.toUpperCase() || 'C'}
              </span>
            )}
            {isPartnerOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25d366] rounded-full ring-2 ring-[#202c33]" />
            )}
          </div>

          {/* Details */}
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">
              {isGroup ? activeChat.name : partner?.username}
            </h3>
            <p className="text-xs text-[#8696a0]">
              {isPartnerTyping ? (
                <span className="text-[#25d366] font-medium animate-pulse">typing...</span>
              ) : isPartnerOnline ? (
                <span className="text-[#25d366]">online</span>
              ) : partner?.lastSeen ? (
                `last seen ${new Date(partner.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              ) : (
                isGroup ? `${activeChat.participants?.length || 0} participants` : 'offline'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons: Voice Call, Video Call, Menu */}
        <div className="flex items-center gap-1">
          {!isGroup && partner && (
            <>
              <button
                onClick={() => startCall(partner, 'voice')}
                className="p-2.5 rounded-full text-[#8696a0] hover:text-[#00a884] hover:bg-[#111b21] transition cursor-pointer"
                title="Voice Call"
              >
                <Phone className="w-5 h-5" />
              </button>

              <button
                onClick={() => startCall(partner, 'video')}
                className="p-2.5 rounded-full text-[#8696a0] hover:text-[#00a884] hover:bg-[#111b21] transition cursor-pointer"
                title="Video Call"
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Wallpaper Palette Selector */}
          <div className="relative">
            <button
              onClick={() => setShowWallpaperMenu(!showWallpaperMenu)}
              className="p-2.5 rounded-full text-[#8696a0] hover:text-[#00a884] hover:bg-[#111b21] transition cursor-pointer"
              title="Change Wallpaper & Background"
            >
              <Palette className="w-5 h-5" />
            </button>

            {showWallpaperMenu && (
              <div className="absolute right-0 top-12 w-48 bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-2 z-40 animate-fadeIn">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696a0] px-3 py-1.5">
                  Chat Background
                </p>
                <button
                  onClick={() => changeWallpaper('obsidian')}
                  className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition ${
                    wallpaper === 'obsidian'
                      ? 'bg-[#00a884]/20 text-[#00a884] font-bold'
                      : 'text-white hover:bg-[#202c33]'
                  }`}
                >
                  <span>🌟 Classic Obsidian</span>
                  {wallpaper === 'obsidian' && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => changeWallpaper('midnight')}
                  className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition ${
                    wallpaper === 'midnight'
                      ? 'bg-[#00a884]/20 text-[#00a884] font-bold'
                      : 'text-white hover:bg-[#202c33]'
                  }`}
                >
                  <span>🌌 Midnight Cyber</span>
                  {wallpaper === 'midnight' && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => changeWallpaper('emerald')}
                  className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition ${
                    wallpaper === 'emerald'
                      ? 'bg-[#00a884]/20 text-[#00a884] font-bold'
                      : 'text-white hover:bg-[#202c33]'
                  }`}
                >
                  <span>🍃 Emerald Glow</span>
                  {wallpaper === 'emerald' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          <button className="p-2.5 rounded-full text-[#8696a0] hover:text-white hover:bg-[#111b21] transition">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. MESSAGES SCROLL AREA */}
      <div className={`flex-1 overflow-y-auto wallpaper-${wallpaper} px-4 sm:px-12 py-6 space-y-3`}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-xs text-[#8696a0]">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-3 bg-[#111b21] border border-[#222d34] rounded-2xl shadow mb-2 text-[#00a884]">
              🔒
            </div>
            <p className="text-xs text-[#8696a0] max-w-xs">
              Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
            const isRead =
              msg.readBy &&
              msg.readBy.some(
                (id) => (typeof id === 'object' ? id._id : id) !== user?._id
              );

            return (
              <div
                key={msg._id}
                onMouseEnter={() => setHoveredMsgId(msg._id)}
                onMouseLeave={() => setHoveredMsgId(null)}
                className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                {/* Bubble Container */}
                <div
                  className={`relative max-w-[85%] sm:max-w-md rounded-2xl p-2.5 shadow-md ${
                    isMe
                      ? 'bubble-outgoing text-white rounded-tr-xs'
                      : 'bubble-incoming text-[#e9edef] rounded-tl-xs'
                  } ${msg.isDeletedForEveryone ? 'italic opacity-70' : ''}`}
                >
                  {/* Quoted Message Preview */}
                  {msg.replyTo && (
                    <div
                      className={`mb-2 p-2 rounded-lg border-l-4 text-xs ${
                        isMe
                          ? 'bg-[#025142] border-[#25d366]'
                          : 'bg-[#111b21] border-[#00a884]'
                      }`}
                    >
                      <span className="font-semibold block text-[11px] opacity-80">
                        {msg.replyTo.sender?.username || 'User'}
                      </span>
                      <span className="truncate block opacity-70">
                        {msg.replyTo.content || 'Attachment'}
                      </span>
                    </div>
                  )}

                  {/* 🖼️ IMAGE ATTACHMENT */}
                  {msg.messageType === 'image' && msg.fileUrl && (
                    <div
                      onClick={() => setPreviewMedia({ type: 'image', url: msg.fileUrl })}
                      className="mb-1.5 rounded-xl overflow-hidden cursor-pointer bg-black/20"
                    >
                      <img
                        src={getFullMediaUrl(msg.fileUrl)}
                        alt="attachment"
                        className="w-full max-h-72 object-cover rounded-xl hover:scale-102 transition duration-200"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* 🎥 VIDEO ATTACHMENT */}
                  {msg.messageType === 'video' && msg.fileUrl && (
                    <div className="mb-1.5 rounded-xl overflow-hidden bg-black/40">
                      <video
                        src={getFullMediaUrl(msg.fileUrl)}
                        controls
                        className="w-full max-h-72 rounded-xl"
                      />
                    </div>
                  )}

                  {/* 🎤 VOICE MESSAGE PLAYER */}
                  {msg.messageType === 'voice' && (msg.voiceMessage || msg.fileUrl) && (
                    <div className="flex items-center gap-3 p-1 min-w-[200px]">
                      <button
                        onClick={() =>
                          togglePlayAudio(msg._id, msg.voiceMessage || msg.fileUrl)
                        }
                        className="w-10 h-10 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shadow hover:scale-105 transition"
                      >
                        {playingAudioId === msg._id ? (
                          <Pause className="w-5 h-5 fill-current" />
                        ) : (
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1 flex flex-col justify-center gap-1">
                        <div className="flex items-center gap-1 h-5">
                          {[40, 70, 20, 90, 50, 80, 30, 60, 100, 45, 75, 30].map(
                            (height, idx) => (
                              <span
                                key={idx}
                                className={`w-1 rounded-full transition-all ${
                                  playingAudioId === msg._id
                                    ? 'bg-[#25d366]'
                                    : 'bg-white/40'
                                }`}
                                style={{ height: `${height}%` }}
                              />
                            )
                          )}
                        </div>
                        <span className="text-[10px] opacity-75 font-mono">
                          {msg.voiceDuration ? `${msg.voiceDuration}s` : 'Voice Note'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 📄 DOCUMENT ATTACHMENT */}
                  {msg.messageType === 'file' && msg.fileUrl && (
                    <a
                      href={getFullMediaUrl(msg.fileUrl)}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20 hover:bg-black/30 transition mb-1"
                    >
                      <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="text-xs font-semibold truncate">
                          {msg.fileName || 'Document'}
                        </p>
                        <p className="text-[10px] opacity-70">
                          {msg.fileSize
                            ? `${(msg.fileSize / 1024).toFixed(1)} KB`
                            : 'Download'}
                        </p>
                      </div>
                      <Download className="w-4 h-4 opacity-75 hover:opacity-100" />
                    </a>
                  )}

                  {/* Text Message Content */}
                  {msg.content && msg.messageType !== 'voice' && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  )}

                  {/* Message Meta: Time & WhatsApp Checkmarks */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75 select-none">
                    <span>{formatTime(msg.createdAt)}</span>
                    {isMe && !msg.isDeletedForEveryone && (
                      <span>
                        {isRead ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                        ) : (
                          <CheckCheck className="w-3.5 h-3.5 text-white/60" />
                        )}
                      </span>
                    )}
                  </div>

                  {/* Emoji Reactions List */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="absolute -bottom-3 right-2 flex items-center gap-0.5 bg-[#111b21] border border-[#222d34] rounded-full px-1.5 py-0.5 shadow-md">
                      {msg.reactions.map((r, i) => (
                        <span key={i} className="text-xs">
                          {r.reaction}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover Quick Action Toolbar */}
                {hoveredMsgId === msg._id && !msg.isDeletedForEveryone && (
                  <div
                    className={`absolute -top-7 ${
                      isMe ? 'right-0' : 'left-0'
                    } flex items-center gap-1 bg-[#111b21] border border-[#222d34] rounded-xl px-2 py-1 shadow-xl z-20 animate-fadeIn`}
                  >
                    {/* Quick Reactions */}
                    {['❤️', '😂', '👍', '🔥'].map((em) => (
                      <button
                        key={em}
                        onClick={() => handleReaction(msg._id, em)}
                        className="text-xs hover:scale-125 transition"
                      >
                        {em}
                      </button>
                    ))}

                    <span className="w-px h-3 bg-[#222d34] mx-0.5" />

                    {/* Reply */}
                    <button
                      onClick={() => setReplyMessage(msg)}
                      className="p-1 text-[#8696a0] hover:text-white rounded"
                      title="Reply"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete options */}
                    {isMe && (
                      <button
                        onClick={() => handleDeleteMessage(msg._id, 'everyone')}
                        className="p-1 text-red-400 hover:text-red-300 rounded"
                        title="Delete for Everyone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. CHAT INPUT BAR */}
      <ChatInput
        activeChat={activeChat}
        replyMessage={replyMessage}
        onCancelReply={() => setReplyMessage(null)}
      />

      {/* 4. LIGHTBOX MEDIA VIEWER */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={getFullMediaUrl(previewMedia.url)}
            alt="media preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
