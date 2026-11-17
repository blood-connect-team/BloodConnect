import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Menu, X } from 'lucide-react';
import { Button } from '../common/Button';
import { Logo } from '../common/Logo';
import { useAuth } from '../../app/providers/auth-context';
import { signOut } from '../../services/auth';

const linkClass = 'text-gray-600 hover:text-brand-red px-3 py-2 text-sm font-medium transition-colors';
const pillClass = 'rounded-full border border-brand-red px-4 py-2 text-sm font-semibold text-brand-red transition-colors hover:bg-brand-red hover:text-white';

export function Navbar() {
  const { user, donor } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const links = (
    <>
      <Link to="/request" className={linkClass} onClick={() => setOpen(false)}>Emergency Request</Link>
      {user ? (
        <>
          {!donor && <Link to="/register" className={linkClass} onClick={() => setOpen(false)}>Become a Donor</Link>}
          <Link to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>Dashboard</Link>
          <button type="button" onClick={logout} className={pillClass}>Log out</button>
        </>
      ) : (
        <Link to="/login" className={pillClass} onClick={() => setOpen(false)}>Log in / Sign up</Link>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Logo variant="compact" />
          </Link>

          <div className="hidden md:flex items-center space-x-4">{links}</div>

          <div className="md:hidden">
            <Button variant="ghost" size="icon" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
        {open && <div className="md:hidden flex flex-col items-start gap-2 pb-4">{links}</div>}
      </div>
    </nav>
  );
}
