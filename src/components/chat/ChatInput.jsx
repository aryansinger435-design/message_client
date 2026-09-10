import React, { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  Trash2,
  Image as ImageIcon,
  FileText,
  Video,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import api from '../../api/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const EMOJI_LIST = [
  '😀', '😂', '😍', '🥰', '😎', '🥳', '😭', '😡', '🤔', '👍',
  '👎', '🙏', '❤️', '🔥', '✨', '🎉', '💯', '🚀', '👀', '💩',
  '🙌', '👏', '🤝', '💪', '🌹', '🎂', '🍕', '🍻', '⚡', '☕',
  '😊', '😇', '😘', '😋', '😜', '🤪', '🤩', '🥺', '🙄', '🤐',
];

export const ChatInput = ({ activeChat, replyMessage, onCancelReply, onMessageSent }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  // Voice note recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  // Handle typing debounce
  const handleTextChange = (e) => {
    setText(e.target.value);

    if (socket && activeChat) {
      socket.emit('typing', { chatId: activeChat._id, isTyping: true });

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socket.emit('typing', { chatId: activeChat._id, isTyping: false });
      }, 2000);
    }
  };

  // Dispatch message cleanly via Socket OR REST API fallback (strictly never both)
  const dispatchMessage = async (messageData) => {
    const clientTempId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const payload = { ...messageData, clientTempId };

    // 1. Primary: Real-time WebSocket emission (socket.handler saves to DB and broadcasts to room)
    if (socket && socket.connected) {
      socket.emit('send-message', payload);
      return;
    }

    // 2. Fallback: REST API ONLY when Socket is disconnected or unavailable
    try {
      const res = await api.post('/messages', payload);
      if (res.data?.success && onMessageSent) {
        onMessageSent(res.data.data);
      }
    } catch (err) {
      console.error('API send failed:', err);
    }
  };

  // SEND TEXT MESSAGE
  const handleSendText = async (e) => {
    e?.preventDefault();
    if (!text.trim() || !activeChat || sending) return;

    setSending(true);
    const messageData = {
      chatId: activeChat._id,
      content: text.trim(),
      messageType: 'text',
      replyTo: replyMessage?._id || null,
    };

    setText('');
    setShowEmojis(false);
    onCancelReply();

    try {
      await dispatchMessage(messageData);
    } finally {
      setSending(false);
    }
  };

  // UPLOAD ATTACHMENT
  const handleFileUpload = async (e, type = 'file') => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    setUploading(true);
    setShowAttachments(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        const { fileUrl, fileName, fileSize } = res.data.data;
        let messageType = 'file';
        if (file.type.startsWith('image/')) messageType = 'image';
        else if (file.type.startsWith('video/')) messageType = 'video';
        else if (file.type.startsWith('audio/')) messageType = 'voice';

        const messageData = {
          chatId: activeChat._id,
          content: fileName || 'Attachment',
          messageType,
          fileUrl,
          fileName,
          fileSize,
          replyTo: replyMessage?._id || null,
        };

        onCancelReply();
        await dispatchMessage(messageData);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  // START VOICE RECORDING
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Could not access microphone: ' + err.message);
    }
  };

  // CANCEL VOICE RECORDING
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordDuration(0);
    audioChunksRef.current = [];
  };

  // SEND VOICE RECORDING
  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
        type: 'audio/webm',
      });

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', audioFile);

        const res = await api.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data?.success && activeChat) {
          const { fileUrl } = res.data.data;
          const voiceData = {
            chatId: activeChat._id,
            content: '🎤 Voice message',
            messageType: 'voice',
            voiceMessage: fileUrl,
            voiceDuration: recordDuration,
            fileUrl,
            replyTo: replyMessage?._id || null,
          };
          onCancelReply();
          await dispatchMessage(voiceData);
        }
      } catch (err) {
        alert('Failed to send voice note');
      } finally {
        setUploading(false);
      }
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="relative border-t border-[#222d34] bg-[#202c33]/95 backdrop-blur-md px-2.5 sm:px-4 2xl:px-6 3xl:px-8 py-2 sm:py-2.5 2xl:py-3.5 3xl:py-4 pb-safe z-20 shrink-0">
      <div className="reading-corridor relative">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileUpload(e, 'media')}
          accept="image/*,video/*"
          className="hidden"
        />
        <input
          type="file"
          ref={docInputRef}
          onChange={(e) => handleFileUpload(e, 'doc')}
          accept=".pdf,.doc,.docx,.txt,.zip,.xls,.xlsx"
          className="hidden"
        />

        {/* Quoted Message Preview */}
        {replyMessage && (
          <div className="mb-2 p-2 sm:p-2.5 2xl:p-3 bg-[#111b21] border-l-4 border-[#00a884] rounded-lg 2xl:rounded-xl flex items-center justify-between text-xs 2xl:text-sm animate-fadeIn">
            <div className="overflow-hidden pr-2">
              <span className="text-[#00a884] font-semibold block">
                Replying to {replyMessage.sender?.username || 'user'}
              </span>
              <span className="text-[#8696a0] truncate block">
                {replyMessage.content || 'Attachment'}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 rounded-full text-[#8696a0] hover:text-white hover:bg-[#202c33]"
            >
              <X className="w-4 h-4 2xl:w-5 2xl:h-5" />
            </button>
          </div>
        )}

        {/* Emoji Picker Tray (Responsive across all screens) */}
        {showEmojis && (
          <div className="absolute bottom-16 inset-x-2 sm:inset-x-auto sm:left-4 bg-[#111b21] border border-[#222d34] rounded-2xl p-2 sm:p-3 shadow-2xl z-30 max-w-sm 2xl:max-w-md max-h-52 2xl:max-h-72 overflow-y-auto grid grid-cols-7 sm:grid-cols-8 2xl:grid-cols-9 gap-1 sm:gap-1.5 animate-fadeIn">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setText((prev) => prev + emoji)}
                className="w-8 h-8 2xl:w-10 2xl:h-10 rounded-lg hover:bg-[#202c33] active:bg-[#2a3942] flex items-center justify-center text-lg 2xl:text-xl transition cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Attachment Menu Popup */}
        {showAttachments && (
          <div className="absolute bottom-16 left-3 sm:left-12 bg-[#111b21] border border-[#222d34] rounded-2xl p-2 shadow-2xl z-30 flex flex-col gap-1 w-44 2xl:w-52 animate-fadeIn">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 px-3 py-2 2xl:py-2.5 rounded-xl text-xs 2xl:text-sm font-semibold text-white hover:bg-[#202c33] active:bg-[#2a3942] transition cursor-pointer"
            >
              <div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 2xl:w-5 2xl:h-5" />
              </div>
              Photos & Videos
            </button>

            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="flex items-center gap-3 px-3 py-2 2xl:py-2.5 rounded-xl text-xs 2xl:text-sm font-semibold text-white hover:bg-[#202c33] active:bg-[#2a3942] transition cursor-pointer"
            >
              <div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <FileText className="w-4 h-4 2xl:w-5 2xl:h-5" />
              </div>
              Document
            </button>
          </div>
        )}

        {/* Main Input Row */}
        <div className="flex items-center gap-1.5 sm:gap-2 2xl:gap-3">
          {isRecording ? (
            /* Voice Recording Mode */
            <div className="flex-1 flex items-center justify-between bg-[#111b21] rounded-2xl px-3 sm:px-4 2xl:px-6 py-2 2xl:py-3 border border-red-500/30 animate-pulse-subtle">
              <div className="flex items-center gap-2 sm:gap-3 2xl:gap-4">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 2xl:w-3.5 2xl:h-3.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs 2xl:text-sm font-mono font-bold text-red-400">
                  {formatTimer(recordDuration)}
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-1 2xl:w-1.5 bg-[#00a884] rounded-full voice-bar" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 2xl:w-1.5 bg-[#00a884] rounded-full voice-bar" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 2xl:w-1.5 bg-[#00a884] rounded-full voice-bar" style={{ animationDelay: '300ms' }} />
                  <span className="w-1 2xl:w-1.5 bg-[#00a884] rounded-full voice-bar" style={{ animationDelay: '450ms' }} />
                </div>
              </div>

              <div className="flex items-center gap-2 2xl:gap-3">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="p-2 2xl:p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition cursor-pointer"
                  title="Cancel"
                >
                  <Trash2 className="w-4 h-4 2xl:w-5 2xl:h-5" />
                </button>
                <button
                  type="button"
                  onClick={stopAndSendRecording}
                  className="p-2 2xl:p-2.5 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] rounded-full transition shadow cursor-pointer"
                  title="Send Voice Note"
                >
                  <Check className="w-4 h-4 2xl:w-5 2xl:h-5 stroke-[3]" />
                </button>
              </div>
            </div>
          ) : (
            /* Normal Text & Actions Mode */
            <>
              <button
                type="button"
                onClick={() => {
                  setShowEmojis(!showEmojis);
                  setShowAttachments(false);
                }}
                className={`p-2 2xl:p-2.5 rounded-full transition cursor-pointer shrink-0 ${
                  showEmojis ? 'text-[#00a884] bg-[#111b21]' : 'text-[#8696a0] hover:text-white'
                }`}
              >
                <Smile className="w-6 h-6 2xl:w-7 2xl:h-7" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAttachments(!showAttachments);
                  setShowEmojis(false);
                }}
                className={`p-2 2xl:p-2.5 rounded-full transition cursor-pointer shrink-0 ${
                  showAttachments ? 'text-[#00a884] bg-[#111b21]' : 'text-[#8696a0] hover:text-white'
                }`}
              >
                <Paperclip className="w-5 h-5 2xl:w-6 2xl:h-6 rotate-45" />
              </button>

              <form onSubmit={handleSendText} className="flex-1 min-w-0">
                <input
                  type="text"
                  value={text}
                  onChange={handleTextChange}
                  placeholder="Type a message..."
                  disabled={uploading || sending}
                  className="w-full bg-[#2a3942] border-none rounded-xl 2xl:rounded-2xl px-3.5 sm:px-4 2xl:px-5 py-2 sm:py-2.5 2xl:py-3.5 3xl:py-4 text-base sm:text-sm 2xl:text-base 3xl:text-lg text-white placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                />
              </form>

              {text.trim() ? (
                <button
                  type="button"
                  onClick={handleSendText}
                  disabled={uploading || sending}
                  className="p-2.5 sm:p-3 2xl:p-3.5 3xl:p-4 bg-[#00a884] hover:bg-[#02906f] active:scale-95 text-[#111b21] rounded-full shadow transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Send className="w-5 h-5 2xl:w-6 2xl:h-6" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={uploading}
                  className="p-2.5 sm:p-3 2xl:p-3.5 3xl:p-4 text-[#8696a0] hover:text-white hover:bg-[#2a3942] active:scale-95 rounded-full transition cursor-pointer shrink-0"
                  title="Record voice note"
                >
                  <Mic className="w-5 h-5 2xl:w-6 2xl:h-6" />
                </button>
              )}
            </>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-[#111b21]/80 backdrop-blur-xs flex items-center justify-center gap-2 text-xs 2xl:text-sm text-[#00a884]">
              <Loader2 className="w-4 h-4 2xl:w-5 2xl:h-5 animate-spin" /> Uploading media...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
