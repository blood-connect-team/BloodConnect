import LogoImage from '../../assets/BloodConnectLogo.png';

export function Logo({ variant = 'full' }) {
  if (variant === 'image-only') {
    return <img src={LogoImage} alt="BloodConnect" style={{ height: '56px', width: 'auto' }} />;
  }

  if (variant === 'compact') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={LogoImage} alt="BloodConnect" style={{ height: '48px', width: 'auto' }} />
        <span style={{ fontWeight: 700, fontSize: '18px', color: '#111827' }}>Blood Connect</span>
      </div>
    );
  }

  // full variant (default)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <img src={LogoImage} alt="BloodConnect" style={{ height: '64px', width: 'auto' }} />
      <div>
        <div style={{ fontWeight: 800, fontSize: '28px', color: '#111827' }}>Blood Connect</div>
        <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>Emergency Blood Network</div>
      </div>
    </div>
  );
}
