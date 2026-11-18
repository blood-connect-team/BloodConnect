import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building2, Clock, Droplet, MapPin, MessageCircle, Phone, Plus, RefreshCw, UserPlus } from 'lucide-react';
import { useAuth } from '../../app/providers/auth-context';
import { setAvailability } from '../../services/profile';
import {
  cancelRequest,
  getMatchingRequests,
  getMyRequests,
  getRequestContacts,
  setMyResponse,
} from '../../services/requests';
import { whatsAppLink } from '../../utils/phone';

const URGENCY_STYLE = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-800',
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

function Section({ title, action, children }) {
  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-gray-500 py-6 text-center">{children}</p>;
}

/** Contact list returned by get_request_contacts: the database decides who sees what. */
function Contacts({ requestId, intro, units }) {
  const [contacts, setContacts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getRequestContacts(requestId).then(setContacts).catch((e) => setError(e.message));
  }, [requestId]);

  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!contacts) return <p className="text-xs text-gray-500">Loading contacts…</p>;
  if (!contacts.length) return <p className="text-xs text-gray-500">No donors have accepted yet.</p>;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-gray-500">{intro}</p>
      {units != null && (
        <p className="text-xs text-gray-500">
          {contacts.length} donor{contacts.length > 1 ? 's' : ''} accepted for {units} requested unit{units > 1 ? 's' : ''}. Acceptances are a contact target; they do not mean blood has been donated.
        </p>
      )}
      {contacts.map((c, i) => {
        const wa = whatsAppLink(c.phone, 'Hi, this is about the Blood Connect request.');
        return (
          <div key={`${c.phone}-${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
            <span className="text-sm font-semibold text-gray-800">
              {c.full_name}
              {c.hospital_name && <span className="font-normal text-gray-500"> · {c.hospital_name}</span>}
            </span>
            <span className="flex gap-2">
              <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700">
                <Phone size={12} aria-hidden="true" /> {c.phone}
              </a>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-bold text-white">
                  <MessageCircle size={12} aria-hidden="true" /> WhatsApp
                </a>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user, profile, donor, refreshProfile } = useAuth();
  const [matching, setMatching] = useState(null);
  const [mine, setMine] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const hasDonor = Boolean(donor);
  const fetchAll = useCallback(
    () => Promise.all([hasDonor ? getMatchingRequests() : Promise.resolve([]), getMyRequests(user.id)]),
    [hasDonor, user.id],
  );

  const apply = ([m, r]) => {
    setMatching(m);
    setMine(r);
    setError(null);
  };

  const load = async () => {
    try {
      apply(await fetchAll());
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    let active = true;
    fetchAll()
      .then((data) => active && apply(data))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [fetchAll]);

  const respond = async (req, status) => {
    setBusyId(req.id);
    try {
      await setMyResponse(user.id, req.id, status, Boolean(req.my_response));
      toast.success(status === 'accepted' ? 'Thank you! The requester can now see your contact.' : 'You have withdrawn.');
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (req) => {
    if (!window.confirm('Cancel this request? Donors will stop seeing it.')) return;
    setBusyId(req.id);
    try {
      await cancelRequest(req.id);
      toast.success('Request cancelled.');
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleAvailable = async () => {
    try {
      await setAvailability(user.id, !donor.available);
      await refreshProfile();
      toast.success(donor.available ? 'You will not see new requests.' : 'You are available again.');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Hi, {profile?.full_name?.split(' ')[0] || 'there'}</h1>
          <p className="text-sm text-gray-500">
            {donor ? (
              <>Donor · <strong>{donor.blood_group}</strong> · {donor.cities?.name}{donor.area ? `, ${donor.area}` : ''}</>
            ) : (
              'You are not registered as a donor.'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700">
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
          <Link to="/request" className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700">
            <Plus size={14} aria-hidden="true" /> New request
          </Link>
        </div>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {donor ? (
        <label className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 cursor-pointer">
          <span>
            <span className="block text-sm font-bold text-gray-900">Available for emergencies</span>
            <span className="block text-xs text-gray-500">When off, you are not matched to new requests.</span>
          </span>
          <input type="checkbox" role="switch" checked={donor.available} onChange={toggleAvailable} className="h-5 w-5 accent-red-600" />
        </label>
      ) : (
        <Link to="/register" className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
          <UserPlus className="text-red-600" aria-hidden="true" />
          <span className="text-sm text-gray-800"><strong>Become a donor.</strong> Add your blood group and city to see matching requests.</span>
        </Link>
      )}

      {donor && (
        <Section title="Requests that match you">
          {matching === null ? (
            <Empty>Loading…</Empty>
          ) : matching.length === 0 ? (
            <Empty>No open requests for {donor.blood_group} in {donor.cities?.name} right now.</Empty>
          ) : (
            <ul className="space-y-3">
              {matching.map((req) => {
                const accepted = req.my_response === 'accepted' || req.my_response === 'donated';
                return (
                  <li key={req.id} className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-lg font-extrabold text-red-600"><Droplet size={16} aria-hidden="true" /> {req.blood_group}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${URGENCY_STYLE[req.urgency] ?? ''}`}>{req.urgency}</span>
                          <span className="text-xs text-gray-500">{req.units_needed} unit{req.units_needed > 1 ? 's' : ''}</span>
                        </div>
                        <p className="flex items-center gap-1 text-sm text-gray-700"><Building2 size={14} aria-hidden="true" /> {req.hospital_name}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={12} aria-hidden="true" /> {req.city} · <Clock size={12} aria-hidden="true" /> {req.needed_by ? `needed by ${formatDate(req.needed_by)}` : `expires ${formatDate(req.expires_at)}`}</p>
                      </div>
                      {accepted ? (
                        <button type="button" disabled={busyId === req.id} onClick={() => respond(req, 'withdrawn')} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700">
                          Withdraw
                        </button>
                      ) : (
                        <button type="button" disabled={busyId === req.id} onClick={() => respond(req, 'accepted')} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:bg-gray-400">
                          I can donate
                        </button>
                      )}
                    </div>
                    {accepted && <Contacts requestId={req.id} intro="Contact the requester to arrange the donation:" />}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      )}

      <Section title="My requests">
        {mine === null ? (
          <Empty>Loading…</Empty>
        ) : mine.length === 0 ? (
          <Empty>You have not created any requests.</Empty>
        ) : (
          <ul className="space-y-3">
            {mine.map((req) => (
              <li key={req.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold text-red-600">{req.blood_group}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold capitalize text-gray-700">{req.status}</span>
                    </div>
                    <p className="text-sm text-gray-700">{req.hospital_name} · {req.cities?.name}</p>
                    <p className="text-xs text-gray-500">{req.units_needed} unit{req.units_needed > 1 ? 's' : ''} · Created {formatDate(req.created_at)}</p>
                    <p className="text-xs text-gray-500">{req.needed_by ? `Needed by ${formatDate(req.needed_by)} · ` : ''}Expires {formatDate(req.expires_at)}</p>
                  </div>
                  {req.status === 'active' && (
                    <button type="button" disabled={busyId === req.id} onClick={() => cancel(req)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700">
                      Cancel
                    </button>
                  )}
                </div>
                {req.status === 'active' && <Contacts requestId={req.id} intro="Donors who accepted:" units={req.units_needed} />}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
