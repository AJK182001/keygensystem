import React, { useState } from 'react';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase'; // Import your Firestore instance

const OtpPage = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const generateRandomOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleGenerateOtp = async () => {
    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      const newOtp = generateRandomOtp();
      const newSessionId = sessionId || generateSessionId();
      
      if (!sessionId) {
        setSessionId(newSessionId);
      }

      // Store OTP in Firestore
      await setDoc(doc(db, 'otps', newSessionId), {
        code: newOtp,
        createdAt: Date.now(),
        expiresAt: Date.now() + 15000
      });

      setGeneratedOtp(newOtp);

      const otpWindow = window.open('', '_blank');
      if (otpWindow) {
        otpWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Your OTP Code</title>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .otp-container {
                  background: white;
                  padding: 3rem;
                  border-radius: 20px;
                  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                  text-align: center;
                  max-width: 400px;
                }
                h1 {
                  color: #333;
                  margin-bottom: 1rem;
                  font-size: 1.5rem;
                }
                .otp-code {
                  font-size: 3rem;
                  font-weight: bold;
                  color: #667eea;
                  letter-spacing: 0.5rem;
                  margin: 2rem 0;
                  font-family: 'Courier New', monospace;
                }
                .timer {
                  font-size: 1.2rem;
                  color: #666;
                  margin-top: 1rem;
                }
                .expired {
                  color: #e74c3c;
                  font-size: 1.5rem;
                  font-weight: bold;
                }
                .instructions {
                  color: #666;
                  margin-bottom: 1rem;
                  line-height: 1.6;
                }
              </style>
            </head>
            <body>
              <div class="otp-container">
                <h1>Your One-Time Password</h1>
                <p class="instructions">Copy this code and paste it in the verification form within 15 seconds</p>
                <div class="otp-code" id="otpCode">${newOtp}</div>
                <div class="timer" id="timer">Expires in: <span id="countdown">15</span> seconds</div>
              </div>
              <script>
                let timeLeft = 15;
                const countdownElement = document.getElementById('countdown');
                const timerElement = document.getElementById('timer');
                const otpCodeElement = document.getElementById('otpCode');
                
                const interval = setInterval(() => {
                  timeLeft--;
                  countdownElement.textContent = timeLeft;
                  
                  if (timeLeft <= 0) {
                    clearInterval(interval);
                    otpCodeElement.textContent = 'EXPIRED';
                    timerElement.innerHTML = '<span class="expired">This OTP has expired</span>';
                    setTimeout(() => window.close(), 2000);
                  }
                }, 1000);
              </script>
            </body>
          </html>
        `);
      }

      // Auto-delete OTP from Firestore after 15 seconds
      setTimeout(async () => {
        try {
          await deleteDoc(doc(db, 'otps', newSessionId));
          setGeneratedOtp(null);
        } catch (err) {
          console.error('Error removing expired OTP:', err);
        }
      }, 15000);

    } catch (err) {
      setError('Failed to generate OTP. Please try again.');
      console.error('Error generating OTP:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value;
    const numericValue = value.replace(/[^0-9]/g, '');
    setOtp(numericValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!otp.trim()) {
      setError('OTP code is required');
      return;
    }

    if (otp.length !== 6) {
      setError('OTP code must be exactly 6 digits');
      return;
    }

    if (!sessionId) {
      setError('Please generate an OTP first');
      return;
    }

    setError('');

    try {
      const otpDoc = await getDoc(doc(db, 'otps', sessionId));

      if (!otpDoc.exists()) {
        setError('No OTP found. Please generate a new one.');
        return;
      }

      const otpData = otpDoc.data();
      const currentTime = Date.now();

      if (currentTime > otpData.expiresAt) {
        setError('OTP has expired. Please generate a new one.');
        await deleteDoc(doc(db, 'otps', sessionId));
        setGeneratedOtp(null);
        setSessionId(null);
        return;
      }

      if (otp === otpData.code) {
        setSuccess('OTP verified successfully!');
        await deleteDoc(doc(db, 'otps', sessionId));
        setGeneratedOtp(null);
        setSessionId(null);
        setOtp('');
      } else {
        setError('Invalid OTP code');
      }

    } catch (err) {
      setError('Failed to verify OTP. Please try again.');
      console.error('Error verifying OTP:', err);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '3rem',
        maxWidth: '450px',
        width: '100%'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#333',
          marginBottom: '2rem',
          fontSize: '2rem'
        }}>One Time Password</h1>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={handleOtpChange}
              placeholder="Enter 6-digit OTP code"
              maxLength="6"
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1.2rem',
                border: '2px solid #ddd',
                borderRadius: '10px',
                textAlign: 'center',
                letterSpacing: '0.5rem',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {error && (
            <div style={{
              padding: '1rem',
              marginBottom: '1rem',
              background: '#fee',
              color: '#c33',
              borderRadius: '8px',
              textAlign: 'center'
            }}>{error}</div>
          )}
          
          {success && (
            <div style={{
              padding: '1rem',
              marginBottom: '1rem',
              background: '#efe',
              color: '#3c3',
              borderRadius: '8px',
              textAlign: 'center'
            }}>{success}</div>
          )}
          
          <button 
            type="button" 
            onClick={handleGenerateOtp}
            disabled={isGenerating}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              color: 'white',
              background: isGenerating ? '#999' : '#667eea',
              border: 'none',
              borderRadius: '10px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate OTP'}
          </button>
          
          <button 
            type="submit" 
            disabled={!generatedOtp}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              color: 'white',
              background: !generatedOtp ? '#999' : '#764ba2',
              border: 'none',
              borderRadius: '10px',
              cursor: !generatedOtp ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            Verify OTP
          </button>
          
          <button 
            type="button"
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              color: '#667eea',
              background: 'white',
              border: '2px solid #667eea',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            Back to Login
          </button>
        </form>
        
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#f0f0f0',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '0.9rem',
          color: '#666'
        }}>
          <p style={{ margin: 0 }}>Click "Generate OTP" to receive your verification code in a new tab</p>
        </div>
      </div>
    </div>
  );
};

export default OtpPage;