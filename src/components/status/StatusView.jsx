import React, { useState, useEffect } from 'react';
import { Plus, Camera, Type, Image as ImageIcon, X, Loader2, Sparkles, Check } from 'lucide-react';
import api, { getFullMediaUrl } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { StatusViewerModal } from './StatusViewerModal';

const COLOR_PALETTE = [
  '#005c4b', // Classic WhatsApp green
  '#1e3a8a', // Deep royal blue
  '#7c2d12', // Warm amber terracotta
  '#581c87', // Purple velvet
  '#831843', // Rose berry
  '#0f766e', // Teal oceanic
  '#1e293b', // Midnight slate
];

export const StatusView = () => {
  const { user } = useAuth();

  const [myStatuses, setMyStatuses] = useState([]);
  const [recentGroups, setRecentGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Status Creation Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [statusType, setStatusType] = useState('text'); // 'text' | 'media'
  const [textContent, setTextContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(COLOR_PALETTE[0]);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active Story Viewer
  const [viewingGroup, setViewingGroup] = useState(null);
  const [isViewingMine, setIsViewingMine] = useState(false);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const [resMy, resRecent] = await Promise.all([
        api.get('/status/me'),
        api.get('/status/recent'),
      ]);

      if (resMy.data?.success) setMyStatuses(resMy.data.data || []);
      if (resRecent.data?.success) setRecentGroups(resRecent.data.data || []);
    } catch (err) {
      console.error('Error loading statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setStatusType('media');
  };

  const handleCreateStatus = async (e) => {
    e.preventDefault();
    if (statusType === 'text' && !textContent.trim()) return;
    if (statusType === 'media' && !mediaFile) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', statusType);

      if (statusType === 'text') {
        formData.append('content', textContent.trim());
        formData.append('backgroundColor', selectedBg);
      } else {
        formData.append('media', mediaFile);
        formData.append('caption', caption.trim());
      }

      const res = await api.post('/status', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        setCreateModalOpen(false);
        setTextContent('');
        setMediaFile(null);
        setMediaPreview(null);
        setCaption('');
        fetchStatuses();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    try {
      await api.delete(`/status/${statusId}`);
      fetchStatuses();
    } catch (err) {
      alert('Failed to delete status');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#111b21] p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#222d34]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Status <Sparkles className="w-5 h-5 text-[#00a884]" />
          </h2>
          <p className="text-xs text-[#8696a0]">Stories disappear after 24 hours</p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold rounded-xl shadow text-xs flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Add Status
        </button>
      </div>

      {/* 1. MY STATUS ROW */}
      <div className="bg-[#202c33] rounded-2xl p-4 border border-[#2a3942] flex items-center justify-between shadow-md">
        <div
          onClick={() => {
            if (myStatuses.length > 0) {
              setViewingGroup({ user, statuses: myStatuses });
              setIsViewingMine(true);
            } else {
              setCreateModalOpen(true);
            }
          }}
          className="flex items-center gap-3.5 cursor-pointer flex-1"
        >
          <div className="relative">
            <div
              className={`w-14 h-14 rounded-full p-0.5 ${
                myStatuses.length > 0
                  ? 'ring-3 ring-[#00a884]'
                  : 'ring-1 ring-[#8696a0]'
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[#111b21] flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={getFullMediaUrl(user.avatar)}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-lg text-[#00a884]">
                    {user?.username?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {myStatuses.length === 0 && (
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#00a884] text-[#111b21] rounded-full flex items-center justify-center ring-2 ring-[#202c33]">
                <Plus className="w-3 h-3 stroke-[3]" />
              </span>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">My Status</h3>
            <p className="text-xs text-[#8696a0]">
              {myStatuses.length > 0
                ? `${myStatuses.length} updates • Tap to view`
                : 'Tap to add status update'}
            </p>
          </div>
        </div>

        {/* Create action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setStatusType('text');
              setCreateModalOpen(true);
            }}
            className="p-2.5 rounded-full bg-[#111b21] text-[#8696a0] hover:text-[#00a884] hover:bg-[#2a3942] transition"
            title="Text Status"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. RECENT UPDATES SECTION */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8696a0] mb-3">
          Recent Updates
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-[#8696a0]">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading updates...
          </div>
        ) : recentGroups.length === 0 ? (
          <div className="text-center py-12 bg-[#202c33]/40 rounded-2xl border border-[#2a3942]/40">
            <p className="text-sm font-medium text-white mb-1">No recent updates</p>
            <p className="text-xs text-[#8696a0]">
              When your contacts post a status, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentGroups.map((group) => {
              const u = group.user;
              const hasUnviewed = !group.allViewed;

              return (
                <div
                  key={u._id}
                  onClick={() => {
                    setViewingGroup(group);
                    setIsViewingMine(false);
                  }}
                  className="flex items-center gap-3.5 p-3.5 bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] rounded-2xl cursor-pointer transition shadow-sm"
                >
                  <div className="relative">
                    <div
                      className={`w-13 h-13 rounded-full p-0.5 ${
                        hasUnviewed
                          ? 'ring-3 ring-[#00a884] ring-offset-2 ring-offset-[#202c33]'
                          : 'ring-2 ring-[#8696a0]/50'
                      }`}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-[#111b21] flex items-center justify-center">
                        {u.avatar ? (
                          <img
                            src={getFullMediaUrl(u.avatar)}
                            alt={u.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-[#00a884]">
                            {u.username?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden flex-1">
                    <h4 className="text-sm font-bold text-white truncate">{u.username}</h4>
                    <p className="text-xs text-[#8696a0]">
                      {new Date(group.latestStatusTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. STATUS CREATION MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#222d34]">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatusType('text')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    statusType === 'text'
                      ? 'bg-[#00a884] text-[#111b21]'
                      : 'bg-[#202c33] text-[#8696a0]'
                  }`}
                >
                  <Type className="w-3.5 h-3.5 inline mr-1" /> Text Status
                </button>
                <button
                  type="button"
                  onClick={() => setStatusType('media')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    statusType === 'media'
                      ? 'bg-[#00a884] text-[#111b21]'
                      : 'bg-[#202c33] text-[#8696a0]'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 inline mr-1" /> Photo / Video
                </button>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-full text-[#8696a0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStatus} className="pt-4 space-y-4">
              {statusType === 'text' ? (
                <>
                  <div
                    className="w-full h-44 rounded-2xl p-4 flex items-center justify-center transition shadow-inner"
                    style={{ backgroundColor: selectedBg }}
                  >
                    <textarea
                      required
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Type a status update..."
                      maxLength={300}
                      className="w-full h-full bg-transparent text-white text-lg font-bold text-center resize-none placeholder-white/60 focus:outline-none"
                    />
                  </div>

                  {/* Color Palette Picker */}
                  <div>
                    <label className="block text-[11px] text-[#8696a0] mb-2 uppercase font-semibold">
                      Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      {COLOR_PALETTE.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedBg(color)}
                          className="w-7 h-7 rounded-full transition transform hover:scale-110 flex items-center justify-center"
                          style={{ backgroundColor: color }}
                        >
                          {selectedBg === color && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    {mediaPreview ? (
                      <div className="relative rounded-2xl overflow-hidden max-h-52 bg-black flex items-center justify-center">
                        <img
                          src={mediaPreview}
                          alt="preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setMediaFile(null);
                            setMediaPreview(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full h-40 border-2 border-dashed border-[#2a3942] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#00a884] transition bg-[#202c33]/50">
                        <Camera className="w-8 h-8 text-[#00a884]" />
                        <span className="text-xs text-[#8696a0]">
                          Click to upload photo or video
                        </span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleMediaSelect}
                          className="hidden"
                        />
                      </label>
                    )}

                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Add a caption..."
                      className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Share to Status'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. FULLSCREEN STORY VIEWER MODAL */}
      {viewingGroup && (
        <StatusViewerModal
          userGroup={viewingGroup}
          isMine={isViewingMine}
          onClose={() => setViewingGroup(null)}
          onDeleteStatus={handleDeleteStatus}
        />
      )}
    </div>
  );
};
