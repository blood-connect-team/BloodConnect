import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle, Droplet, Heart, MapPin, Phone, Shield, User } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { useAuth } from '../../app/providers/auth-context';
import { normalizePhone } from '../../utils/phone';
import { saveDonor, saveProfile } from '../../services/profile';
import { BLOOD_GROUPS, listCities } from '../../services/requests';

const safeNext = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard');

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Full name is required.';
  else if (f.name.trim().length > 100) e.name = 'Name is too long.';
  const phone = normalizePhone(f.phone);
  if ('error' in phone) e.phone = phone.error;
  if (f.donate) {
    if (!f.blood) e.blood = 'Blood group is required.';
    if (!f.cityId) e.cityId = 'City is required.';
    if (f.area.length > 100) e.area = 'Area is too long.';
  }
  if (!f.consent) e.consent = 'Please confirm to continue.';
  return e;
}

function Field({ id, label, icon: Icon, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-bold text-gray-700">{label}</label>
      <div className="relative">
        {Icon && <Icon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />}
        {children}
      </div>
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle size={12} aria-hidden="true" /> {error}</p>}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const { user, profile, donor, refreshProfile } = useAuth();

  const [cities, setCities] = useState([]);
  const [citiesError, setCitiesError] = useState(null);
  const [f, setF] = useState({
    name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    donate: donor ? true : !profile,
    blood: donor?.blood_group ?? '',
    cityId: donor?.city_id ? String(donor.city_id) : '',
    area: donor?.area ?? '',
    available: donor?.available ?? true,
    consent: Boolean(profile),
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listCities().then(setCities).catch((error) => setCitiesError(error.message));
  }, []);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`reg-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const phone = normalizePhone(f.phone).e164;
      await saveProfile(user.id, { fullName: f.name, phone }, Boolean(profile));
      if (f.donate) {
        await saveDonor(user.id, { bloodGroup: f.blood, cityId: f.cityId, area: f.area, available: f.available });
      }
      await refreshProfile();
      toast.success(profile ? 'Profile updated.' : 'Welcome to Blood Connect!');
      navigate(next, { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const box = (err) => `w-full h-12 pl-11 pr-4 rounded-xl border ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 text-sm text-gray-800 bg-white`;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FFFBFB] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="flex flex-col items-center text-center mb-8">
          <Logo variant="compact" />
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900">{profile ? 'Your profile' : 'Complete your profile'}</h1>
          <p className="mt-2 text-gray-600 text-sm">Logged in as <span className="font-semibold">{user?.email}</span></p>
        </div>

        <form onSubmit={submit} noValidate className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
          <Field id="reg-name" label="Full name" icon={User} error={errors.name}>
            <input id="reg-name" autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} className={box(errors.name)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'reg-name-error' : undefined} />
          </Field>

          <Field id="reg-phone" label="Mobile number" icon={Phone} error={errors.phone} hint="Pakistani numbers like 0300 1234567 are fine. Shared only with people whose request you accept.">
            <input id="reg-phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0300 1234567" className={box(errors.phone)} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'reg-phone-error' : undefined} />
          </Field>

          <label className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/60 p-4 cursor-pointer">
            <input type="checkbox" checked={f.donate} onChange={(e) => set('donate', e.target.checked)} className="mt-1 h-4 w-4 accent-red-600" />
            <span>
              <span className="block text-sm font-bold text-gray-900">I want to register as a blood donor</span>
              <span className="block text-xs text-gray-600">Untick if you only want to request blood for someone.</span>
            </span>
          </label>

          {f.donate && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field id="reg-blood" label="Blood group" icon={Droplet} error={errors.blood}>
                  <select id="reg-blood" value={f.blood} onChange={(e) => set('blood', e.target.value)} className={box(errors.blood)} aria-invalid={Boolean(errors.blood)}>
                    <option value="" disabled>Select group</option>
                    {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field id="reg-cityId" label="City" icon={MapPin} error={errors.cityId || citiesError}>
                  <select id="reg-cityId" value={f.cityId} onChange={(e) => set('cityId', e.target.value)} className={box(errors.cityId)} aria-invalid={Boolean(errors.cityId)}>
                    <option value="" disabled>{cities.length ? 'Select city' : 'Loading…'}</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field id="reg-area" label="Area (optional)" icon={MapPin} error={errors.area} hint="Helps requesters judge distance. Not used for matching.">
                <input id="reg-area" value={f.area} onChange={(e) => set('area', e.target.value)} placeholder="e.g. Gulshan-e-Iqbal" className={box(errors.area)} />
              </Field>
              <label className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 cursor-pointer">
                <span>
                  <span className="block text-sm font-bold text-gray-900">Available for emergencies</span>
                  <span className="block text-xs text-gray-500">Turn off any time to stop seeing new requests.</span>
                </span>
                <input type="checkbox" role="switch" checked={f.available} onChange={(e) => set('available', e.target.checked)} className="h-5 w-5 accent-red-600" />
              </label>
            </div>
          )}

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex gap-3">
            <Shield size={20} className="text-blue-600 shrink-0" aria-hidden="true" />
            <label className="text-xs text-blue-900 leading-relaxed flex gap-2 cursor-pointer">
              <input id="reg-consent" type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600 shrink-0" />
              <span>
                I agree that my name and phone number are shown <strong>only</strong> to people whose blood request I accept (and to them only for that request). Nobody can browse donors.
                {errors.consent && <span className="block mt-1 text-red-600 font-medium">{errors.consent}</span>}
              </span>
            </label>
          </div>

          <button type="submit" disabled={submitting} className="w-full h-13 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold flex items-center justify-center gap-2">
            <Heart size={18} fill="currentColor" aria-hidden="true" />
            {submitting ? 'Saving…' : profile ? 'Save changes' : 'Complete registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
