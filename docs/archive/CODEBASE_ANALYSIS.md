# BloodConnect UI Codebase Analysis

## 1. ALL PAGES & THEIR PURPOSES

| Page | Route | File | Purpose | User Type |
|------|-------|------|---------|-----------|
| **Landing** | `/` | `src/pages/Landing/index.jsx` | Marketing homepage with stats, features, and calls-to-action | Public |
| **Register** | `/register` | `src/pages/Register/index.jsx` | Donor registration form to create donor profile | Public/Donor |
| **Emergency Request** | `/request` | `src/pages/EmergencyRequest/index.jsx` | Hospital form to post urgent blood requests | Public/Hospital |
| **Confirmation** | `/confirmation` | `src/pages/Confirmation/index.jsx` | Success page after donor confirms donation | Donor |
| **Dashboard** | `/dashboard` | `src/pages/Dashboard/index.jsx` | Main control center for emergency matching & donor management | Admin/Hospital |
| **Notifications** | `/notifications` | `src/pages/Notifications/index.jsx` | Displays notifications (uses same layout as Dashboard) | Admin/Hospital |
| **Admin** | `/admin` | `src/pages/Admin/index.jsx` | Administrative console with analytics, inventory, and live activity | Admin |

---

## 2. ALL FORM COMPONENTS & FIELDS COLLECTED

### **Register Page Form** (`src/pages/Register/index.jsx`)
**Purpose:** Donor registration  
**Validation:** Yes (inline validation with error messages)

| Field | Type | Required | Validation | Maps To Database |
|-------|------|----------|-----------|-----------------|
| Full Name | text | ✓ | Non-empty string | `name` |
| Blood Group | select | ✓ | One of: A+, A-, B+, B-, AB+, AB-, O+, O- | `bloodGroup` |
| City / Area | text | ✓ | Non-empty string | `area` |
| Phone Number | tel | ✓ | Regex: `/^\+?[\d\s\-(). ]{7,15}$/` | `phone` |
| Email Address | email | ✓ | Email format validation | `email` |
| Emergency Availability | toggle | ✗ | Boolean (default: true) | `available` |

**Service Called:** `donorService.createDonor()`

---

### **Emergency Request Page Form** (`src/pages/EmergencyRequest/index.jsx`)
**Purpose:** Hospital posts urgent blood request  
**Validation:** Yes (inline validation)

| Field | Type | Required | Validation | Maps To Database |
|-------|------|----------|-----------|-----------------|
| Hospital Name | text | ✓ | Non-empty string | `hospitalName` |
| Patient Identifier | text | ✓ | Non-empty string (format: name/ID) | `patientName` |
| Blood Group Needed | select | ✓ | One of blood groups (with "Emergency Universal" notation for O-) | `bloodGroup` |
| Urgency Level | button group | ✓ | critical, high, medium | `urgency` |
| Delivery Area / Department | text | ✓ | Non-empty string (e.g., "ER Trauma Bay 4") | `HospitalArea` |
| Additional Clinical Notes | textarea | ✗ | Free text | (not stored in schema, only for reference) |

**Service Called:** `requestService.createRequest()`

---

### **Other Form Elements**
- **Input Component** (`src/components/forms/Input.jsx`): Generic reusable input field with label, error display, and styling
- **No additional form components** found in `src/components/forms/`

---

## 3. APPWRITE DATABASE CONFIG & COLLECTION IDS

**Config File:** `src/services/appwrite/config.js`

```javascript
Endpoint: https://cloud.appwrite.io/v1 (or env var: VITE_APPWRITE_ENDPOINT)
Project ID: 6a02b92a003168e94af8 (or env var: VITE_APPWRITE_PROJECT_ID)

Database ID: ${env.VITE_APPWRITE_DATABASE_ID}
Donors Collection ID: ${env.VITE_APPWRITE_DONORS_COLLECTION_ID}
Requests Collection ID: ${env.VITE_APPWRITE_REQUESTS_COLLECTION_ID}
```

**⚠️ CRITICAL:** Collection IDs and Database ID are loaded from environment variables. No hardcoded values are visible in code.

---

## 4. DATABASE SCHEMA (Based on Service Calls)

### **DONORS Collection**
**Expected Fields:**

| Field Name | Type | Required | Notes |
|-----------|------|----------|-------|
| `name` | String | ✓ | Donor's full name |
| `bloodGroup` | String | ✓ | Blood type (e.g., "O+", "B-") |
| `area` | String | ✓ | Geographic area/city for matching |
| `phone` | String | ✓ | Phone number for WhatsApp/SMS alerts |
| `email` | String | ✓ | Email for alerts (used by emailService) |
| `available` | Boolean | ✓ | Donor emergency availability status |

**Queries Used:**
- `Query.equal('bloodGroup', bloodGroup)` - Match by blood type
- `Query.equal('area', area)` - Match by location
- `Query.equal('available', true)` - Filter available donors

---

### **REQUESTS Collection**
**Expected Fields:**

| Field Name | Type | Required | Notes |
|-----------|------|----------|-------|
| `hospitalName` | String | ✓ | Hospital/facility name |
| `patientName` | String | ✓ | Patient identifier or name |
| `bloodGroup` | String | ✓ | Blood type needed |
| `urgency` | String | ✓ | Priority level (critical, high, medium) |
| `HospitalArea` | String | ✓ | Delivery location/department |
| `status` | String | ✓ | Status (default: "active") - Values: "active", etc. |

**Queries Used:**
- `Query.equal('status', 'active')` - Get active emergencies
- `Query.equal('bloodGroup', bloodGroup)` - Match by blood type
- `Query.equal('area', area)` - Match by area (uses HospitalArea field)

---

## 5. ALL SERVICES & THEIR FUNCTIONS

### **authService.js** - User Authentication
```javascript
Functions:
- register(email, password, name) → Creates user account + session
- login(email, password) → Creates email/password session
- logout() → Deletes all sessions
- getCurrentUser() → Returns current authenticated user
```

### **donorService.js** - Donor Management
```javascript
Functions:
- createDonor({ name, bloodGroup, area, phone, email, available }) → Creates donor document
- getDonors(queries) → Lists all donors with optional filters
- getMatchingDonors(bloodGroup, area) → Finds available donors by blood type & location
```

### **requestService.js** - Blood Request Management
```javascript
Functions:
- createRequest({ hospitalName, bloodGroup, urgency, HospitalArea, patientName, status }) → Creates request
- getActiveRequests() → Retrieves active (status='active') requests
- updateRequestStatus(documentId, status) → Updates request status
```

### **matchingService.js** - Smart Donor Matching
```javascript
Functions:
- findMatchingDonors(request) → Uses HospitalArea from request, calls donorService.getMatchingDonors()
```

### **notificationService.js** - WhatsApp Alerts
```javascript
Functions:
- generateWhatsAppLink(donor, request) → Generates WhatsApp link with pre-filled message
  Uses: donor.phone, request.bloodGroup, request.hospitalName, request.urgency
```

### **emailService.js** - Email Alerts
```javascript
Functions:
- sendEmailAlert(donor, request) → Sends email via EmailJS
  Service ID: service_y2d6gj6
  Template ID: template_9747r61
  API Key: PFmDTW3iSsA0-YpRa
  Template Params:
    - to_name: donor.name
    - to_email: donor.email
    - blood_group: request.bloodGroup
    - hospital: request.hospitalName || request.hospital
    - urgency: request.urgency
```

---

## 6. ⚠️ CRITICAL FIELD MISMATCHES & ERRORS

### **Mismatch #1: Hospital Area Field Name**
**Issue:** Inconsistent field naming between form and database service

| Component | Field Name Used |
|-----------|-----------------|
| EmergencyRequest Form | `area` (in form state) |
| requestService.createRequest() | `HospitalArea` (camelCase) |
| matchingService | Uses `request.HospitalArea` |
| notificationService | Also expects `request.HospitalArea` |

**Status:** ❌ **INCONSISTENT** - Form state uses `area` but service expects `HospitalArea`

**Fix Required:** In `EmergencyRequest/index.jsx`, ensure field state key is consistent:
```javascript
// Current (WRONG):
const [f, setF] = useState({ ..., area: '', ... });

// Should be:
const [f, setF] = useState({ ..., HospitalArea: '', ... });
```

---

### **Mismatch #2: Hospital Name in Notifications**
**Issue:** Fallback naming inconsistency

| File | Field Reference |
|------|-----------------|
| notificationService.js | `request.hospitalName \|\| request.hospital` |
| Emergency Request Form | Uses `hospitalName` |
| Requests Collection Schema | Expects `hospitalName` |

**Status:** ⚠️ **WARNING** - Service accepts fallback to `hospital` but only `hospitalName` is used in forms

---

### **Mismatch #3: Patient Name vs Patient Identifier**
**Issue:** Form field name doesn't match service expectation

| Component | Field Name |
|-----------|-----------|
| EmergencyRequest Form | `patient` (form state key) |
| requestService.createRequest() | `patientName` (parameter) |

**Status:** ❌ **INCONSISTENT** - Form state uses `patient` but service parameter expects `patientName`

---

### **Mismatch #4: Urgency Field Values**
**Issue:** Possible data type mismatch

| Component | Values |
|-----------|--------|
| EmergencyRequest Form | `'critical'` \| `'high'` \| `'medium'` (strings) |
| Urgency Level Buttons | Defined as IDs: `critical`, `high`, `medium` |
| emailService | Sends `request.urgency` directly (no validation) |

**Status:** ✓ **OK** - Consistent string values across components

---

### **Mismatch #5: Database ID & Collection ID Environment Variables**
**Issue:** Collection IDs are not hardcoded, loaded entirely from env variables

```javascript
appwriteConfig = {
    databaseId: ${env.VITE_APPWRITE_DATABASE_ID},           // NO DEFAULT
    donorsCollectionId: ${env.VITE_APPWRITE_DONORS_COLLECTION_ID},
    requestsCollectionId: ${env.VITE_APPWRITE_REQUESTS_COLLECTION_ID},
}
```

**Status:** ⚠️ **CRITICAL** - If env variables are missing, services will fail silently with `undefined` values

---

### **Mismatch #6: Request Status Field**
**Issue:** Default status inconsistency

| Service | Default Value |
|---------|---------------|
| requestService.createRequest() | `status: "active"` |
| Dashboard/Notifications Display | Shows `status: 'In Progress'` or `'Awaiting'` |
| requestService.getActiveRequests() | Queries for `status === 'active'` |

**Status:** ⚠️ **POSSIBLE MISMATCH** - Display shows status names that don't match database values

---

## 7. FORM VALIDATION ISSUES

### **Register Form Validation**
```javascript
Phone Regex: /^\+?[\d\s\-(). ]{7,15}$/
// Allows: +1 (555) 000-0000, +1-555-0000, 5550000000
// ⚠️ May reject valid international formats

Email Regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Basic validation - works but could reject some valid emails
```

### **Emergency Request Form Validation**
```javascript
Required fields: hospital, patient, blood, area
// ✓ Adequate validation - validates on blur and submit
```

---

## 8. SERVICE-FORM PARAMETER MAPPING CHECKLIST

### **Donor Registration Flow**
```
Form Field → Service Parameter → DB Field
name → name → name ✓
bloodGroup → bloodGroup → bloodGroup ✓
city → area → area ✓
phone → phone → phone ✓
email → email → email ✓
available → available → available ✓
```

### **Emergency Request Flow**
```
Form Field → Service Parameter → DB Field
hospital → hospitalName → hospitalName ✓
patient → patientName → patientName ❌ (field key mismatch)
blood → bloodGroup → bloodGroup ✓
urgency → urgency → urgency ✓
area → HospitalArea → HospitalArea ❌ (field key mismatch)
notes → (not sent) → (not stored)
```

---

## 9. CRITICAL SUMMARY FOR ALIGNMENT

### **REQUIRED FIXES (Before Database Integration)**

1. **Fix Emergency Request Form State Keys**
   - Change `area` → `HospitalArea`
   - Change `patient` → `patientName` (or update service to use `patient`)

2. **Add/Verify Environment Variables**
   - `VITE_APPWRITE_ENDPOINT`
   - `VITE_APPWRITE_PROJECT_ID`
   - `VITE_APPWRITE_DATABASE_ID`
   - `VITE_APPWRITE_DONORS_COLLECTION_ID`
   - `VITE_APPWRITE_REQUESTS_COLLECTION_ID`

3. **Verify Request Status Values**
   - Define consistent status enum: `"active"`, `"completed"`, `"cancelled"`
   - Update Dashboard display to use actual DB values

4. **EmailJS Configuration**
   - Service ID: `service_y2d6gj6`
   - Template ID: `template_9747r61`
   - Public Key: `PFmDTW3iSsA0-YpRa`
   - Ensure template has fields: `to_name`, `to_email`, `blood_group`, `hospital`, `urgency`

### **RECOMMENDED ENHANCEMENTS**

1. Create TypeScript types/interfaces for data consistency
2. Add error handling for missing env variables
3. Implement request ID tracking for UI confirmations
4. Add form submission endpoints (currently forms don't POST to backend)
5. Add state management (Redux/Zustand) for global state instead of local form states

---

## 10. COMPONENT TREE

```
App.jsx
├── RouterProvider
├── MainLayout (public routes)
│   ├── Landing
│   ├── Register
│   ├── EmergencyRequest
│   ├── Confirmation
│   └── Notifications
├── DashboardLayout (protected routes)
│   ├── Sidebar.jsx
│   ├── Navbar.jsx
│   └── Dashboard
└── Admin (protected routes)
    └── Sidebar + Admin page

Common Components:
├── forms/
│   └── Input.jsx
├── common/
│   ├── Button.jsx
│   ├── Card.jsx
│   └── Loader.jsx
└── navigation/
    ├── Navbar.jsx
    └── Sidebar.jsx
```

---

## 11. STYLING APPROACH

- **Framework:** Tailwind CSS + inline styles
- **Color Scheme:** 
  - Primary: Red (#DC2626, #E12B2B, #9B1C1C)
  - Neutral: Gray shades (#111827, #6B7280, #F3F4F6, #FFF5F5)
  - Status: Green (#16A34A), Blue (#2563EB), Orange (#D97706)
- **Typography:** Inter font family
- **Responsive:** Grid-based layouts with mobile-first approach

---

**Last Updated:** May 12, 2026  
**Analysis Scope:** Complete UI codebase exploration  
**Database:** Appwrite (Cloud-based, configuration environment-dependent)
