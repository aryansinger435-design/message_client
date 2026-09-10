import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../api/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingMap, setTypingMap] = useState({}); // { [chatId]: { userId, username } }

  const [lastSeenMap, setLastSeenMap] = useState({}); // { [userId]: Date/string }
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('⚡ Socket connected to AuraWave server');
      setIsConnected(true);
    });

    newSocket.on('online-users', (users) => {
      setOnlineUsers(new Set(users.map((u) => (typeof u === 'object' ? (u._id || u.id) : u).toString())));
    });

    newSocket.on('user-status', ({ userId, status, lastSeen }) => {
      if (!userId) return;
      const uIdStr = (typeof userId === 'object' ? (userId._id || userId.id) : userId).toString();

      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') {
          next.add(uIdStr);
        } else {
          next.delete(uIdStr);
        }
        return next;
      });

      if (lastSeen) {
        setLastSeenMap((prev) => ({
          ...prev,
          [uIdStr]: lastSeen,
        }));
      }
    });

    newSocket.on('user-typing', ({ chatId, userId, username, isTyping }) => {
      setTypingMap((prev) => {
        const updated = { ...prev };
        if (isTyping && userId !== user._id) {
          updated[chatId] = { userId, username };
        } else {
          delete updated[chatId];
        }
        return updated;
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected, reason:', reason);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?._id]);

  // Immediately wake up & reconnect socket when tab becomes visible, focused, or phone unlocked
  useEffect(() => {
    const handleWake = () => {
      if (socket && !socket.connected) {
        console.log('🔄 Device/Tab resumed -> immediately reconnecting socket');
        socket.connect();
      }
    };

    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('online', handleWake);
    window.addEventListener('focus', handleWake);
    window.addEventListener('pageshow', handleWake);
    return () => {
      document.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('online', handleWake);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('pageshow', handleWake);
    };
  }, [socket]);

  const isUserOnline = (userId) => {
    if (!userId) return false;
    const idStr = (typeof userId === 'object' ? (userId._id || userId.id) : userId)?.toString();
    return onlineUsers.has(idStr);
  };

  const getLastSeen = (userId) => {
    if (!userId) return null;
    const idStr = (typeof userId === 'object' ? (userId._id || userId.id) : userId)?.toString();
    return lastSeenMap[idStr] || null;
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        isUserOnline,
        lastSeenMap,
        getLastSeen,
        typingMap,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
