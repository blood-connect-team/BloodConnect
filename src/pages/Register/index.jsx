import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Shield, 
  Heart, 
  Droplet,
  ChevronDown, 
  AlertCircle
} from 'lucide-react';
import { donorService } from '../../services/donorService';
import { normalizeBloodGroup } from '../../utils/bloodGroupNormalizer';
import { Logo } from '../../components/common/Logo';
import { BLOOD_GROUPS } from '../../constants/bloodGroups';

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Full name is required.';
  if (!f.blood) e.blood = 'Blood group is required.';
  if (!f.phone.trim()) e.phone = 'Phone number is required.';
  else if (!/^\+?[\d\s\-(). ]{7,15}$/.test(f.phone.trim())) e.phone = 'Enter a valid phone number.';
  if (!f.email.trim()) e.email = 'Email address is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Please enter a valid email address.';
  if (!f.city.trim()) e.city = 'City / Area is required.';
  return e;
}

export default function Register() {
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', blood: '', phone: '', email: '', city: '', available: true });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
    if (Object.keys(errs).length) return;
    
    setSubmitting(true);
    try {
      const result = await donorService.createDonor({
        name: f.name,
        bloodGroup: normalizeBloodGroup(f.blood),
        area: f.city,
        phone: f.phone,
        email: f.email,
        available: f.available
      });
      // Save donor profile to localStorage for dashboard access
      localStorage.setItem('currentDonor', JSON.stringify({
        id: result.$id,
        name: f.name,
        bloodGroup: normalizeBloodGroup(f.blood),
        area: f.city,
        phone: f.phone,
        email: f.email,
        available: f.available
      }));
      toast.success('Registration successful! You will be notified during emergencies.');
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      toast.error('Registration failed: ' + (error.message || 'Unknown error'));
      console.error('Register error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBFB] font-sans flex flex-col">
      {/* Navbar */}
      {/* <nav className="h-16 bg-white border-b border-gray-100 flex items-center px-8 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="text-red-600 font-extrabold text-2xl tracking-tighter">
            BloodConnect
          </div>
        </Link>

        <div className="hidden md:flex items-center justify-center flex-1 gap-12">
          {['Find Drives', 'Eligibility', 'About Us'].map((label) => (
            <Link key={label} to="#" className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors">
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <button className="text-red-600">
            <Asterisk size={20} />
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            <Bell size={20} />
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
              <User size={18} />
            </div>
          </button>
        </div>
      </nav> */}

      {/* Hero Section */}
      <div className="flex flex-col items-center pt-12 pb-8 px-4 text-center">
        <div className="mb-6">
          <Logo variant="full" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Become a Lifesaver
        </h1>
        <p className="text-gray-600 max-w-md leading-relaxed">
          Your single donation can save up to three lives. Join our community of dedicated blood donors today.
        </p>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col items-center px-4 pb-20">
        <div className="w-full max-w-[580px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden relative">
          {/* Accent Line */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600 z-10"></div>
          
          {/* Card Header Illustration Box */}
          <div className="h-48 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1579152276508-2d6402480302?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center filter blur-sm"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>
            
            {/* Floating blood icon (as in pic) */}
            <div className="absolute top-8 right-12 w-10 h-14 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-sm border border-white">
               <div className="w-6 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                  <Droplet className="text-red-500" size={16} />
               </div>
            </div>
          </div>

          <form onSubmit={submit} className="px-10 pb-10 -mt-12 relative z-20 space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="John Doe"
                  className={`w-full h-14 pl-12 pr-4 rounded-xl border ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-red-50 focus:border-red-500 transition-all text-gray-800 placeholder:text-gray-300`}
                  value={f.name}
                  onChange={e => set('name', e.target.value)}
                  onBlur={() => blur('name')}
                />
              </div>
              {errors.name && <p className="text-xs text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.name}</p>}
            </div>

            {/* Blood Group & City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Blood Group</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                    <Droplet size={18} />
                  </div>
                  <select 
                    className={`w-full h-14 pl-12 pr-10 rounded-xl border ${errors.blood ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-red-50 focus:border-red-500 transition-all text-gray-800 appearance-none bg-white`}
                    value={f.blood}
                    onChange={e => set('blood', e.target.value)}
                    onBlur={() => blur('blood')}
                  >
                    <option value="" disabled>Select Group</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <ChevronDown size={18} />
                  </div>
                </div>
                {errors.blood && <p className="text-xs text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.blood}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">City / Area</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                    <MapPin size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="New York, NY"
                    className={`w-full h-14 pl-12 pr-4 rounded-xl border ${errors.city ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-red-50 focus:border-red-500 transition-all text-gray-800 placeholder:text-gray-300`}
                    value={f.city}
                    onChange={e => set('city', e.target.value)}
                    onBlur={() => blur('city')}
                  />
                </div>
                {errors.city && <p className="text-xs text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.city}</p>}
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Phone Number</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                    <Phone size={18} />
                  </div>
                  <input 
                    type="tel" 
                    placeholder="+1 (555) 000-0000"
                    className={`w-full h-14 pl-12 pr-4 rounded-xl border ${errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-red-50 focus:border-red-500 transition-all text-gray-800 placeholder:text-gray-300`}
                    value={f.phone}
                    onChange={e => set('phone', e.target.value)}
                    onBlur={() => blur('phone')}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.phone}</p>}
                <p className="text-xs text-gray-500 ml-1">Include country code (e.g., +1 for US, +92 for Pakistan)</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    placeholder="john@example.com"
                    className={`w-full h-14 pl-12 pr-4 rounded-xl border ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-red-50 focus:border-red-500 transition-all text-gray-800 placeholder:text-gray-300`}
                    value={f.email}
                    onChange={e => set('email', e.target.value)}
                    onBlur={() => blur('email')}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.email}</p>}
              </div>
            </div>

            {/* Emergency Availability Box */}
            <div className="bg-[#FFF5F5] border border-[#FEE2E2] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm border border-red-50">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 leading-none">Emergency Availability</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Notify me during urgent blood shortages</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => set('available', !f.available)}
                className={`w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${f.available ? 'bg-red-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${f.available ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            {/* Privacy Box */}
            <div className="bg-[#EBF5FF] border border-[#D1E9FF] rounded-2xl p-4 flex items-start gap-3">
              <div className="text-blue-500 mt-0.5">
                <Shield size={20} />
              </div>
              <p className="text-[11px] text-blue-800 leading-normal font-medium">
                Your data is secured with medical-grade encryption and only shared with verified healthcare facilities.
              </p>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={submitting}
              className="w-full h-16 bg-[#E12B2B] hover:bg-[#C82323] active:scale-[0.98] disabled:bg-gray-400 disabled:scale-100 text-white font-bold rounded-2xl shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-3 text-lg"
            >
              {submitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Heart size={20} fill="currentColor" />
                  Complete Registration
                </>
              )}
            </button>
          </form>
        </div>

        {/* Stats Section */}
        <div className="mt-16 w-full max-w-[600px] grid grid-cols-3 gap-8">
           <div className="text-center">
              <div className="text-2xl font-black text-gray-900 tracking-tight">150k+</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Active Donors</div>
           </div>
           <div className="text-center">
              <div className="text-2xl font-black text-gray-900 tracking-tight">450k</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Lives Saved</div>
           </div>
           <div className="text-center">
              <div className="text-2xl font-black text-gray-900 tracking-tight">24/7</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Emergency Support</div>
           </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-100 py-8 px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div />
        <div className="flex items-center gap-8">
          {['Privacy Policy', 'Terms of Service', 'Contact Support'].map(link => (
            <Link key={link} to="#" className="text-[11px] font-bold text-gray-700 hover:text-red-600 transition-colors">
              {link}
            </Link>
          ))}
        </div>
      </footer>

      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="text-red-500" size={40} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Welcome aboard!</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Thank you for joining our community of heroes. Your registration was successful.
            </p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}