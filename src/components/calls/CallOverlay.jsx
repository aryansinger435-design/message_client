import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { getFullMediaUrl } from '../../api/api';

export const CallOverlay = () => {
  const {
    callActive,
    callingUser,
    callType,
    isIncoming,
    callStatus,
    callDuration,
    localStream,
    remoteStream,
    micMuted,
    videoOff,
    answerCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Helper to play media safely across all browsers
  const playMedia = (el) => {
    if (!el) return;
    const promise = el.play?.();
    if (promise !== undefined) {
      promise.catch((err) => {
        console.warn('Autoplay prevented by browser:', err?.name);
        setAudioBlocked(true);
      });
    }
  };

  // Bind local stream to video element whenever stream, status, or camera state changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      playMedia(localVideoRef.current);
    }
  }, [localStream, callStatus, callActive, videoOff]);

  // Bind remote stream to both video element and dedicated audio element
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        playMedia(remoteVideoRef.current);
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        playMedia(remoteAudioRef.current);
      }
    }
  }, [remoteStream, callStatus, callActive, callType]);

  if (!callActive) return null;

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 1. INCOMING CALL POPUP BANNER
  if (isIncoming && callStatus === 'ringing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
        <div className="relative w-full max-w-sm bg-[#111b21] border border-[#222d34] rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
          {/* Animated Avatar Ring */}
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-[#00a884]/30 animate-ping" />
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#202c33] border-4 border-[#00a884] shadow-xl flex items-center justify-center">
              {callingUser?.avatar ? (
                <img
                  src={getFullMediaUrl(callingUser.avatar)}
                  alt={callingUser.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-[#00a884]">
                  {callingUser?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-1">{callingUser?.username}</h3>
          <p className="text-xs text-[#00a884] font-medium tracking-wide uppercase flex items-center gap-1.5 mb-6">
            {callType === 'video' ? (
              <>
                <Video className="w-4 h-4 inline" /> Incoming Video Call...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 inline" /> Incoming Voice Call...
              </>
            )}
          </p>

          {/* Action buttons: Accept & Decline */}
          <div className="flex items-center gap-8">
            <button
              onClick={rejectCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition transform hover:scale-110 cursor-pointer"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            <button
              onClick={answerCall}
              className="w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#20bd5a] text-[#111b21] flex items-center justify-center shadow-lg shadow-[#25d366]/30 transition transform hover:scale-110 cursor-pointer animate-bounce"
              title="Accept"
            >
              {callType === 'video' ? (
                <Video className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <Phone className="w-6 h-6 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE CALL FULL-SCREEN OVERLAY
  return (
    <div className="fixed inset-0 z-50 bg-[#0b141a] flex flex-col items-center justify-between p-4 sm:p-8 select-none">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#202c33] border border-[#2a3942] flex items-center justify-center">
            {callingUser?.avatar ? (
              <img
                src={getFullMediaUrl(callingUser.avatar)}
                alt={callingUser.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-bold text-[#00a884]">
                {callingUser?.username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">
              {callingUser?.username}
            </h3>
            <p className="text-xs text-[#00a884] font-medium">
              {callStatus === 'calling'
                ? 'Calling...'
                : callStatus === 'ringing'
                ? 'Ringing...'
                : callStatus === 'connected'
                ? formatTimer(callDuration)
                : 'Call Ended'}
            </p>
          </div>
        </div>
      </div>

      {/* Center Display: Video or Voice Graphic */}
      <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center my-4 overflow-hidden rounded-3xl bg-[#111b21] border border-[#222d34] shadow-2xl">
        {callType === 'video' ? (
          /* Video Layout */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {!remoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#8696a0] text-sm">
                <div className="w-20 h-20 rounded-full bg-[#202c33] flex items-center justify-center mb-3">
                  <Video className="w-10 h-10 text-[#00a884] animate-pulse" />
                </div>
                Connecting video stream...
              </div>
            )}

            {/* Local Video Picture-in-Picture */}
            <div className="absolute top-4 right-4 w-32 sm:w-44 h-48 sm:h-60 rounded-2xl overflow-hidden border-2 border-[#00a884] shadow-2xl bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${videoOff ? 'hidden' : ''}`}
              />
              {videoOff && (
                <div className="w-full h-full flex items-center justify-center bg-[#202c33] text-xs text-[#8696a0]">
                  Camera off
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Voice Layout */
          <div className="flex flex-col items-center justify-center">
            <div className="relative mb-6">
              <div
                className={`absolute -inset-4 rounded-full bg-[#00a884]/20 ${
                  callStatus === 'connected' ? 'animate-pulse' : 'animate-ping'
                }`}
              />
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-[#202c33] border-4 border-[#00a884] shadow-2xl flex items-center justify-center">
                {callingUser?.avatar ? (
                  <img
                    src={getFullMediaUrl(callingUser.avatar)}
                    alt={callingUser.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-[#00a884]">
                    {callingUser?.username?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{callingUser?.username}</h2>
            <div className="flex items-center gap-2 text-sm text-[#00a884] font-mono">
              <Volume2 className="w-4 h-4 animate-bounce" />
              <span>
                {callStatus === 'connected' ? formatTimer(callDuration) : 'Connecting...'}
              </span>
            </div>

          </div>
        )}
      </div>

      {/* Permanent Remote Audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Browser Autoplay safety banner */}
      {audioBlocked && (
        <div className="z-30 mb-2">
          <button
            onClick={() => {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.play?.();
                setAudioBlocked(false);
              }
            }}
            className="px-4 py-2 rounded-xl bg-[#00a884] text-[#111b21] font-bold text-xs flex items-center gap-2 shadow-lg animate-pulse cursor-pointer"
          >
            <Volume2 className="w-4 h-4" /> Tap to Enable Audio
          </button>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div className="z-30 flex items-center gap-4 bg-[#111b21]/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-[#222d34] shadow-2xl">
        {/* Toggle Mic */}
        <button
          onClick={toggleMic}
          className={`p-3.5 rounded-full transition ${
            micMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
              : 'bg-[#202c33] text-white hover:bg-[#2a3942]'
          }`}
          title={micMuted ? 'Unmute' : 'Mute'}
        >
          {micMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Toggle Video (if in video call) */}
        {callType === 'video' && (
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-full transition ${
              videoOff
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-[#202c33] text-white hover:bg-[#2a3942]'
            }`}
            title={videoOff ? 'Turn Video On' : 'Turn Video Off'}
          >
            {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        {/* Hang Up Button */}
        <button
          onClick={endCall}
          className="p-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white transition shadow-lg transform hover:scale-105 cursor-pointer"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
