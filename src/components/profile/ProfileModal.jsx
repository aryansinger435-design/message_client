import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Camera, X, Check, LogOut, User, Phone, Info, Loader2 } from 'lucide-react';
import { getFullMediaUrl } from '../../api/api';

export const ProfileModal = ({ onClose }) => {
  const { user, updateProfile, updateAvatar, logout } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [about, setAbout] = useState(user?.about || 'Hey there! I am using AuraWave.');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    try {
      await updateAvatar(file);
    } catch (err) {
      alert(err.message || 'Avatar upload failed');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ username, about, phone });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      alert(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#222d34]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[#00a884]" /> Profile Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#8696a0] hover:text-white hover:bg-[#202c33] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center my-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#00a884] bg-[#202c33] flex items-center justify-center shadow-lg">
              {user?.avatar ? (
                <img
                  src={getFullMediaUrl(user.avatar)}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-[#00a884]">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>

            {/* Hover Camera Icon */}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              {avatarLoading ? (
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              ) : (
                <Camera className="w-7 h-7 text-white" />
              )}
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="hidden"
          />
          <p className="text-xs text-[#8696a0] mt-2">Click photo to update profile avatar</p>
        </div>

        {/* Profile Details Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8696a0] mb-1 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Your Name
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00a884] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8696a0] mb-1 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> About / Bio
            </label>
            <input
              type="text"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Hey there! I am using AuraWave."
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00a884] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8696a0] mb-1 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone Number (Optional)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00a884] transition"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : success ? (
                <>
                  <Check className="w-4 h-4" /> Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>

        {/* Logout Section */}
        <div className="mt-6 pt-4 border-t border-[#222d34]">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl border border-red-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
