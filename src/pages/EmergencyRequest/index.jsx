import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, ChevronDown, MapPin, Zap, Building2, User, Clock, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { requestService } from '../../services/requestService';
import { findMatchingDonors } from '../../services/matchingService';
import { sendEmailAlert } from '../../services/emailService';
import { normalizeBloodGroup } from '../../utils/bloodGroupNormalizer';
import { BLOOD_GROUPS } from '../../constants/bloodGroups';
import { validate } from './validate';

const URGENCY_LEVELS = [
  { id: 'critical', label: 'Critical', sla: '15-20 Minutes', color: '#9B1C1C', bg: '#9B1C1C', textColor: '#fff' },
  { id: 'high',     label: 'High',     sla: '30-45 Minutes', color: '#374151', bg: '#F3F4F6', textColor: '#374151' },
  { id: 'medium',   label: 'Medium',   sla: '1-2 Hours',     color: '#374151', bg: '#F3F4F6', textColor: '#374151' },
];

const inp = (err) => ({
  width: '100%', height: '44px', padding: '0 14px',
  border: `1px solid ${err ? '#FCA5A5' : '#E5E7EB'}`,
  borderRadius: '8px', fontSize: '14px', color: '#111827',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color .2s',
});

function ErrMsg({ msg }) {
  return msg ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
      <AlertCircle size={12} color="#DC2626" />
      <span style={{ fontSize: '12px', color: '#DC2626' }}>{msg}</span>
    </div>
  ) : null;
}

export default function EmergencyRequest({ initialValues = {}, initialErrors = {} } = {}) {
  const navigate = useNavigate();
  const [f, setF] = useState({
    hospital: '', patient: '', blood: '', urgency: 'critical', area: '', notes: '',
    ...initialValues,
  });
  const [errors, setErrors] = useState(initialErrors);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [matchingDonors, setMatchingDonors] = useState([]);

  const set = (k, v) => {
    setF(p => ({ ...p, [k]: v }));
    if (touched[k]) {
      const e = validate({ ...f, [k]: v });
      setErrors(p => ({ ...p, [k]: e[k] }));
    }
  };

  const blur = (k) => {
    setTouched(p => ({ ...p, [k]: true }));
    setErrors(p => ({ ...p, [k]: validate(f)[k] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(f).map(k => [k, true])));
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) {
      if (errs.area) {
        // focus the area input so hospital users notice the required field
        document.getElementById('er-area')?.focus();
      }
      return;
    }
    
    setSubmitting(true);
    try {
      // Normalize blood group for consistency across the system
      const normalizedBloodGroup = normalizeBloodGroup(f.blood);
      
      // Create the blood request (store both `area` and `hospitalArea` for compatibility)
      await requestService.createRequest({
        hospitalName: f.hospital,
        bloodGroup: normalizedBloodGroup,
        urgency: f.urgency,
        area: f.area,
        hospitalArea: f.area,
        patientName: f.patient,
        status: 'active'
      });
      
      toast.success('Emergency request created successfully!');
      
      // Find matching donors
      const matchingDonors = await findMatchingDonors({
        bloodGroup: normalizedBloodGroup,
        area: f.area,
        hospitalArea: f.area,
      });
      
      setMatchingDonors(matchingDonors);
      
      // Send email alerts to matching donors (if configured)
      if (matchingDonors && matchingDonors.length > 0) {
        matchingDonors.forEach(donor => {
          sendEmailAlert(donor, {
            bloodGroup: normalizedBloodGroup,
            hospitalName: f.hospital,
            urgency: f.urgency
          })
          .then(() => {
            console.log(`Email sent to ${donor.email}`);
          })
          .catch(err => {
            console.warn(`Email send failed for ${donor.email}:`, err?.message);
            // Emails are optional - matching and notifications continue even if email fails
          });
        });
        toast.success(`Found ${matchingDonors.length} matching donor(s)!`);
      } else {
        toast('No matching donors found in this area.');
      }
      
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 4000);
    } catch (error) {
      toast.error('Request failed: ' + (error.message || 'Unknown error'));
      console.error('Emergency request error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUrgency = URGENCY_LEVELS.find(u => u.id === f.urgency);

  return (
    <div style={{ minHeight: '100vh', background: '#FFF5F5', fontFamily: "'Inter', sans-serif" }}>

      {/* ── System Status Bar ── */}
      <div style={{
        background: '#9B1C1C', padding: '10px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '13px', fontWeight: 700 }}>
          <span style={{ fontSize: '16px' }}>✱</span>
          SYSTEM STATUS: CRITICAL RED ALERT
        </div>
        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: 500 }}>
          Live Inventory: O-Negative is Low (2 Units Remaining)
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '36px 20px 60px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '28px', alignItems: 'start' }}>

        {/* ── Form Card ── */}
        <div style={{
          background: '#fff', borderRadius: '16px',
          borderLeft: '5px solid #DC2626',
          boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
          padding: '32px 32px 28px',
          animation: 'slideUp .4s ease',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Plus size={22} color="#DC2626" strokeWidth={2.5} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>New Urgent Request</h1>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Immediate deployment of blood products for emergency surgery or trauma.</p>
            </div>
          </div>

          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Hospital + Patient */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label htmlFor="er-hospital" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Hospital Name</label>
                <input id="er-hospital" type="text" placeholder="Central Regional Medical Center"
                  value={f.hospital} onChange={e => set('hospital', e.target.value)} onBlur={() => blur('hospital')}
                  style={inp(errors.hospital)}
                  onFocus={e => e.target.style.borderColor = '#FCA5A5'}
                  onBlurCapture={e => e.target.style.borderColor = errors.hospital ? '#FCA5A5' : '#E5E7EB'}
                />
                <ErrMsg msg={errors.hospital} />
              </div>
              <div>
                <label htmlFor="er-patient" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Patient Identifier (Name/ID)</label>
                <input id="er-patient" type="text" placeholder="e.g. John Doe #9822"
                  value={f.patient} onChange={e => set('patient', e.target.value)} onBlur={() => blur('patient')}
                  style={inp(errors.patient)}
                  onFocus={e => e.target.style.borderColor = '#FCA5A5'}
                  onBlurCapture={e => e.target.style.borderColor = errors.patient ? '#FCA5A5' : '#E5E7EB'}
                />
                <ErrMsg msg={errors.patient} />
              </div>
            </div>

            {/* Blood Group + Urgency */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <div>
                <label htmlFor="er-blood" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Blood Group Needed</label>
                <div style={{ position: 'relative' }}>
                  <ChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <select
                    id="er-blood"
                    name="blood"
                    value={f.blood}
                    onChange={e => set('blood', e.target.value)}
                    onBlur={() => blur('blood')}
                    style={{
                      ...inp(errors.blood),
                      paddingRight: '32px',
                      appearance: 'none',
                      cursor: 'pointer',
                      color: f.blood ? '#111827' : '#9CA3AF',
                    }}
                    onFocus={e => e.target.style.borderColor = '#FCA5A5'}
                    onBlurCapture={e => e.target.style.borderColor = errors.blood ? '#FCA5A5' : '#E5E7EB'}
                  >
                    <option value="" disabled>Select blood group</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g} style={{ color: '#111827' }}>{g}</option>)}
                  </select>
                </div>
                <ErrMsg msg={errors.blood} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Urgency Level</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {URGENCY_LEVELS.map(u => (
                    <button key={u.id} type="button"
                      onClick={() => set('urgency', u.id)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none',
                        background: f.urgency === u.id ? '#9B1C1C' : '#F3F4F6',
                        color: f.urgency === u.id ? '#fff' : '#374151',
                        fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        transition: 'all .2s',
                      }}>
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Delivery Area */}
            <div>
              <label htmlFor="er-area" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Delivery Area <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={14} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input id="er-area" name="area" aria-required="true" required type="text" placeholder="e.g. Gulshan Karachi"
                  value={f.area} onChange={e => set('area', e.target.value)} onBlur={() => blur('area')}
                  style={{ ...inp(errors.area), paddingLeft: '34px' }}
                  onFocus={e => e.target.style.borderColor = '#FCA5A5'}
                  onBlurCapture={e => e.target.style.borderColor = errors.area ? '#FCA5A5' : '#E5E7EB'}
                />
              </div>
              <ErrMsg msg={errors.area} />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="er-notes" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Additional Clinical Notes</label>
              <textarea id="er-notes" rows={4} placeholder="Specify units needed, clinical urgency context, or special instructions..."
                value={f.notes} onChange={e => set('notes', e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px',
                  border: '1px solid #E5E7EB', borderRadius: '8px',
                  fontSize: '14px', color: '#111827', background: '#fff',
                  outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  fontFamily: 'inherit', lineHeight: 1.6,
                  transition: 'border-color .2s',
                }}
                onFocus={e => e.target.style.borderColor = '#FCA5A5'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            {/* Submit */}
            <button id="er-submit" type="submit" disabled={submitting}
              style={{
                width: '100%', padding: '16px',
                background: submitting ? '#F87171' : '#9B1C1C',
                color: '#fff', fontWeight: 700, fontSize: '16px',
                border: 'none', borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 4px 16px rgba(155,28,28,0.35)', transition: 'all .2s',
              }}
              onMouseEnter={e => { if (!submitting) { e.currentTarget.style.background = '#7F1D1D'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = submitting ? '#F87171' : '#9B1C1C'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {submitting ? (
                <><div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Broadcasting…</>
              ) : (
                <><Zap size={18} fill="#fff" /> Submit Urgent Request</>
              )}
            </button>
          </form>
        </div>

        {/* ── Right Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Live Preview Card */}
          <div style={{
            background: '#fff', borderRadius: '14px',
            border: '1.5px solid #F3F4F6', overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '1px' }}>LIVE PREVIEW</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#DC2626' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#DC2626', display: 'inline-block', animation: 'ping 1.5s ease-in-out infinite' }} />
                CRITICAL
              </span>
            </div>

            {/* Blood type hero */}
            <div style={{ background: '#FEE2E2', padding: '20px 16px', textAlign: 'center', margin: '12px', borderRadius: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', letterSpacing: '1.5px', marginBottom: '4px' }}>PRODUCT TYPE</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#9B1C1C', letterSpacing: '-0.5px' }}>
                {f.blood || '—'}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>2 Units Required</div>
            </div>

            {/* Details */}
            <div style={{ padding: '4px 16px 16px' }}>
              {[
                { icon: <Building2 size={14} color="#9CA3AF" />, label: 'Facility', value: f.hospital || '—' },
                { icon: <User size={14} color="#9CA3AF" />, label: 'Patient', value: f.patient || '—' },
                { icon: <Clock size={14} color="#9CA3AF" />, label: 'SLA Target', value: selectedUrgency?.sla, red: true },
              ].map(({ icon, label, value, red }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F9FAFB', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '13px', flexShrink: 0 }}>
                    {icon} {label}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: red ? '#DC2626' : '#111827', textAlign: 'right', maxWidth: '160px' }}>{value}</div>
                </div>
              ))}

              {/* Info box */}
              <div style={{ background: '#FEF2F2', borderRadius: '8px', padding: '12px 14px', marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Info size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '12px', color: '#DC2626', lineHeight: 1.6, margin: 0 }}>
                  Finalizing this request will notify the nearest dispatch center and lock inventory.
                </p>
              </div>
            </div>
          </div>

          {/* Every Second Counts card */}
          <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1.5px solid #F3F4F6' }}>
            {/* Hospital corridor illustration */}
            <div style={{
              height: '140px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Fake corridor perspective using CSS */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #1e293b, #374151)' }} />
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  position: 'absolute',
                  top: `${10 + i * 20}%`, left: `${15 + i * 8}%`, right: `${15 + i * 8}%`,
                  height: '1px', background: `rgba(255,255,255,${0.04 + i * 0.02})`,
                }} />
              ))}
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${20 + i * 15}%`, width: '1px',
                  background: `rgba(255,255,255,${0.03 + (i === 2 ? 0.07 : 0)})`,
                }} />
              ))}
              {/* Person silhouette */}
              <div style={{ position: 'relative', zIndex: 1, opacity: 0.6 }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#9CA3AF', margin: '0 auto 2px' }} />
                <div style={{ width: '16px', height: '20px', background: '#9CA3AF', borderRadius: '4px 4px 0 0' }} />
              </div>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginBottom: '6px' }}>Every Second Counts</div>
              <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.6 }}>
                Our intelligent routing system connects your request to the closest blood bank with available units within milliseconds.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Success Modal ── */}
      {success && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)',
          animation: 'fadeIn .2s ease',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '40px 32px',
            maxWidth: '500px', width: '100%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)', animation: 'slideUp .3s ease',
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#9B1C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 8px 24px rgba(155,28,28,0.4)' }}>
              <CheckCircle size={36} color="#fff" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 8px', textAlign: 'center' }}>Request Broadcast!</h2>
            <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px', textAlign: 'center' }}>
              Emergency request for <strong style={{ color: '#DC2626' }}>{f.blood}</strong> has been broadcast to matching donors.
            </p>

            {/* Matching Donors List */}
            {matchingDonors && matchingDonors.length > 0 ? (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px', letterSpacing: '0.5px' }}>
                  ALERTS SENT TO {matchingDonors.length} DONOR(S)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {matchingDonors.map((donor, idx) => (
                    <div key={idx} style={{
                      background: '#FEF2F2', borderRadius: '10px', padding: '14px',
                      border: '1.5px solid #FCA5A5', display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: '#DC2626', color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px',
                        flexShrink: 0
                      }}>
                        {donor.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '2px' }}>
                          {donor.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280', display: 'flex', gap: '8px' }}>
                          <span>🩸 {donor.bloodGroup}</span>
                          <span>📍 {donor.area}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                background: '#FEF2F2', borderRadius: '10px', padding: '16px',
                marginBottom: '24px', textAlign: 'center', border: '1.5px solid #FCA5A5'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#DC2626', marginBottom: '4px' }}>⚠️ No Matching Donors</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  No donors available in this area matching blood type {f.blood}.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => navigate('/dashboard')} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#9B1C1C', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}>
                View Dashboard →
              </button>
              <button onClick={() => { setSuccess(false); setMatchingDonors([]); }} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#F9FAFB', color: '#374151', fontWeight: 600, fontSize: '14px', border: '1.5px solid #E5E7EB', cursor: 'pointer' }}>
                Submit Another
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes ping { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(2)} }
      `}</style>
    </div>
  );
}
