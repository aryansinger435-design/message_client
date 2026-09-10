import React, { useState, useEffect } from 'react';
import { X, Search, Users, UserPlus, MessageSquare, Loader2, Check } from 'lucide-react';
import api, { getFullMediaUrl } from '../../api/api';
import { useSocket } from '../../context/SocketContext';

export const NewChatModal = ({ onClose, onChatCreated }) => {
  const { isUserOnline } = useSocket();
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'group'
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Group state
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async (query = '') => {
    setLoading(true);
    try {
      const endpoint = query ? `/users/search?q=${encodeURIComponent(query)}` : '/users';
      const res = await api.get(endpoint);
      if (res.data?.success) {
        setUsers(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDirectChat = async (targetUser) => {
    try {
      const res = await api.post('/chats', {
        participants: [targetUser._id],
        type: 'private',
      });
      if (res.data?.success) {
        onChatCreated(res.data.data);
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start chat');
    }
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUsers.length === 0) return;

    setCreatingGroup(true);
    try {
      const res = await api.post('/chats', {
        name: groupName,
        participants: selectedUsers,
        type: 'group',
      });
      if (res.data?.success) {
        onChatCreated(res.data.data);
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md 2xl:max-w-lg 3xl:max-w-xl bg-[#111b21] border border-[#222d34] rounded-2xl 2xl:rounded-3xl shadow-2xl p-4 sm:p-6 2xl:p-8 overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#222d34]">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('direct')}
              className={`px-3 py-1.5 2xl:px-4 2xl:py-2 rounded-lg text-xs 2xl:text-sm font-bold transition ${
                activeTab === 'direct'
                  ? 'bg-[#00a884] text-[#111b21]'
                  : 'bg-[#202c33] text-[#8696a0] hover:text-white'
              }`}
            >
              New Chat
            </button>
            <button
              onClick={() => setActiveTab('group')}
              className={`px-3 py-1.5 2xl:px-4 2xl:py-2 rounded-lg text-xs 2xl:text-sm font-bold transition ${
                activeTab === 'group'
                  ? 'bg-[#00a884] text-[#111b21]'
                  : 'bg-[#202c33] text-[#8696a0] hover:text-white'
              }`}
            >
              New Group
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#8696a0] hover:text-white hover:bg-[#202c33] transition"
          >
            <X className="w-5 h-5 2xl:w-6 2xl:h-6" />
          </button>
        </div>

        {/* Group Name input if in group mode */}
        {activeTab === 'group' && (
          <div className="pt-4">
            <label className="block text-xs font-semibold text-[#8696a0] mb-1.5 uppercase tracking-wider">
              Group Subject
            </label>
            <input
              type="text"
              placeholder="e.g. Project AuraWave"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
            />
            <p className="text-[11px] text-[#8696a0] mt-1">
              Selected: {selectedUsers.length} participants
            </p>
          </div>
        )}

        {/* Search Box */}
        <div className="pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#8696a0]" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 my-2 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-[#8696a0]">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Searching...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#8696a0]">
              No contacts found.
            </div>
          ) : (
            users.map((u) => {
              const online = isUserOnline(u._id);
              const isSelected = selectedUsers.includes(u._id);

              return (
                <div
                  key={u._id}
                  onClick={() =>
                    activeTab === 'direct' ? handleStartDirectChat(u) : toggleSelectUser(u._id)
                  }
                  className={`flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#00a884]/20 border border-[#00a884]/50'
                      : 'hover:bg-[#202c33] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full bg-[#202c33] border border-[#2a3942] flex items-center justify-center overflow-hidden">
                      {u.avatar ? (
                        <img
                          src={getFullMediaUrl(u.avatar)}
                          alt={u.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-sm text-[#00a884]">
                          {u.username?.[0]?.toUpperCase()}
                        </span>
                      )}
                      {online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25d366] rounded-full ring-2 ring-[#111b21]" />
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                        {u.username}
                        {online && (
                          <span className="text-[10px] text-[#25d366] font-normal">online</span>
                        )}
                      </div>
                      <p className="text-xs text-[#8696a0] truncate max-w-[200px]">
                        {u.about || u.email}
                      </p>
                    </div>
                  </div>

                  {activeTab === 'direct' ? (
                    <MessageSquare className="w-4 h-4 text-[#8696a0]" />
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-[#00a884] border-[#00a884] text-[#111b21]'
                          : 'border-[#2a3942]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Group Submit Button */}
        {activeTab === 'group' && (
          <div className="pt-3 border-t border-[#222d34]">
            <button
              onClick={handleCreateGroup}
              disabled={creatingGroup || !groupName.trim() || selectedUsers.length === 0}
              className="w-full py-2.5 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              {creatingGroup ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Users className="w-4 h-4" /> Create Group ({selectedUsers.length})
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
