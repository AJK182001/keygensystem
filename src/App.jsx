import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import OtpPage from './compnents/OtpPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/otp" replace />} />
          <Route path="/otp" element={<OtpPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
