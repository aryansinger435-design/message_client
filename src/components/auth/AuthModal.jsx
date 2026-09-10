import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  ArrowRight,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { AuraWaveLogo } from '../common/AuraWaveLogo';

export const AuthModal = () => {
  const { login, register, verifyOTP, resendOTP, forgotPassword, resetPassword } = useAuth();

  // 'login' | 'register' | 'otp' | 'forgot-password' | 'reset-password'
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Reset password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Countdown timer for resend OTP
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  // 1. LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      if (errMsg.toLowerCase().includes('verify your email')) {
        setError('Please verify your email. An OTP has been sent to your email address.');
        setMode('otp');
        setResendTimer(60);
      } else {
        setError(errMsg || 'Failed to login. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. REGISTER
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await register(username, email, password);
      setMessage(res.message || 'Verification code sent to your email.');
      setMode('otp');
      setOtp('');
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // 3. VERIFY REGISTRATION OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await verifyOTP(email, otp.trim());
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // 4. FORGOT PASSWORD (REQUEST CODE)
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      setMessage(res.message || 'Password reset OTP has been sent to your email.');
      setMode('reset-password');
      setOtp('');
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  // 5. RESET PASSWORD WITH OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(email, otp.trim(), newPassword);
      setMessage(res.message || 'Password reset successfully! You can now log in.');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setMode('login');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // RESEND CODE
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      if (mode === 'reset-password') {
        await forgotPassword(email);
      } else {
        await resendOTP(email);
      }
      setMessage('A fresh verification code has been dispatched to your email.');
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b141a]/85 backdrop-blur-xl animate-fadeIn">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-[#00a884]/25 to-[#25d366]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md 2xl:max-w-lg 3xl:max-w-xl 4xl:max-w-2xl bg-[#111b21] border border-[#222d34] rounded-3xl shadow-2xl p-5 sm:p-8 2xl:p-10 max-h-[92dvh] overflow-y-auto touch-scroll">
        {/* Top Accent Line */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#00a884] via-[#25d366] to-[#00a884]" />

        {/* Brand Header */}
        <div className="text-center mb-6 2xl:mb-8">
          {mode === 'forgot-password' || mode === 'reset-password' ? (
            <div className="inline-flex items-center justify-center w-14 h-14 2xl:w-16 2xl:h-16 rounded-2xl bg-gradient-to-tr from-[#00a884] to-[#25d366] text-[#111b21] shadow-lg shadow-[#00a884]/30 mb-3">
              <KeyRound className="w-7 h-7 2xl:w-8 2xl:h-8 stroke-[2.5]" />
            </div>
          ) : (
            <AuraWaveLogo size={58} className="mb-3 2xl:scale-110" withGlow={true} />
          )}
          <h1 className="text-2xl sm:text-3xl 2xl:text-4xl 3xl:text-5xl font-extrabold tracking-tight text-white flex items-center justify-center gap-1.5">
            Aura<span className="text-[#00a884]">Wave</span>
          </h1>
          <p className="text-xs sm:text-sm 2xl:text-base text-[#8696a0] mt-1 2xl:mt-2">
            {mode === 'login' && 'Sign in to access your conversations & calls.'}
            {mode === 'register' && 'Create your account to connect with friends.'}
            {mode === 'otp' && 'Verify your email address to continue.'}
            {mode === 'forgot-password' && 'Recover your account password via email.'}
            {mode === 'reset-password' && 'Enter your verification code & new password.'}
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-start gap-2.5 animate-fadeIn">
            <span className="text-sm">⚠️</span>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{message}</span>
          </div>
        )}

        {/* ==========================================
            MODE 1: SIGN IN
           ========================================== */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#8696a0] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#8696a0]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-[#8696a0] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMessage('');
                    setMode('forgot-password');
                  }}
                  className="text-[11px] font-semibold text-[#00a884] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#8696a0]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-extrabold rounded-xl shadow-lg shadow-[#00a884]/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            <div className="text-center pt-3 text-xs text-[#8696a0]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMessage('');
                  setMode('register');
                }}
                className="text-[#00a884] font-bold hover:underline ml-1"
              >
                Register here
              </button>
            </div>
          </form>
        )}

        {/* ==========================================
            MODE 2: REGISTER
           ========================================== */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#8696a0] mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-[#8696a0]" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. aryan_d"
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8696a0] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#8696a0]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8696a0] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#8696a0]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-extrabold rounded-xl shadow-lg shadow-[#00a884]/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Register with Email <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            <div className="text-center pt-3 text-xs text-[#8696a0]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMessage('');
                  setMode('login');
                }}
                className="text-[#00a884] font-bold hover:underline ml-1"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ==========================================
            MODE 3: REGISTRATION OTP VERIFICATION
           ========================================== */}
        {mode === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#202c33]/70 border border-[#2a3942] text-center mb-3">
              <div className="w-10 h-10 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center mx-auto mb-2">
                <Mail className="w-5 h-5" />
              </div>
              <p className="text-xs text-[#8696a0]">We sent a 6-digit verification code to:</p>
              <p className="text-sm font-bold text-white mt-0.5 break-all">{email}</p>
              <p className="text-[11px] text-[#00a884] mt-2 font-medium">
                📩 Please check your Email Inbox & Spam folder.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8696a0] mb-1.5 uppercase tracking-wider text-center">
                Enter 6-Digit OTP Code
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-3.5 w-5 h-5 text-[#00a884]" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full bg-[#202c33] border-2 border-[#2a3942] focus:border-[#00a884] rounded-2xl pl-12 pr-4 py-3 text-2xl tracking-[0.3em] font-mono text-center text-white placeholder-[#8696a0]/50 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full mt-3 py-3 px-4 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-extrabold rounded-xl shadow-lg shadow-[#00a884]/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Verify & Enter AuraWave <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-3 text-xs text-[#8696a0]">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || resendTimer > 0}
                className={`font-semibold transition ${
                  resendTimer > 0
                    ? 'text-[#8696a0] cursor-not-allowed'
                    : 'text-[#00a884] hover:underline cursor-pointer'
                }`}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code via Email'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMessage('');
                  setMode('login');
                }}
                className="hover:underline text-[#8696a0]"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* ==========================================
            MODE 4: FORGOT PASSWORD (EMAIL INPUT)
           ========================================== */}
        {mode === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#202c33]/70 border border-[#2a3942] text-center mb-2">
              <p className="text-xs text-[#8696a0] leading-relaxed">
                Enter your registered email address. We will email you a secure 6-digit verification code to reset your password.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8696a0] mb-1.5 uppercase tracking-wider">
                Registered Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#8696a0]" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full mt-3 py-3 px-4 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-extrabold rounded-xl shadow-lg shadow-[#00a884]/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Send Reset Code <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            <div className="text-center pt-3 text-xs text-[#8696a0]">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMessage('');
                  setMode('login');
                }}
                className="text-[#00a884] font-bold hover:underline ml-1"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ==========================================
            MODE 5: RESET PASSWORD (OTP + NEW PASSWORD)
           ========================================== */}
        {mode === 'reset-password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3 rounded-2xl bg-[#202c33]/70 border border-[#2a3942] text-center mb-2">
              <p className="text-xs text-[#8696a0]">
                We emailed a 6-digit OTP code to: <strong className="text-white">{email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8696a0] mb-1.5 uppercase tracking-wider text-center">
                6-Digit Code (from Email)
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-3 w-4 h-4 text-[#00a884]" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="w-full bg-[#202c33] border-2 border-[#2a3942] focus:border-[#00a884] rounded-xl pl-10 pr-4 py-2.5 text-lg tracking-widest font-mono text-center text-white placeholder-[#8696a0]/50 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8696a0] mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#8696a0]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8696a0] mb-1.5 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#8696a0]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6 || !newPassword}
              className="w-full mt-3 py-3 px-4 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-extrabold rounded-xl shadow-lg shadow-[#00a884]/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Update Password <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs text-[#8696a0]">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || resendTimer > 0}
                className={`font-semibold transition ${
                  resendTimer > 0
                    ? 'text-[#8696a0] cursor-not-allowed'
                    : 'text-[#00a884] hover:underline cursor-pointer'
                }`}
              >
                {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMessage('');
                  setMode('login');
                }}
                className="hover:underline text-[#8696a0]"
              >
                Cancel & Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
