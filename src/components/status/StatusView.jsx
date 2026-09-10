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
    <div className="flex-1 overflow-y-auto bg-[#111b21] p-3.5 sm:p-6 2xl:p-8 3xl:p-10 pb-24 md:pb-6 touch-scroll h-full">
      <div className="w-full max-w-4xl 2xl:max-w-5xl 3xl:max-w-6xl 4xl:max-w-7xl mx-auto space-y-4 sm:space-y-6 2xl:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#222d34]">
          <div>
            <h2 className="text-xl 2xl:text-2xl 3xl:text-3xl font-bold text-white flex items-center gap-2">
              Status <Sparkles className="w-5 h-5 2xl:w-6 2xl:h-6 text-[#00a884]" />
            </h2>
            <p className="text-xs 2xl:text-sm text-[#8696a0]">Stories disappear after 24 hours</p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 2xl:px-5 2xl:py-2.5 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold rounded-xl shadow text-xs 2xl:text-sm flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4 2xl:w-5 2xl:h-5 stroke-[3]" /> Add Status
          </button>
        </div>

        {/* 1. MY STATUS ROW */}
        <div className="bg-[#202c33] rounded-2xl 2xl:rounded-3xl p-4 2xl:p-6 border border-[#2a3942] flex items-center justify-between shadow-md">
          <div
            onClick={() => {
              if (myStatuses.length > 0) {
                setViewingGroup({ user, statuses: myStatuses });
                setIsViewingMine(true);
              } else {
                setCreateModalOpen(true);
              }
            }}
            className="flex items-center gap-3.5 2xl:gap-5 cursor-pointer flex-1"
          >
            <div className="relative">
              <div
                className={`w-14 h-14 2xl:w-16 2xl:h-16 3xl:w-20 3xl:h-20 rounded-full p-0.5 ${
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
                    <span className="font-bold text-lg 2xl:text-xl 3xl:text-2xl text-[#00a884]">
                      {user?.username?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {myStatuses.length === 0 && (
                <span className="absolute bottom-0 right-0 w-4 h-4 2xl:w-5 2xl:h-5 bg-[#00a884] text-[#111b21] rounded-full flex items-center justify-center ring-2 ring-[#202c33]">
                  <Plus className="w-3 h-3 2xl:w-4 2xl:h-4 stroke-[3]" />
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm 2xl:text-base 3xl:text-lg font-bold text-white">My Status</h3>
              <p className="text-xs 2xl:text-sm text-[#8696a0]">
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
              className="p-2.5 2xl:p-3.5 rounded-full bg-[#111b21] text-[#8696a0] hover:text-[#00a884] hover:bg-[#2a3942] transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Text Status"
            >
              <Type className="w-4 h-4 2xl:w-5 2xl:h-5" />
            </button>
          </div>
        </div>

        {/* 2. RECENT UPDATES SECTION */}
        <div>
          <h3 className="text-xs 2xl:text-sm font-bold uppercase tracking-wider text-[#8696a0] mb-3 2xl:mb-4">
            Recent Updates
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#8696a0] 2xl:text-base">
              <Loader2 className="w-6 h-6 2xl:w-8 2xl:h-8 animate-spin mr-2" /> Loading updates...
            </div>
          ) : recentGroups.length === 0 ? (
            <div className="text-center py-12 2xl:py-16 bg-[#202c33]/40 rounded-2xl 2xl:rounded-3xl border border-[#2a3942]/40">
              <p className="text-sm 2xl:text-base font-medium text-white mb-1">No recent updates</p>
              <p className="text-xs 2xl:text-sm text-[#8696a0]">
                When your contacts post a status, it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 4xl:grid-cols-5 gap-3 2xl:gap-4">
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
                    className="flex items-center gap-3.5 2xl:gap-4 p-3.5 2xl:p-4 bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] rounded-2xl 2xl:rounded-3xl cursor-pointer transition shadow-sm"
                  >
                    <div className="relative">
                      <div
                        className={`w-13 h-13 2xl:w-16 2xl:h-16 rounded-full p-0.5 ${
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
                            <span className="font-bold 2xl:text-lg text-[#00a884]">
                              {u.username?.[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden flex-1">
                      <h4 className="text-sm 2xl:text-base font-bold text-white truncate">{u.username}</h4>
                      <p className="text-xs 2xl:text-sm text-[#8696a0]">
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
      </div>

      {/* 3. STATUS CREATION MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md 2xl:max-w-lg 3xl:max-w-xl bg-[#111b21] border border-[#222d34] rounded-2xl 2xl:rounded-3xl shadow-2xl p-4 sm:p-6 2xl:p-8 overflow-y-auto max-h-[92dvh] touch-scroll flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#222d34]">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatusType('text')}
                  className={`px-3 py-1.5 2xl:px-4 2xl:py-2 rounded-lg text-xs 2xl:text-sm font-bold transition ${
                    statusType === 'text'
                      ? 'bg-[#00a884] text-[#111b21]'
                      : 'bg-[#202c33] text-[#8696a0]'
                  }`}
                >
                  <Type className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 inline mr-1" /> Text Status
                </button>
                <button
                  type="button"
                  onClick={() => setStatusType('media')}
                  className={`px-3 py-1.5 2xl:px-4 2xl:py-2 rounded-lg text-xs 2xl:text-sm font-bold transition ${
                    statusType === 'media'
                      ? 'bg-[#00a884] text-[#111b21]'
                      : 'bg-[#202c33] text-[#8696a0]'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 inline mr-1" /> Photo / Video
                </button>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-full text-[#8696a0] hover:text-white"
              >
                <X className="w-5 h-5 2xl:w-6 2xl:h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateStatus} className="pt-4 space-y-4 2xl:space-y-6">
              {statusType === 'text' ? (
                <>
                  <div
                    className="w-full h-44 2xl:h-56 rounded-2xl p-4 flex items-center justify-center transition shadow-inner"
                    style={{ backgroundColor: selectedBg }}
                  >
                    <textarea
                      required
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Type a status update..."
                      maxLength={300}
                      className="w-full h-full bg-transparent text-white text-lg 2xl:text-2xl font-bold text-center resize-none placeholder-white/60 focus:outline-none"
                    />
                  </div>

                  {/* Color Palette Picker */}
                  <div>
                    <label className="block text-[11px] 2xl:text-xs text-[#8696a0] mb-2 uppercase font-semibold">
                      Background Color
                    </label>
                    <div className="flex items-center gap-2 2xl:gap-3">
                      {COLOR_PALETTE.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedBg(color)}
                          className="w-7 h-7 2xl:w-9 2xl:h-9 rounded-full transition transform hover:scale-110 flex items-center justify-center"
                          style={{ backgroundColor: color }}
                        >
                          {selectedBg === color && <Check className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3 2xl:space-y-4">
                    {mediaPreview ? (
                      <div className="relative rounded-2xl overflow-hidden max-h-52 2xl:max-h-72 bg-black flex items-center justify-center">
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
                          <X className="w-4 h-4 2xl:w-5 2xl:h-5" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full h-40 2xl:h-52 border-2 border-dashed border-[#2a3942] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#00a884] transition bg-[#202c33]/50">
                        <Camera className="w-8 h-8 2xl:w-10 2xl:h-10 text-[#00a884]" />
                        <span className="text-xs 2xl:text-sm text-[#8696a0]">
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
                      className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2.5 2xl:py-3.5 text-base sm:text-sm 2xl:text-base text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 2xl:py-4 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold rounded-xl 2xl:rounded-2xl shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm 2xl:text-base min-h-[48px]"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 2xl:w-5 2xl:h-5 animate-spin" />
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
