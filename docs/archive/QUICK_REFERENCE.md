# BloodConnect - Quick Reference & Action Items

## 🔴 CRITICAL ISSUES TO FIX IMMEDIATELY

### Issue #1: Emergency Request Form Field Mismatch
**File:** `src/pages/EmergencyRequest/index.jsx`

**Problem:** Form uses state keys that don't match service parameters

**Current Code (WRONG):**
```javascript
const [f, setF] = useState({
    hospital: '',      // ❌ service expects: hospitalName
    patient: '',       // ❌ service expects: patientName
    blood: '',
    urgency: 'critical',
    area: '',          // ❌ service expects: HospitalArea
    notes: '',
});
```

**Fixed Code (CORRECT):**
```javascript
const [f, setF] = useState({
    hospital: '',          // ✓ will map to hospitalName in submission
    patient: '',           // ✓ will map to patientName in submission
    blood: '',
    urgency: 'critical',
    HospitalArea: '',      // ✓ matches service expectation
    notes: '',
});
```

**OR Change the Service Call to:**
```javascript
requestService.createRequest({
    hospitalName: f.hospital,      // Map form field to service param
    patientName: f.patient,        // Map form field to service param
    bloodGroup: f.blood,
    urgency: f.urgency,
    HospitalArea: f.area,          // Map form field to service param
    status: "active"
})
```

---

### Issue #2: Missing Environment Variables
**File:** `src/services/appwrite/config.js`

**Current Code:**
```javascript
export const appwriteConfig = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,                    // ❌ No default, no validation
    donorsCollectionId: import.meta.env.VITE_APPWRITE_DONORS_COLLECTION_ID,
    requestsCollectionId: import.meta.env.VITE_APPWRITE_REQUESTS_COLLECTION_ID,
};
```

**Required .env Variables (Create .env.local):**
```bash
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a02b92a003168e94af8
VITE_APPWRITE_DATABASE_ID=<your_database_id>
VITE_APPWRITE_DONORS_COLLECTION_ID=<your_donors_collection_id>
VITE_APPWRITE_REQUESTS_COLLECTION_ID=<your_requests_collection_id>
```

**Add Validation (src/services/appwrite/config.js):**
```javascript
export const appwriteConfig = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    donorsCollectionId: import.meta.env.VITE_APPWRITE_DONORS_COLLECTION_ID,
    requestsCollectionId: import.meta.env.VITE_APPWRITE_REQUESTS_COLLECTION_ID,
};

// Add this validation
if (!appwriteConfig.databaseId || !appwriteConfig.donorsCollectionId || !appwriteConfig.requestsCollectionId) {
    console.error('❌ Missing Appwrite configuration in environment variables');
    throw new Error('Appwrite collection IDs not configured');
}
```

---

## 📋 FORM FIELD MAPPING TABLE

### Register Form → Donor Collection
| Form Field | Form State Key | Service Parameter | DB Field | Type |
|---|---|---|---|---|
| Full Name | `f.name` | `name` | `name` | string |
| Blood Group | `f.blood` | `bloodGroup` | `bloodGroup` | string |
| City / Area | `f.city` | `area` | `area` | string |
| Phone Number | `f.phone` | `phone` | `phone` | string |
| Email | `f.email` | `email` | `email` | string |
| Emergency Availability | `f.available` | `available` | `available` | boolean |

**Service Call:**
```javascript
donorService.createDonor({
    name: f.name,
    bloodGroup: f.blood,
    area: f.city,
    phone: f.phone,
    email: f.email,
    available: f.available
})
```

---

### Emergency Request Form → Requests Collection
| Form Field | Form State Key | Service Parameter | DB Field | Type | ❌ Issue |
|---|---|---|---|---|---|
| Hospital Name | `f.hospital` | `hospitalName` | `hospitalName` | string | Key mismatch |
| Patient Identifier | `f.patient` | `patientName` | `patientName` | string | Key mismatch |
| Blood Group | `f.blood` | `bloodGroup` | `bloodGroup` | string | ✓ OK |
| Urgency | `f.urgency` | `urgency` | `urgency` | string | ✓ OK |
| Delivery Area | `f.area` | `HospitalArea` | `HospitalArea` | string | Key mismatch |
| Notes | `f.notes` | (not sent) | (not stored) | string | - |

**Service Call (CURRENT - HAS BUGS):**
```javascript
requestService.createRequest({
    hospitalName: f.hospital,      // WRONG: f.hospital should be f.hospitalName
    bloodGroup: f.blood,
    urgency: f.urgency,
    HospitalArea: f.area,          // WRONG: f.area should be f.HospitalArea
    patientName: f.patient,        // WRONG: f.patient should be f.patientName
    status: "active"
})
```

---

## 🔗 SERVICE-TO-DATABASE QUERY MAPPING

### Donor Matching Flow
```
1. Form Submit: EmergencyRequest
   ↓
2. Call: findMatchingDonors(request)
   ↓
3. Inside matchingService:
   - areaToSearch = request.HospitalArea || request.area  ← Uses HospitalArea!
   - Calls: donorService.getMatchingDonors(request.bloodGroup, areaToSearch)
   ↓
4. Database Query:
   Query.equal('bloodGroup', bloodGroup) ✓
   Query.equal('area', area) ✓
   Query.equal('available', true) ✓
```

**Expected DB Document Structure (Donors):**
```javascript
{
  $id: "doc_123",
  name: "John Doe",
  bloodGroup: "O+",
  area: "Downtown",
  phone: "+1-555-0000",
  email: "john@example.com",
  available: true,
  $createdAt: "2024-01-15T10:00:00Z",
  ...appwrite_metadata
}
```

---

### Emergency Request Flow
```
1. Form Submit: EmergencyRequest
   ↓
2. Call: requestService.createRequest(formData)
   ↓
3. Database Insert:
   {
     hospitalName: "Central Medical Center",
     patientName: "Jane Smith",
     bloodGroup: "O-",
     urgency: "critical",
     HospitalArea: "ER Trauma Bay",
     status: "active"
   }
   ↓
4. Query Active Requests:
   Query.equal('status', 'active')
```

---

## 📧 EMAIL & NOTIFICATION CONFIGURATION

### EmailJS Setup
**File:** `src/services/emailService.js`

```javascript
// Current hardcoded values:
sendEmailAlert(donor, request) {
    templateParams = {
        to_name: donor.name,
        to_email: donor.email,
        blood_group: request.bloodGroup,
        hospital: request.hospitalName || request.hospital,  // ← Fallback!
        urgency: request.urgency
    };

    emailjs.send(
        "service_y2d6gj6",              // Service ID
        "template_9747r61",             // Template ID
        templateParams,
        "PFmDTW3iSsA0-YpRa"            // Public Key (⚠️ EXPOSED IN CODE)
    );
}
```

**⚠️ SECURITY ISSUE:** API key is hardcoded in frontend. Should be in .env:
```bash
VITE_EMAILJS_SERVICE_ID=service_y2d6gj6
VITE_EMAILJS_TEMPLATE_ID=template_9747r61
VITE_EMAILJS_PUBLIC_KEY=PFmDTW3iSsA0-YpRa
```

**EmailJS Template Expected Fields:**
- `to_name` (string) - Recipient name
- `to_email` (string) - Recipient email
- `blood_group` (string) - Blood type needed (e.g., "O+", "B-")
- `hospital` (string) - Hospital name
- `urgency` (string) - Priority level

---

### WhatsApp Integration
**File:** `src/services/notificationService.js`

```javascript
generateWhatsAppLink(donor, request) {
    // Uses: donor.phone (with country code, e.g., "+1-555-0000")
    // Uses: request.bloodGroup, request.hospitalName, request.urgency
    
    message = `
    🚨 Emergency Blood Needed
    Blood Group: ${request.bloodGroup}
    Hospital: ${request.hospitalName || request.hospital}
    Urgency: ${request.urgency}
    Can you donate immediately?
    Reply YES if available.
    `;
    
    url = `https://wa.me/${donor.phone}?text=${encodeURIComponent(message)}`;
    // Opens WhatsApp web with pre-filled message
}
```

**Expected Phone Format:** International format with country code (e.g., `+1-555-0000`)

---

## ✅ VALIDATION RULES

### Register Form
```javascript
name:       Required, non-empty
blood:      Required, select from: A+, A-, B+, B-, AB+, AB-, O+, O-
phone:      Required, matches /^\+?[\d\s\-(). ]{7,15}$/
email:      Required, matches /^[^\s@]+@[^\s@]+\.[^\s@]+$/
city:       Required, non-empty
available:  Optional, boolean (default: true)
```

### Emergency Request Form
```javascript
hospital:   Required, non-empty
patient:    Required, non-empty
blood:      Required, select from blood groups
urgency:    Required, one of: critical, high, medium
area:       Required, non-empty (non-empty string)
notes:      Optional, textarea
```

---

## 🛠️ IMPLEMENTATION CHECKLIST

- [ ] Fix Emergency Request form field keys (area → HospitalArea, patient → patientName, hospital → hospitalName)
- [ ] Create `.env.local` with all Appwrite collection IDs
- [ ] Move EmailJS credentials to environment variables
- [ ] Add validation for missing environment variables in config.js
- [ ] Test donor registration flow end-to-end
- [ ] Test emergency request creation flow end-to-end
- [ ] Verify matching service finds correct donors
- [ ] Test WhatsApp link generation with valid phone format
- [ ] Test email alert sending via EmailJS
- [ ] Verify dashboard shows active requests correctly
- [ ] Add error boundaries and user-friendly error messages
- [ ] Create TypeScript interfaces for data types (optional but recommended)

---

## 🧪 TEST DATA FOR LOCAL TESTING

### Sample Donor
```javascript
{
    name: "Alice Johnson",
    bloodGroup: "O+",
    area: "Downtown District",
    phone: "+1-555-0123456",
    email: "alice@example.com",
    available: true
}
```

### Sample Emergency Request
```javascript
{
    hospitalName: "Central Medical Center",
    patientName: "Patient #4521",
    bloodGroup: "O+",
    urgency: "critical",
    HospitalArea: "ER Trauma Bay 4",
    status: "active"
}
```

### Expected Matching Result
After creating the request above, `findMatchingDonors()` should return Alice Johnson because:
- bloodGroup matches: O+ === O+ ✓
- area matches: "Downtown District" ✓
- available is true ✓

---

## 📊 DATABASE QUERY PATTERNS

### Get Active Blood Requests
```javascript
requestService.getActiveRequests()
// Executes: Query.equal('status', 'active')
// Returns: All documents where status = "active"
```

### Find Matching Donors
```javascript
donorService.getMatchingDonors("O+", "Downtown District")
// Executes: Multiple queries:
//   - Query.equal('bloodGroup', 'O+')
//   - Query.equal('area', 'Downtown District')
//   - Query.equal('available', true)
// Returns: Intersection of all three conditions
```

---

**Document Version:** 1.0  
**Created:** May 12, 2026  
**Last Updated:** May 12, 2026
