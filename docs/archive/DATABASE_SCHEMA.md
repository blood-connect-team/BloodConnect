# BloodConnect - Database Schema & Field Mapping Diagram

## 📐 APPWRITE DATABASE ARCHITECTURE

```
PROJECT: BloodConnect
├── Endpoint: https://cloud.appwrite.io/v1
├── Project ID: 6a02b92a003168e94af8
└── Database
    ├── ID: ${VITE_APPWRITE_DATABASE_ID}
    ├── Collection: DONORS
    │   └── ID: ${VITE_APPWRITE_DONORS_COLLECTION_ID}
    └── Collection: REQUESTS
        └── ID: ${VITE_APPWRITE_REQUESTS_COLLECTION_ID}
```

---

## 🗂️ DONORS COLLECTION SCHEMA

```
Collection ID: [env variable]

Document Structure:
┌─────────────────────────────────────────────────────────────┐
│ DONOR DOCUMENT                                              │
├─────────────────────────────────────────────────────────────┤
│ $id           │ string   │ Appwrite auto-generated          │
│ name          │ string   │ Donor full name                  │
│ bloodGroup    │ string   │ A+, A-, B+, B-, AB+, AB-, O+, O- │
│ area          │ string   │ Geographic location              │
│ phone         │ string   │ WhatsApp/SMS number              │
│ email         │ string   │ Email address for alerts         │
│ available     │ boolean  │ Emergency availability status    │
│ $createdAt    │ datetime │ Appwrite timestamp               │
│ $updatedAt    │ datetime │ Appwrite timestamp               │
│ $permissions  │ object   │ Appwrite permissions             │
└─────────────────────────────────────────────────────────────┘

Indexes/Queries Used:
├── Query.equal('bloodGroup', value)    → Match blood type
├── Query.equal('area', value)          → Match location
└── Query.equal('available', true)      → Filter available only
```

### Example DONOR Document:
```json
{
  "$id": "donor_001",
  "name": "Marcus Thompson",
  "bloodGroup": "O-",
  "area": "Downtown District",
  "phone": "+1-555-0123456",
  "email": "marcus.thompson@example.com",
  "available": true,
  "$createdAt": "2024-05-01T10:30:00Z",
  "$updatedAt": "2024-05-12T14:22:00Z"
}
```

---

## 📋 REQUESTS COLLECTION SCHEMA

```
Collection ID: [env variable]

Document Structure:
┌──────────────────────────────────────────────────────────────┐
│ REQUEST DOCUMENT                                             │
├──────────────────────────────────────────────────────────────┤
│ $id           │ string   │ Appwrite auto-generated           │
│ hospitalName  │ string   │ Hospital/facility name            │
│ patientName   │ string   │ Patient identifier or name        │
│ bloodGroup    │ string   │ Blood type needed                 │
│ urgency       │ string   │ critical, high, medium            │
│ HospitalArea  │ string   │ Department/delivery location      │
│ status        │ string   │ active, completed, cancelled      │
│ $createdAt    │ datetime │ Appwrite timestamp                │
│ $updatedAt    │ datetime │ Appwrite timestamp                │
│ $permissions  │ object   │ Appwrite permissions              │
└──────────────────────────────────────────────────────────────┘

Indexes/Queries Used:
├── Query.equal('status', 'active')     → Get active requests
├── Query.equal('bloodGroup', value)    → Match blood type
└── Query.equal('HospitalArea', value)  → Match area (used in matching)
```

### Example REQUEST Document:
```json
{
  "$id": "request_001",
  "hospitalName": "Central Regional Medical Center",
  "patientName": "Patient #9822",
  "bloodGroup": "O-",
  "urgency": "critical",
  "HospitalArea": "ER Trauma Bay 4",
  "status": "active",
  "$createdAt": "2024-05-12T15:00:00Z",
  "$updatedAt": "2024-05-12T15:05:00Z"
}
```

---

## 🔄 DATA FLOW DIAGRAMS

### DONOR REGISTRATION FLOW
```
┌─────────────────────────────────────┐
│   Register Form                     │
│  (Register/index.jsx)               │
├─────────────────────────────────────┤
│ • name                              │
│ • blood (bloodGroup)                │
│ • city (area)                       │
│ • phone                             │
│ • email                             │
│ • available                         │
└──────────────┬──────────────────────┘
               │ form submit
               ▼
┌──────────────────────────────────────┐
│ donorService.createDonor()          │
│                                     │
│ Parameters: {                       │
│   name: f.name,                     │
│   bloodGroup: f.blood,              │
│   area: f.city,                     │
│   phone: f.phone,                   │
│   email: f.email,                   │
│   available: f.available            │
│ }                                   │
└──────────────┬──────────────────────┘
               │ databases.createDocument()
               ▼
┌──────────────────────────────────────┐
│ Appwrite                            │
│                                     │
│ POST /databases/{dbId}/             │
│      collections/{collectionId}/    │
│      documents                      │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ DONORS Collection                   │
│                                     │
│ New document created                │
│ with auto-generated $id             │
└──────────────────────────────────────┘
```

---

### EMERGENCY REQUEST & MATCHING FLOW
```
┌───────────────────────────────────────┐
│   Emergency Request Form              │
│   (EmergencyRequest/index.jsx)         │
├───────────────────────────────────────┤
│ • hospital    (hospitalName)          │
│ • patient     (patientName)           │
│ • blood       (bloodGroup)            │
│ • area        (HospitalArea) ❌       │
│ • urgency                             │
│ • notes                               │
└──────────────┬────────────────────────┘
               │ form submit
               ▼
┌───────────────────────────────────────┐
│ requestService.createRequest()        │
│                                       │
│ Parameters: {                         │
│   hospitalName,    ❌ KEY MISMATCH   │
│   patientName,     ❌ KEY MISMATCH   │
│   bloodGroup,                         │
│   urgency,                            │
│   HospitalArea,    ❌ KEY MISMATCH   │
│   status: "active"                    │
│ }                                     │
└──────────────┬────────────────────────┘
               │ databases.createDocument()
               ▼
┌───────────────────────────────────────┐
│ REQUESTS Collection                   │
│                                       │
│ New document created                  │
│ with status = "active"                │
└──────────────┬────────────────────────┘
               │
               ├─ Trigger Matching ─────┐
               │                         │
               ▼                         ▼
┌───────────────────────────┐  ┌─────────────────────────────┐
│ matchingService           │  │ findMatchingDonors()        │
│                           │  │                             │
│ areaToSearch =            │  │ • request.bloodGroup        │
│   request.HospitalArea    │  │ • request.HospitalArea      │
└───────────────────────────┘  └─────────────────────────────┘
               │                         │
               └────────────┬────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │ donorService.getMatchingDonors()      │
        │                                       │
        │ Queries:                              │
        │ • Query.equal('bloodGroup', blood)   │
        │ • Query.equal('area', area)          │
        │ • Query.equal('available', true)     │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │ Matching Donors Result                │
        │ [array of donor documents]            │
        └───────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
    ┌────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Send Email │  │Send WhatsApp │  │ Update UI    │
    │ Alerts     │  │ Notifications │  │ Dashboard    │
    └────────────┘  └──────────────┘  └──────────────┘
```

---

## 🔑 CRITICAL FIELD MAPPING: FORM → SERVICE → DATABASE

### Register Page
```
FORM COMPONENT                  SERVICE PARAMETER           DATABASE FIELD
──────────────────────────────────────────────────────────────────────────
Input (Full Name)      →       name                    →    name
Select (Blood Group)   →       bloodGroup              →    bloodGroup
Input (City/Area)      →       area                    →    area
Input (Phone)          →       phone                   →    phone
Input (Email)          →       email                   →    email
Toggle (Available)     →       available               →    available

✅ ALL MAPPINGS CORRECT
```

### Emergency Request Page (❌ HAS ERRORS)
```
FORM COMPONENT                  SERVICE PARAMETER           DATABASE FIELD
──────────────────────────────────────────────────────────────────────────
Input (Hospital Name)  →       hospitalName            →    hospitalName
                       ❌ KEY MISMATCH ❌
                       Form uses: f.hospital
                       
Input (Patient ID)     →       patientName             →    patientName
                       ❌ KEY MISMATCH ❌
                       Form uses: f.patient
                       
Select (Blood Group)   →       bloodGroup              →    bloodGroup
                       ✅ CORRECT
                       
Urgency Buttons        →       urgency                 →    urgency
                       ✅ CORRECT
                       
Input (Delivery Area)  →       HospitalArea            →    HospitalArea
                       ❌ KEY MISMATCH ❌
                       Form uses: f.area
                       
Textarea (Notes)       →       (not sent)              →    (not stored)
                       ⚠️  FORM DATA LOST
```

---

## 🔍 QUERY EXAMPLES

### Query: Find Matching Donors
```javascript
// Input
const bloodGroup = "O+";
const area = "Downtown District";

// Appwrite Query Execution
const response = await databases.listDocuments(
    databaseId,
    donorsCollectionId,
    [
        Query.equal('bloodGroup', "O+"),
        Query.equal('area', "Downtown District"),
        Query.equal('available', true)
    ]
);

// Returns
[
  {
    $id: "donor_001",
    name: "Marcus Thompson",
    bloodGroup: "O+",
    area: "Downtown District",
    phone: "+1-555-0123456",
    email: "marcus@example.com",
    available: true
  },
  {
    $id: "donor_002",
    name: "Sarah Johnson",
    bloodGroup: "O+",
    area: "Downtown District",
    phone: "+1-555-7654321",
    email: "sarah@example.com",
    available: true
  }
]

// Next Steps
→ Loop through results
→ For each donor: generateWhatsAppLink(donor, request)
→ For each donor: sendEmailAlert(donor, request)
```

### Query: Get Active Requests
```javascript
// Appwrite Query Execution
const response = await databases.listDocuments(
    databaseId,
    requestsCollectionId,
    [Query.equal('status', 'active')]
);

// Returns
[
  {
    $id: "request_001",
    hospitalName: "Central Medical Center",
    patientName: "Patient #9822",
    bloodGroup: "O-",
    urgency: "critical",
    HospitalArea: "ER Trauma Bay 4",
    status: "active"
  },
  {
    $id: "request_002",
    hospitalName: "St. Mary's General Hospital",
    patientName: "Jane Smith",
    bloodGroup: "A+",
    urgency: "high",
    HospitalArea: "ICU",
    status: "active"
  }
]

// Displayed in Dashboard
→ Show each request in request cards
→ For each request: call findMatchingDonors()
→ Display matching donor count
```

---

## 🚨 VALIDATION PIPELINE

### Register Form Validation
```
Input: Register Form Fields
  ↓
validate(f) function checks:
  ├─ name: !f.name.trim() → error
  ├─ blood: !f.blood → error
  ├─ phone: regex test → error if no match
  ├─ email: regex test → error if no match
  └─ city: !f.city.trim() → error
  ↓
Errors Object: { field: errorMessage }
  ↓
Display errors under each field
  ↓
If errors.length === 0:
  → Call donorService.createDonor()
  → Show success state
  ↓
Otherwise:
  → Block submission
  → Show error messages
```

### Emergency Request Validation
```
Input: Emergency Request Form Fields
  ↓
validate(f) function checks:
  ├─ hospital: !f.hospital.trim() → error
  ├─ patient: !f.patient.trim() → error
  ├─ blood: !f.blood → error
  └─ area: !f.area.trim() → error
  ↓
Errors Object: { field: errorMessage }
  ↓
Display errors under each field
  ↓
If errors.length === 0:
  → Call requestService.createRequest()
  → (⚠️ Note: Will fail due to field key mismatches)
  ↓
Otherwise:
  → Block submission
  → Show error messages
```

---

## 📊 COLLECTION STATISTICS (Expected)

### DONORS Collection
```
Index Statistics:
├─ Total Documents: ~150,000 (at scale)
├─ Average Document Size: ~200 bytes
├─ Active Donors (available=true): ~85% (~127,500)
├─ Indexed Fields:
│   ├─ bloodGroup (filter queries)
│   ├─ area (filter queries)
│   └─ available (filter queries)
└─ Query Pattern: Multi-field AND queries
```

### REQUESTS Collection
```
Index Statistics:
├─ Total Documents: ~50,000 (at scale)
├─ Average Document Size: ~180 bytes
├─ Active Requests (status='active'): ~5% (~2,500)
├─ Indexed Fields:
│   ├─ status (filter queries)
│   ├─ bloodGroup (join with donors)
│   └─ HospitalArea (join with donors)
└─ Query Pattern: Single status filter, then matching
```

---

## 🔐 PERMISSIONS & ACCESS CONTROL

### Current Setup (No Explicit Permissions)
```javascript
// In appwrite config
// No permissions are explicitly set
// Default: Admin can read/write, users have default access

// ⚠️ SECURITY NOTE:
// - All collection operations use default permissions
// - Should implement role-based access control:
//   ├─ Public: Can read non-sensitive donor data
//   ├─ Donors: Can read/update own profile only
//   ├─ Hospitals: Can create/read/update own requests
//   └─ Admin: Full access to all collections
```

---

## 💾 BACKUP & PERSISTENCE

```
Database: Appwrite Cloud
├─ Auto-backup: Daily (Appwrite default)
├─ Retention: 30 days
├─ Access: Via Appwrite Dashboard
└─ Recovery: RTO ~1 hour, RPO ~1 day
```

---

## 🧮 RELATIONSHIP DIAGRAM

```
                    ┌─────────────────────────┐
                    │  EMERGENCY REQUEST      │
                    │                         │
                    │ bloodGroup: "O+"        │
                    │ HospitalArea: "ER"      │
                    └───────────┬─────────────┘
                                │ Match on
                                │ bloodGroup + area
                                │
                                ▼
            ┌───────────────────────────────────────┐
            │     MATCHING SERVICE                  │
            │  (findMatchingDonors)                 │
            │                                       │
            │  Query Database:                      │
            │  ├─ bloodGroup = "O+"                 │
            │  ├─ area = "ER"                       │
            │  └─ available = true                  │
            └───────────┬───────────────────────────┘
                        │
                        ▼
      ┌─────────────────────────────┐
      │    DONOR COLLECTION         │
      │    (Matching Results)       │
      │                             │
      │  [                          │
      │    {                        │
      │      $id: "donor_1",        │
      │      bloodGroup: "O+",      │
      │      area: "ER",            │
      │      available: true,       │
      │      email: "...",          │
      │      phone: "+1-555-..."    │
      │    },                       │
      │    ...                      │
      │  ]                          │
      └─────────────────────────────┘
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Create Appwrite Collections (DONORS, REQUESTS)
- [ ] Get Collection IDs from Appwrite Console
- [ ] Set environment variables in deployment platform
- [ ] Create Appwrite Indexes for query fields
- [ ] Set up backups in Appwrite Console
- [ ] Configure CORS for domain
- [ ] Test all queries in local environment
- [ ] Load test with sample data
- [ ] Verify EmailJS credentials
- [ ] Test WhatsApp link generation
- [ ] Set up monitoring/alerts
- [ ] Document database schema in team wiki

---

**Created:** May 12, 2026  
**Document Version:** 1.0  
**Status:** Ready for Implementation
