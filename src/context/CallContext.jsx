import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const CallContext = createContext();

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

// Synthesizes working WebRTC tracks (silent audio & animated canvas) for testing or restricted camera/mic environments
const createSynthesizedStream = (wantsVideo, type) => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let audioStream = null;
    if (AudioContextClass) {
      try {
        const audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume?.().catch(() => {});
        }
        const dest = audioCtx.createMediaStreamDestination();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.0001; // extremely low gain so audio packets flow continuously
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        audioStream = dest.stream;
      } catch (audioErr) {
        console.warn('Synthesized audio context error:', audioErr);
      }
    }

    const combined = audioStream ? audioStream : new MediaStream();

    if (wantsVideo) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          let frame = 0;
          const draw = () => {
            ctx.fillStyle = '#111b21';
            ctx.fillRect(0, 0, 320, 240);
            ctx.fillStyle = '#00a884';
            ctx.beginPath();
            ctx.arc(160, 120, 24 + Math.sin(frame) * 6, 0, Math.PI * 2);
            ctx.fill();
            frame += 0.2;
          };
          draw();
          const animInterval = setInterval(draw, 100);

          const getCapture = canvas.captureStream || canvas.mozCaptureStream || canvas.webkitCaptureStream;
          if (getCapture) {
            const canvasStream = getCapture.call(canvas, 15);
            const videoTrack = canvasStream?.getVideoTracks?.()[0];
            if (videoTrack) {
              videoTrack.onended = () => clearInterval(animInterval);
              combined.addTrack(videoTrack);
            }
          }
        }
      } catch (canvasErr) {
        console.warn('Synthesized canvas video error:', canvasErr);
      }
    }

    console.log('ℹ️ Using synthesized media stream for P2P connection');
    return { stream: combined, actualType: type };
  } catch (err) {
    console.error('Synthesized media creation error:', err);
    return { stream: new MediaStream(), actualType: type };
  }
};

// Safe Media Stream Acquisition with seamless Fallback
const acquireMediaStream = async (type = 'voice') => {
  const wantsVideo = type === 'video';

  // 1. Check if mediaDevices API is supported (requires HTTPS or localhost)
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('⚠️ navigator.mediaDevices.getUserMedia is unavailable. Creating synthesized fallback stream.');
    return createSynthesizedStream(wantsVideo, type);
  }

  // 2. Try preferred constraints
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: wantsVideo
        ? {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          }
        : false,
    });
    return { stream, actualType: type };
  } catch (err1) {
    console.warn('Initial getUserMedia failed:', err1.name, err1.message);

    // 3. If video failed (e.g. camera busy on test tab or missing webcam), fallback to audio-only
    if (wantsVideo) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('✅ Fallback to audio-only stream successful');
        return { stream: audioStream, actualType: 'voice' };
      } catch (err2) {
        console.warn('Audio fallback also failed:', err2.message);
      }
    }

    // 4. Fallback: Synthesized stream (guarantees WebRTC negotiation never crashes)
    return createSynthesizedStream(wantsVideo, type);
  }
};

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  // Call States
  const [callActive, setCallActive] = useState(false);
  const [callingUser, setCallingUser] = useState(null);
  const [callType, setCallType] = useState('voice'); // 'voice' | 'video'
  const [isIncoming, setIsIncoming] = useState(false);
  const [callSignal, setCallSignal] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'
  const [callDuration, setCallDuration] = useState(0);

  // Media States
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  // Streams
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);
  const pendingCandidates = useRef([]);

  // Ringtone synthesizer using Web Audio API
  const audioCtxRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);

  const startRingtone = (isCaller = false) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const playBeep = () => {
        try {
          if (ctx.state === 'suspended') ctx.resume();
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.frequency.setValueAtTime(isCaller ? 440 : 480, ctx.currentTime);
          osc2.frequency.setValueAtTime(isCaller ? 480 : 520, ctx.currentTime);

          gain.gain.setValueAtTime(0.06, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start();
          osc2.start();
          osc1.stop(ctx.currentTime + 1.2);
          osc2.stop(ctx.currentTime + 1.2);
        } catch (e) {}
      };

      playBeep();
      ringtoneIntervalRef.current = setInterval(playBeep, 3000);
    } catch (e) {
      console.warn('Ringtone blocked or not allowed yet:', e.message);
    }
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  };

  // Socket event listeners for calling
  useEffect(() => {
    if (!socket) return;

    // 1. INCOMING CALL
    const handleIncomingCall = ({ signal, from, caller, callType: incomingType }) => {
      console.log('📞 INCOMING CALL EVENT RECEIVED! From:', caller?.username || from, 'Type:', incomingType);
      const safeCaller = {
        _id: caller?._id || from,
        username: caller?.username || 'User',
        avatar: caller?.avatar || null,
      };

      setCallingUser(safeCaller);
      setCallType(incomingType || 'voice');
      setCallSignal(signal);
      setIsIncoming(true);
      setCallStatus('ringing');
      setCallActive(true);

      // Trigger mobile haptic vibration if supported
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([400, 200, 400, 200, 400]);
        }
      } catch (vibErr) {}

      // Play ringtone safely
      try {
        startRingtone(false);
      } catch (ringErr) {
        console.warn('Ringtone playback error:', ringErr.message);
      }
    };

    // 2. CALL ACCEPTED (Caller receives answer)
    const handleCallAccepted = async ({ signal, callType: acceptedType }) => {
      console.log('✅ Call accepted by peer');
      stopRingtone();
      setCallStatus('connected');
      if (acceptedType) setCallType(acceptedType);

      if (peerConnectionRef.current && signal) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));

          // Flush any queued ICE candidates
          while (pendingCandidates.current.length > 0) {
            const candidate = pendingCandidates.current.shift();
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (candErr) {
              console.warn('ICE candidate add error on caller:', candErr);
            }
          }
        } catch (e) {
          console.error('Error setting remote description:', e);
        }
      }
    };

    // 3. ICE CANDIDATE
    const handleIceCandidate = async ({ candidate }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription && peerConnectionRef.current.remoteDescription.type) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      } else if (candidate) {
        pendingCandidates.current.push(candidate);
      }
    };

    // 4. CALL REJECTED
    const handleCallRejected = ({ message }) => {
      console.log('❌ Call rejected:', message);
      stopRingtone();
      setCallStatus('ended');
      setTimeout(cleanupCall, 1200);
    };

    // 5. CALL ENDED
    const handleCallEnded = () => {
      console.log('🛑 Call ended by peer');
      stopRingtone();
      setCallStatus('ended');
      setTimeout(cleanupCall, 1000);
    };

    // 6. CALL FAILED
    const handleCallFailed = ({ message }) => {
      stopRingtone();
      alert(message || 'Call could not be completed.');
      cleanupCall();
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-failed', handleCallFailed);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-failed', handleCallFailed);
    };
  }, [socket]);

  // Duration Timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Helper to extract string ID from user object or ID string
  const getUserId = (u) => {
    if (!u) return null;
    return (typeof u === 'object' ? (u._id || u.id) : u)?.toString();
  };

  // ==========================================
  // ==========================================
  // INITIATE CALL (Caller)
  // ==========================================
  const startCall = async (targetUser, requestedType = 'voice') => {
    if (!targetUser) return;
    const targetUserId = getUserId(targetUser);
    if (!targetUserId) {
      console.error('Target user ID is missing');
      return;
    }

    if (!socket || !socket.connected) {
      alert('Network / Socket is currently disconnected. Reconnecting, please try again in a moment...');
      socket?.connect?.();
      return;
    }

    try {
      const safeTarget = typeof targetUser === 'object' && targetUser !== null
        ? targetUser
        : { _id: targetUserId, username: 'Contact' };

      setCallingUser(safeTarget);
      setCallType(requestedType);
      setIsIncoming(false);
      setCallStatus('calling');
      setCallActive(true);
      setCallDuration(0);
      setMicMuted(false);
      setVideoOff(false);

      startRingtone(true);

      // Acquire media safely
      const { stream, actualType } = await acquireMediaStream(requestedType);
      setCallType(actualType);
      setLocalStream(stream);
      localStreamRef.current = stream;

      // Create Peer Connection
      const peer = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = peer;

      // Add local tracks to peer
      if (stream) {
        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });
      }

      // Ensure transceivers exist so SDP always includes audio and video sections
      const senders = peer.getSenders();
      const hasAudio = senders.some((s) => s.track && s.track.kind === 'audio');
      if (!hasAudio) {
        try {
          peer.addTransceiver('audio', { direction: 'sendrecv' });
        } catch (e) {
          console.warn('Could not add audio transceiver:', e);
        }
      }

      const hasVideo = senders.some((s) => s.track && s.track.kind === 'video');
      if (requestedType === 'video' && !hasVideo) {
        try {
          peer.addTransceiver('video', { direction: 'sendrecv' });
        } catch (e) {
          console.warn('Could not add video transceiver:', e);
        }
      }

      // Handle ICE Candidates
      peer.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            to: targetUserId,
            candidate: event.candidate,
          });
        }
      };

      peer.onconnectionstatechange = () => {
        console.log('📶 Peer Connection State (Caller):', peer.connectionState);
      };

      peer.oniceconnectionstatechange = () => {
        console.log('🧊 ICE State (Caller):', peer.iceConnectionState);
      };

      // Handle Remote Tracks (preserving all incoming tracks with brand new MediaStream instance)
      peer.ontrack = (event) => {
        console.log('📡 Received remote track:', event.track.kind);
        const remoteMedia = (event.streams && event.streams[0])
          ? event.streams[0]
          : new MediaStream([event.track]);
        setRemoteStream(new MediaStream(remoteMedia.getTracks()));
      };

      // Create Offer
      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: requestedType === 'video',
      });
      await peer.setLocalDescription(offer);

      socket.emit('call-user', {
        userToCall: targetUserId,
        signalData: offer,
        callType: actualType,
      });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      stopRingtone();
      cleanupCall();
    }
  };

  // ==========================================
  // ANSWER CALL (Recipient)
  // ==========================================
  const answerCall = async () => {
    try {
      if (!callingUser) return;
      const targetUserId = getUserId(callingUser);
      if (!targetUserId) return;

      stopRingtone();
      setCallStatus('connected');

      // Acquire media safely
      const { stream, actualType } = await acquireMediaStream(callType);
      setCallType(actualType);
      setLocalStream(stream);
      localStreamRef.current = stream;

      // Create Peer Connection
      const peer = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = peer;

      if (stream) {
        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });
      }

      // Ensure transceivers on answer side
      const senders = peer.getSenders();
      const hasAudio = senders.some((s) => s.track && s.track.kind === 'audio');
      if (!hasAudio) {
        try {
          peer.addTransceiver('audio', { direction: 'sendrecv' });
        } catch (e) {
          console.warn('Could not add audio transceiver:', e);
        }
      }

      const hasVideo = senders.some((s) => s.track && s.track.kind === 'video');
      if (callType === 'video' && !hasVideo) {
        try {
          peer.addTransceiver('video', { direction: 'sendrecv' });
        } catch (e) {
          console.warn('Could not add video transceiver:', e);
        }
      }

      peer.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            to: targetUserId,
            candidate: event.candidate,
          });
        }
      };

      peer.onconnectionstatechange = () => {
        console.log('📶 Peer Connection State (Recipient):', peer.connectionState);
      };

      peer.oniceconnectionstatechange = () => {
        console.log('🧊 ICE State (Recipient):', peer.iceConnectionState);
      };

      peer.ontrack = (event) => {
        console.log('📡 Remote track received on answer:', event.track.kind);
        const remoteMedia = (event.streams && event.streams[0])
          ? event.streams[0]
          : new MediaStream([event.track]);
        setRemoteStream(new MediaStream(remoteMedia.getTracks()));
      };

      // Set Remote Description (Caller's Offer)
      await peer.setRemoteDescription(new RTCSessionDescription(callSignal));

      // Flush queued candidates
      while (pendingCandidates.current.length > 0) {
        const candidate = pendingCandidates.current.shift();
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (candErr) {
          console.warn('ICE candidate add error on answer:', candErr.message);
        }
      }

      // Create Answer
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit('answer-call', {
        signal: answer,
        to: targetUserId,
        callType: actualType,
      });
    } catch (err) {
      console.error('Failed to answer call:', err);
      rejectCall();
    }
  };

  // REJECT CALL
  const rejectCall = () => {
    stopRingtone();
    if (socket && callingUser) {
      const targetUserId = getUserId(callingUser);
      if (targetUserId) {
        socket.emit('reject-call', { to: targetUserId, callType });
      }
    }
    cleanupCall();
  };

  // END ACTIVE CALL
  const endCall = () => {
    stopRingtone();
    if (socket && callingUser) {
      const targetUserId = getUserId(callingUser);
      if (targetUserId) {
        socket.emit('end-call', {
          to: targetUserId,
          duration: callDuration,
          callType,
        });
      }
    }
    cleanupCall();
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Clean up
  const cleanupCall = () => {
    stopRingtone();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }

    pendingCandidates.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCallActive(false);
    setCallingUser(null);
    setIsIncoming(false);
    setCallSignal(null);
    setCallStatus('idle');
    setCallDuration(0);
    setMicMuted(false);
    setVideoOff(false);
  };

  return (
    <CallContext.Provider
      value={{
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
        startCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMic,
        toggleVideo,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
