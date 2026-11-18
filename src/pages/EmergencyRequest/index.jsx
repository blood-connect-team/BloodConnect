import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle, Building2, CheckCircle2, Clock, Droplet, FileText, MapPin, Phone, Siren, User } from 'lucide-react';
import { useAuth } from '../../app/providers/auth-context';
import { normalizePhone } from '../../utils/phone';
import { resolveNeededBy } from '../../utils/neededBy';
import { BLOOD_GROUPS, URGENCY_LEVELS, countMatchingDonors, createRequest, listCities } from '../../services/requests';

const newKey = () => crypto.randomUUID();

function validate(f) {
  const e = {};
  const hospital = f.hospital.trim();
  if (hospital.length < 2) e.hospital = 'Hospital name is required.';
  else if (hospital.length > 120) e.hospital = 'Hospital name is too long.';
  if (f.patientReference.length > 60) e.patientReference = 'Keep this under 60 characters.';
  if (!f.bloodGroup) e.bloodGroup = 'Choose the blood group needed.';
  if (!f.cityId) e.cityId = 'City is required.';
  const units = Number(f.units);
  if (!Number.isInteger(units) || units < 1 || units > 10) e.units = 'Units must be between 1 and 10.';
  const deadline = resolveNeededBy(f.neededBy);
  if (deadline.error) e.neededBy = deadline.error;
  const phone = normalizePhone(f.contactPhone);
  if ('error' in phone) e.contactPhone = phone.error;
  if (f.notes.length > 500) e.notes = 'Notes must be 500 characters or less.';
  return e;
}

function Field({ id, label, icon: Icon, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-bold text-gray-700">{label}</label>
      <div className="relative">
        {Icon && <Icon size={18} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" aria-hidden="true" />}
        {children}
      </div>
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle size={12} aria-hidden="true" /> {error}</p>}
    </div>
  );
}

export default function EmergencyRequest() {
  const { user, profile, donor } = useAuth();
  const blank = () => ({
    hospital: '',
    patientReference: '',
    bloodGroup: '',
    urgency: 'high',
    cityId: donor?.city_id ? String(donor.city_id) : '',
    units: '1',
    neededBy: '',
    contactPhone: profile?.phone ?? '',
    notes: '',
  });

  const [cities, setCities] = useState([]);
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // One key per form: a double submit or a retry cannot create a second request.
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);
  const [result, setResult] = useState(null);

  useEffect(() => {
    listCities().then(setCities).catch((error) => toast.error(error.message));
  }, []);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`req-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const contactPhone = normalizePhone(f.contactPhone).e164;
      const { neededBy, expiresAt } = resolveNeededBy(f.neededBy);
      const created = await createRequest(user.id, { ...f, contactPhone, neededBy, expiresAt }, idempotencyKey);
      let matches = null;
      try {
        matches = await countMatchingDonors(created.id);
      } catch {
        // The request exists; the count is only informative.
      }
      setResult({ id: created.id, matches, bloodGroup: f.bloodGroup, city: cities.find((c) => String(c.id) === f.cityId)?.name });
      toast.success('Request created.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setF(blank());
    setErrors({});
    setIdempotencyKey(newKey());
    setResult(null);
  };

  if (result) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#FFFBFB] px-4 py-10">
        <div className="mx-auto max-w-xl bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
          <CheckCircle2 size={48} className="mx-auto text-green-600" aria-hidden="true" />
          <h1 className="text-2xl font-extrabold text-gray-900">Your request is live</h1>
          <p className="text-gray-600">
            {result.matches === null
              ? 'Matching donors can now see it.'
              : result.matches === 0
                ? `No available ${result.bloodGroup} donors are registered in ${result.city} yet. Your request stays open until it expires; share it with family and friends too.`
                : `${result.matches} available ${result.bloodGroup} donor${result.matches > 1 ? 's' : ''} in ${result.city} can see your request.`}
          </p>
          <p className="text-sm text-gray-500">When a donor accepts, their name and phone appear on your dashboard. We never show you a list of donors.</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/dashboard" className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">Go to dashboard</Link>
            <button type="button" onClick={startOver} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700">New request</button>
          </div>
        </div>
      </div>
    );
  }

  const box = (err) => `w-full h-12 pl-11 pr-4 rounded-xl border ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 text-sm text-gray-800 bg-white`;
  const aria = (k) => ({ 'aria-invalid': Boolean(errors[k]), 'aria-describedby': errors[k] ? `req-${k}-error` : undefined });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FFFBFB] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <Siren size={40} className="mx-auto text-red-600" aria-hidden="true" />
          <h1 className="mt-3 text-3xl font-extrabold text-gray-900">Request blood</h1>
          <p className="mt-2 text-sm text-gray-600">Only matching, available donors in the selected city see this request. Your phone is shared only with donors who accept.</p>
        </div>

        <form onSubmit={submit} noValidate className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
          <Field id="req-hospital" label="Hospital" icon={Building2} error={errors.hospital}>
            <input id="req-hospital" value={f.hospital} onChange={(e) => set('hospital', e.target.value)} placeholder="e.g. Jinnah Hospital" className={box(errors.hospital)} {...aria('hospital')} />
          </Field>

          <Field id="req-patientReference" label="Patient reference (optional)" icon={User} error={errors.patientReference} hint="A first name or bed number is enough. Avoid full names or diagnoses.">
            <input id="req-patientReference" value={f.patientReference} onChange={(e) => set('patientReference', e.target.value)} className={box(errors.patientReference)} {...aria('patientReference')} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field id="req-bloodGroup" label="Blood group needed" icon={Droplet} error={errors.bloodGroup}>
              <select id="req-bloodGroup" value={f.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} className={box(errors.bloodGroup)} {...aria('bloodGroup')}>
                <option value="" disabled>Select group</option>
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field id="req-cityId" label="City" icon={MapPin} error={errors.cityId}>
              <select id="req-cityId" value={f.cityId} onChange={(e) => set('cityId', e.target.value)} className={box(errors.cityId)} {...aria('cityId')}>
                <option value="" disabled>{cities.length ? 'Select city' : 'Loading…'}</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          <fieldset>
            <legend className="text-sm font-bold text-gray-700 mb-2">Urgency</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {URGENCY_LEVELS.map((u) => (
                <label key={u.id} className={`cursor-pointer rounded-2xl border p-3 ${f.urgency === u.id ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                  <input type="radio" name="urgency" value={u.id} checked={f.urgency === u.id} onChange={() => set('urgency', u.id)} className="sr-only" />
                  <span className="block text-sm font-bold text-gray-900">{u.label}</span>
                  <span className="block text-xs text-gray-500">{u.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field id="req-units" label="Units needed" icon={Droplet} error={errors.units}>
              <input id="req-units" type="number" min={1} max={10} value={f.units} onChange={(e) => set('units', e.target.value)} className={box(errors.units)} {...aria('units')} />
            </Field>
            <Field id="req-neededBy" label="Needed by (optional)" icon={Clock} error={errors.neededBy} hint="Leave empty if there is no fixed time. The request closes at this time if it is sooner than 48 hours.">
              <input id="req-neededBy" type="datetime-local" value={f.neededBy} onChange={(e) => set('neededBy', e.target.value)} className={box(errors.neededBy)} {...aria('neededBy')} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field id="req-contactPhone" label="Contact phone" icon={Phone} error={errors.contactPhone} hint="Shown only to donors who accept.">
              <input id="req-contactPhone" type="tel" value={f.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="0300 1234567" className={box(errors.contactPhone)} {...aria('contactPhone')} />
            </Field>
          </div>

          <Field id="req-notes" label="Notes (optional)" icon={FileText} error={errors.notes} hint={`${f.notes.length}/500`}>
            <textarea id="req-notes" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Ward, visiting hours, who to ask for…" className={`${box(errors.notes)} h-auto py-3`} {...aria('notes')} />
          </Field>

          <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold">
            {submitting ? 'Creating request…' : 'Create request'}
          </button>
        </form>
      </div>
    </div>
  );
}
