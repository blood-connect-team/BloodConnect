import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { requestService } from '../../services/requestService';
import { sendEmailAlert } from '../../services/emailService';
import { notificationService } from '../../services/notificationService';
import { normalizeBloodGroup } from '../../utils/bloodGroupNormalizer';
import log from '../../utils/logger';

export default function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [matchingRequests, setMatchingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDonor, setCurrentDonor] = useState(null);

  useEffect(() => {
    const fetchMatchingRequests = async () => {
      try {
        // Get current donor from localStorage
        const donorData = localStorage.getItem('currentDonor');
        if (!donorData) {
          toast.error('Donor profile not found. Please register first.');
          setLoading(false);
          return;
        }

        const donor = JSON.parse(donorData);
        setCurrentDonor(donor);

        // Fetch all active requests
        const allRequests = await requestService.getActiveRequests();

        // Filter for matching blood type and matching area (support both `area` and `hospitalArea`)
        // Normalize blood groups to handle both formats (e.g., "O+" and "O Positive")
        const donorNormalizedBlood = normalizeBloodGroup(donor.bloodGroup);
        const matching = allRequests.documents.filter(req => {
          const reqArea = req.area || req.hospitalArea || '';
          const reqNormalizedBlood = normalizeBloodGroup(req.bloodGroup);
          return reqNormalizedBlood === donorNormalizedBlood && reqArea === donor.area;
        });

        setMatchingRequests(matching);
      } catch (error) {
        console.error('Error fetching matching requests:', error);
        toast.error(error?.message || 'Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchingRequests();
  }, []);

  const handleSendAlert = async (request) => {
    if (!currentDonor) return;

    try {
      // Try to send email alert, but don't block WhatsApp if it fails
      try {
        await sendEmailAlert(currentDonor, request);
        console.log('Email alert sent successfully');
      } catch (emailError) {
        console.warn('Email alert failed (WhatsApp will still work):', emailError?.message);
        // Continue with WhatsApp even if email fails
      }
      
      // Generate WhatsApp link
      const waLink = notificationService.generateWhatsAppLink(currentDonor, request);
      
      if (!waLink) {
        toast.error('WhatsApp: Invalid phone number format');
        console.warn('WhatsApp link generation failed. Phone:', currentDonor.phone);
        return;
      }
        
      toast.success('Opening WhatsApp...');
      log('Opening WhatsApp link:', waLink)
      
      // Open WhatsApp link in new tab
window.open(waLink, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error sending alert:', error);
      toast.error('Failed to send alert: ' + (error.message || 'Unknown error'));
    }
  };

  const getUrgencyBadgeColor = (urgency) => {
    const colors = {
      critical: { bg: '#FEE2E2', color: '#DC2626' },
      high: { bg: '#FEF3C7', color: '#D97706' },
      medium: { bg: '#E0F2FE', color: '#0284C7' }
    };
    return colors[urgency] || colors.medium;
  };

  const handleLogout = () => {
    localStorage.removeItem('currentDonor');
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#FFF5F5', minHeight: '100vh', display: 'flex' }}>

      {/* Sidebar - Brand and action only */}
      {/* <aside style={{ width: 210, background: '#fff', borderRight: '1px solid #FCE7E7', padding: '28px 0', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '100vh' }}>
        <div>
          <div style={{ padding: '0 20px 24px' }}>
            <div style={{ color: '#DC2626', fontWeight: 900, fontSize: 20, letterSpacing: '-0.5px' }}>BloodConnect</div>
            <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>Donor Portal</div>
          </div>
          <div style={{ padding: '0 20px' }}>
            <button style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              🚨 Create Emergency Request
            </button>
          </div>
        </div>
      </aside> */}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #FCE7E7', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#DC2626' }}>Available Requests</span>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0 0' }}>
              {currentDonor && `Showing requests matching your blood type: ${currentDonor.bloodGroup}`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', borderRadius: 8, padding: '8px 16px', width: 320 }}>
            <span style={{ color: '#9CA3AF' }}>🔍</span>
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search hospitals..." 
              style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: '#374151', width: '100%' }} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ fontSize: 18, cursor: 'pointer' }}>🔔</span>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                border: '1px solid #FCA5A5',
                background: '#FEF2F2',
                color: '#DC2626',
                borderRadius: 999,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#9CA3AF', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {currentDonor && currentDonor.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '24px 28px', overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 20, color: '#9CA3AF', marginBottom: 10 }}>Loading requests...</div>
              <div style={{ width: 40, height: 40, border: '3px solid #FEE2E2', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            </div>
          ) : matchingRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 12, border: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 48, marginBottom: 10, display: 'block' }}>✨</span>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>No Matching Requests</div>
              <div style={{ fontSize: 14, color: '#6B7280' }}>
                There are no active blood requests matching your blood type right now. 
                <br /> Check back later or enable notifications to get alerts.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 20 }}>
              {matchingRequests
                .filter(r => {
                  const areaSafe = (r.area || r.hospitalArea || '').toLowerCase();
                  return !search || r.hospitalName.toLowerCase().includes(search.toLowerCase()) || areaSafe.includes(search.toLowerCase());
                })
                .map(request => {
                  const badgeColor = getUrgencyBadgeColor(request.urgency);
                  return (
                    <div key={request.$id} style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #F3F4F6', borderTop: '4px solid #DC2626', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      {/* Blood Type & Urgency */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 32, fontWeight: 900, color: '#DC2626' }}>{request.bloodGroup}</span>
                        <span style={{ background: badgeColor.bg, color: badgeColor.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {request.urgency}
                        </span>
                      </div>

                      {/* Hospital Info */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>
                          {request.hospitalName}
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>📍</span> {request.area || request.hospitalArea}
                        </div>
                      </div>

                      {/* Patient Info */}
                      <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>PATIENT</div>
                        <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{request.patientName}</div>
                      </div>

                      {/* Action Button */}
                      <button 
                        onClick={() => handleSendAlert(request)}
                        style={{ 
                          width: '100%',
                          background: '#DC2626', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: 8, 
                          padding: '12px', 
                          fontSize: 13, 
                          fontWeight: 600, 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#B91C1C'}
                        onMouseLeave={e => e.currentTarget.style.background = '#DC2626'}
                      >
                        💬 Send Alert
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
