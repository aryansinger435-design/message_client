import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Send } from 'lucide-react';
import api, { getFullMediaUrl } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

export const StatusViewerModal = ({ userGroup, onClose, isMine = false, onDeleteStatus }) => {
  const { user: currentUser } = useAuth();
  const statuses = userGroup?.statuses || [];
  const author = userGroup?.user || currentUser;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);

  const timerRef = useRef(null);
  const activeStatus = statuses[currentIndex];

  // Mark status as viewed
  useEffect(() => {
    if (activeStatus && !isMine) {
      api.post(`/status/${activeStatus._id}/view`).catch(() => {});
    }
  }, [activeStatus?._id, isMine]);

  // Story auto-advance timer
  useEffect(() => {
    if (!activeStatus || isPaused) return;

    setProgress(0);
    const duration = 5000; // 5 seconds per story
    const interval = 50; // update every 50ms
    const step = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused, activeStatus]);

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  if (!activeStatus) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-0 select-none backdrop-blur-md"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="relative w-full max-w-lg 2xl:max-w-xl 3xl:max-w-2xl 4xl:max-w-3xl h-full sm:h-[90vh] 3xl:h-[82vh] 4xl:h-[78vh] sm:rounded-3xl overflow-hidden flex flex-col bg-[#0b141a] shadow-2xl border border-[#222d34]">
        {/* Top Progress Bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5 2xl:gap-2">
          {statuses.map((s, idx) => (
            <div
              key={s._id || idx}
              className="flex-1 h-1 2xl:h-1.5 bg-white/25 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Author Bar */}
        <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between text-white drop-shadow-md">
          <div className="flex items-center gap-3 2xl:gap-4">
            <div className="w-10 h-10 2xl:w-13 2xl:h-13 rounded-full bg-[#202c33] border border-white/20 overflow-hidden flex items-center justify-center">
              {author?.avatar ? (
                <img
                  src={getFullMediaUrl(author.avatar)}
                  alt={author.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-[#00a884] 2xl:text-lg">
                  {author?.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm 2xl:text-base font-bold leading-tight">{author?.username}</p>
              <p className="text-[11px] 2xl:text-xs opacity-75">
                {new Date(activeStatus.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMine && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteStatus(activeStatus._id);
                  onClose();
                }}
                className="p-2 2xl:p-3 text-white/80 hover:text-red-400 rounded-full transition"
                title="Delete Status"
              >
                <Trash2 className="w-5 h-5 2xl:w-6 2xl:h-6" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 2xl:p-3 text-white/80 hover:text-white rounded-full transition"
            >
              <X className="w-6 h-6 2xl:w-7 2xl:h-7" />
            </button>
          </div>
        </div>

        {/* Center Content Slide */}
        <div className="flex-1 relative flex items-center justify-center w-full h-full overflow-hidden">
          {activeStatus.type === 'text' ? (
            <div
              className="w-full h-full flex items-center justify-center p-8 2xl:p-12 text-center"
              style={{ backgroundColor: activeStatus.backgroundColor || '#075E54' }}
            >
              <p className="text-2xl sm:text-3xl 2xl:text-4xl 3xl:text-5xl font-bold text-white leading-relaxed max-w-md 2xl:max-w-xl break-words font-sans">
                {activeStatus.content}
              </p>
            </div>
          ) : activeStatus.type === 'image' ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black">
              <img
                src={getFullMediaUrl(activeStatus.content)}
                alt="status"
                className="w-full h-full object-contain"
              />
              {activeStatus.caption && (
                <div className="absolute bottom-16 left-4 right-4 bg-black/60 backdrop-blur-sm p-3 2xl:p-4 rounded-xl 2xl:rounded-2xl text-center text-sm 2xl:text-base text-white font-medium">
                  {activeStatus.caption}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black">
              <video
                src={getFullMediaUrl(activeStatus.content)}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              {activeStatus.caption && (
                <div className="absolute bottom-16 left-4 right-4 bg-black/60 backdrop-blur-sm p-3 2xl:p-4 rounded-xl 2xl:rounded-2xl text-center text-sm 2xl:text-base text-white font-medium">
                  {activeStatus.caption}
                </div>
              )}
            </div>
          )}

          {/* Left & Right Tap Zones */}
          <div
            className="absolute left-0 top-16 bottom-16 w-1/3 z-20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            className="absolute right-0 top-16 bottom-16 w-1/3 z-20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>

        {/* Bottom Footer (Viewers for My Status, or Navigation) */}
        {isMine ? (
          <div className="h-16 bg-[#111b21] border-t border-[#222d34] px-4 flex items-center justify-between z-30">
            <button
              onClick={() => setShowViewers(!showViewers)}
              className="flex items-center gap-2 text-xs text-[#00a884] font-semibold hover:underline"
            >
              <Eye className="w-4 h-4" />
              {activeStatus.viewers?.length || 0} views
            </button>
            <span className="text-xs text-[#8696a0]">Swipe or tap to advance</span>
          </div>
        ) : (
          <div className="h-16 bg-[#111b21] border-t border-[#222d34] px-4 flex items-center justify-center z-30 text-xs text-[#8696a0]">
            Tap left or right to switch status
          </div>
        )}

        {/* Viewers Drawer */}
        {showViewers && (
          <div className="absolute inset-x-0 bottom-0 max-h-60 bg-[#111b21] border-t border-[#222d34] rounded-t-2xl p-4 z-40 overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Viewed by ({activeStatus.viewers?.length || 0})
              </h4>
              <button
                onClick={() => setShowViewers(false)}
                className="text-xs text-[#8696a0] hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              {activeStatus.viewers?.length === 0 ? (
                <p className="text-xs text-[#8696a0] text-center py-4">No views yet.</p>
              ) : (
                activeStatus.viewers?.map((v, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">{v.user?.username || 'User'}</span>
                    <span className="text-[10px] text-[#8696a0]">
                      {new Date(v.viewedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
