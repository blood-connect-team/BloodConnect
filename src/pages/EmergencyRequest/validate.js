export function validate(f) {
  const e = {};
  if (!f.hospital?.trim()) e.hospital = 'Hospital name is required.';
  if (!f.patient?.trim()) e.patient = 'Patient identifier is required.';
  if (!f.blood) e.blood = 'Blood group is required.';
  if (!f.area?.trim()) e.area = 'Delivery area is required.';
  return e;
}

