import { Link } from 'react-router-dom';
import {
  Users, Heart, Bell, Smartphone,
  LayoutDashboard, MapPin,
  ChevronRight
} from 'lucide-react';
import LogoImage from '../../assets/BloodConnectLogo.png';

const steps = [
  { n: '1', title: 'Post Request', desc: 'Submit the blood group, hospital, area and urgency for a request in Karachi.' },
  { n: '2', title: 'Find Potential Donors', desc: 'Search registered donors marked available in the same area with the exact blood group.' },
  { n: '3', title: 'Contact Donors', desc: 'Use the dashboard to contact potential donors through WhatsApp. Email alerts depend on configuration.' },
  { n: '4', title: 'Confirm With the Hospital', desc: 'The treating team must confirm compatibility and donation eligibility before any donation.' },
];

const features = [
  { icon: Users, title: 'Donor registration', desc: 'Register your blood group, area and contact details as a potential donor.' },
  { icon: Smartphone, title: 'WhatsApp contact', desc: 'Open a WhatsApp conversation with a potential donor from the dashboard.' },
  { icon: Heart, title: 'Exact blood-group filtering', desc: 'Find potential matches by blood group. Matching does not guarantee medical suitability.' },
  { icon: LayoutDashboard, title: 'Request dashboard', desc: 'View blood requests and search for potential donors.' },
  { icon: MapPin, title: 'Area-based search', desc: 'Filter donors by the requested area in Karachi; travel times are not calculated.' },
  { icon: Bell, title: 'Optional email alerts', desc: 'Email alerts can be sent to potential donors when the email service is configured.' },
];

const footerLinks = ['Home', 'Donor Form', 'Urgent Request'];

export default function Landing() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#fff', color: '#111827' }}>

      {/* ── Hero Section ── */}
      <section style={{
        maxWidth: '760px', margin: '0 auto',
        padding: '72px 24px 60px',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)',
        gap: '48px', alignItems: 'center',
      }}>
        {/* Left */}
        <div>
          <h1 style={{ fontSize: '46px', fontWeight: 800, lineHeight: 1.15, margin: '0 0 18px', color: '#111827' }}>
            Blood Donation<br />Connections in{' '}
            <span style={{ color: '#DC2626' }}>Karachi</span>
          </h1>
          <p style={{ fontSize: '16px', color: '#6B7280', lineHeight: 1.7, marginBottom: '32px', maxWidth: '420px' }}>
            Our first release supports Karachi only. Post a blood request or register as a potential donor. Donor availability, responses and arrival times are not guaranteed.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#DC2626', color: '#fff', fontWeight: 700,
              fontSize: '14px', padding: '12px 22px', borderRadius: '8px',
              textDecoration: 'none', boxShadow: '0 4px 14px rgba(220,38,38,0.35)',
              transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#B91C1C'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Register as Donor
            </Link>
            <Link to="/request" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#fff', color: '#DC2626', fontWeight: 700,
              fontSize: '14px', padding: '12px 22px', borderRadius: '8px',
              textDecoration: 'none', border: '1.5px solid #DC2626',
              transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            >
              Request Blood
            </Link>
          </div>
        </div>

      </section>

      {/* ── How It Works ── */}
      <section style={{ padding: '72px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>How It Works</h2>
            <p style={{ color: '#9CA3AF', fontSize: '15px' }}>Find potential donors and coordinate with the hospital.</p>
          </div>
          {/* Steps */}
          <div className="landing-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '24px', position: 'relative' }}>
            {/* Connector line */}
            <div className="landing-connector" style={{ position: 'absolute', top: '28px', left: '12.5%', right: '12.5%', height: '2px', background: 'linear-gradient(90deg, #DC2626, #FCA5A5)', zIndex: 0 }} />
            {steps.map(({ n, title, desc }) => (
              <div key={n} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: '#DC2626', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', fontSize: '20px', fontWeight: 800,
                  boxShadow: '0 4px 16px rgba(220,38,38,0.3)',
                }}>
                  {n}
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginBottom: '8px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Features ── */}
      <section style={{ padding: '72px 24px', background: '#FFF5F5' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Platform Features</h2>
            <p style={{ color: '#9CA3AF', fontSize: '15px' }}>Tools for blood requests and potential donor searches in Karachi.</p>
          </div>
          <div className="landing-features" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px' }}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                background: '#fff', borderRadius: '14px', padding: '22px',
                border: '1.5px solid #F3F4F6',
                boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
                transition: 'transform .2s, box-shadow .2s',
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(220,38,38,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 8px rgba(0,0,0,0.05)'; }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <Icon size={18} color="#DC2626" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '6px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: '48px 24px', background: '#fff' }}>
        <div className="landing-cta" style={{
          maxWidth: '960px', margin: '0 auto',
          background: 'linear-gradient(135deg, #DC2626 0%, #9B1C1C 100%)',
          borderRadius: '20px', padding: '48px 52px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px',
          boxShadow: '0 12px 40px rgba(220,38,38,0.3)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* BG circles */}
          <div style={{ position: 'absolute', right: '-60px', top: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', left: '-40px', bottom: '-60px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#fff', margin: '0 0 10px', lineHeight: 1.25 }}>
              Help connect Karachi<br />with potential donors.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Register as a potential donor or post a blood request in Karachi.
            </p>
          </div>
          <Link to="/register" style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: '#fff', color: '#DC2626', fontWeight: 700, fontSize: '14px',
            padding: '13px 24px', borderRadius: '10px', textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            transition: 'all .2s', position: 'relative', zIndex: 1,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Get Started Today <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#0f172a', padding: '52px 24px 32px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="landing-footer" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '40px', marginBottom: '40px' }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <img src={LogoImage} alt="Blood Connect" style={{ height: '34px', width: 'auto' }} />
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '17px' }}>Blood Connect</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: 1.7, marginBottom: '16px' }}>
                Connecting blood requests with potential donors in Karachi. Medical suitability must be confirmed by the treating team.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', marginBottom: '16px' }}>QUICK LINKS</div>
              {footerLinks.map(l => {
                const path = l === 'Home' ? '/' : l === 'Donor Form' ? '/register' : l === 'Urgent Request' ? '/request' : '#';
                return (
                  <div key={l} style={{ marginBottom: '10px' }}>
                    <Link to={path} style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', textDecoration: 'none', transition: 'color .2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                    >{l}</Link>
                  </div>
                );
              })}
            </div>

            <div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', marginBottom: '16px' }}>COVERAGE</div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: 1.5 }}>Karachi only. For urgent medical care, contact your hospital directly.</p>
            </div>

          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
              {/* Copyright removed */}
            </span>
            <div style={{ display: 'flex', gap: '20px' }}>
              {['Privacy Policy', 'Terms of Service'].map(t => (
                <a key={t} href="#" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textDecoration: 'none' }}>{t}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @media (max-width: 700px) {
          .landing-steps, .landing-features, .landing-footer { grid-template-columns: minmax(0, 1fr) !important; }
          .landing-connector { display: none; }
          .landing-cta { flex-direction: column; align-items: flex-start !important; padding: 32px 24px !important; }
        }
      `}</style>
    </div>
  );
}