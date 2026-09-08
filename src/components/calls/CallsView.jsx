import React, { useState, useEffect } from 'react';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Loader2, Plus } from 'lucide-react';
import api, { getFullMediaUrl } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';

export const CallsView = () => {
  const { user } = useAuth();
  const { startCall } = useCall();

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/calls/history');
      if (res.data?.success) {
        setCalls(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching calls:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#111b21] p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222d34]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Calls <Phone className="w-5 h-5 text-[#00a884]" />
          </h2>
          <p className="text-xs text-[#8696a0]">Recent voice and video calls</p>
        </div>
      </div>

      {/* Calls List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#8696a0]">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading call logs...
        </div>
      ) : calls.length === 0 ? (
        <div className="text-center py-16 bg-[#202c33]/40 rounded-2xl border border-[#2a3942]/40">
          <div className="w-16 h-16 rounded-full bg-[#111b21] border border-[#2a3942] flex items-center justify-center text-[#00a884] mx-auto mb-3">
            <Phone className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No recent calls</h3>
          <p className="text-xs text-[#8696a0] max-w-xs mx-auto">
            Stay in touch with your friends. Start a voice or video call from any conversation.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => {
            const isCaller = call.caller?._id === user?._id;
            const contact = isCaller ? call.receiver : call.caller;
            const isMissed = call.status === 'missed';

            return (
              <div
                key={call._id}
                className="flex items-center justify-between p-3.5 bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] rounded-2xl transition shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-[#111b21] border border-[#2a3942] flex items-center justify-center">
                    {contact?.avatar ? (
                      <img
                        src={getFullMediaUrl(contact.avatar)}
                        alt={contact.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-[#00a884]">
                        {contact?.username?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4
                      className={`text-sm font-bold leading-tight ${
                        isMissed && !isCaller ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      {contact?.username || 'Unknown Contact'}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs text-[#8696a0] mt-0.5">
                      {isMissed ? (
                        <PhoneMissed className="w-3.5 h-3.5 text-red-400" />
                      ) : isCaller ? (
                        <PhoneOutgoing className="w-3.5 h-3.5 text-[#00a884]" />
                      ) : (
                        <PhoneIncoming className="w-3.5 h-3.5 text-[#00a884]" />
                      )}

                      <span>
                        {new Date(call.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        •{' '}
                        {new Date(call.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {call.duration > 0 && (
                        <span className="opacity-75">
                          ({formatDuration(call.duration)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Call back button */}
                {contact && (
                  <button
                    onClick={() => startCall(contact, call.callType || 'voice')}
                    className="p-2.5 rounded-full bg-[#111b21] text-[#00a884] hover:bg-[#00a884] hover:text-[#111b21] transition shadow cursor-pointer"
                    title={`Call ${contact.username}`}
                  >
                    {call.callType === 'video' ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <Phone className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
