import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import { BrandingProvider } from './branding.jsx';
import { SocketProvider } from './socket.jsx';
import { ToastProvider } from './toast.jsx';
import ThemeSync from './ThemeSync.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Join from './pages/Join.jsx';
import Protected from './pages/Protected.jsx';
import AdminApp from './pages/AdminApp.jsx';
import CandidateApp from './pages/CandidateApp.jsx';
import DisplayApp from './pages/DisplayApp.jsx';

export default function App() {
  return (
    <BrandingProvider>
    <AuthProvider>
      <ToastProvider>
        <SocketProvider>
          <ThemeSync />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/join" element={<Join />} />
              <Route path="/display" element={<DisplayApp />} />
              <Route path="/admin" element={<Protected roles={['admin','scorekeeper']}><AdminApp /></Protected>} />
              <Route path="/play" element={<Protected roles={['candidate']}><CandidateApp /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </ToastProvider>
    </AuthProvider>
    </BrandingProvider>
  );
}
