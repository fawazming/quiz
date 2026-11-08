import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './auth.jsx';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [state, setState] = useState(null);
  const [adminState, setAdminState] = useState(null);
  const [round1, setRound1] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setState(null);
      setAdminState(null);
      setRound1(null);
      return;
    }
    const socket = io({ auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('state:update', setState);
    socket.on('admin:state', setAdminState);
    socket.on('round1:sync', setRound1);
    socket.on('connect_error', (err) => {
      console.error('Socket error', err.message);
      setConnected(false);
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);

  const emitAck = useCallback((event, payload = {}) => new Promise((resolve, reject) => {
    const socket = socketRef.current;
    if (!socket) return reject(new Error('Not connected'));
    socket.timeout(8000).emit(event, payload, (err, response) => {
      if (err) return reject(new Error('The server did not respond. Check the connection.'));
      if (!response?.ok) return reject(new Error(response?.error || 'Action failed'));
      if (response.state) setRound1(response.state);
      if (response.settings) setState(prev => prev ? { ...prev } : prev);
      resolve(response);
    });
  }), []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, state, adminState, round1, connected, emitAck, setRound1 }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}
