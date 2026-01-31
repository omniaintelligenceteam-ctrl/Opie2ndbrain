# Contacts Import Methods for Opie's Memory System

*Research completed: 2026-01-30*

## Executive Summary

To populate Opie's `memory/people/` directory with Wes's contacts, we have several options ranked by speed-to-value:

| Method | Setup Time | Data Richness | Best For |
|--------|------------|---------------|----------|
| **Google CSV Export** | 5 min | High | Quick one-time import |
| **Google People API** | 30-60 min | Highest | Ongoing sync |
| **iPhone/iCloud vCard** | 10 min | Medium | iOS-primary users |
| **Manual Entry** | Ongoing | Highest (curated) | VIP contacts |
| **CardDAV Sync** | 2-3 hrs | High | Real-time sync |

**🏆 RECOMMENDED: Google CSV Export (immediate) + selective Manual Entry (VIPs)**

---

## Option 1: Google Contacts CSV Export ⭐ RECOMMENDED FIRST STEP

### What It Is
Direct export from Google Contacts web interface. No API keys needed.

### Data We'd Get
- ✅ Full names (first, middle, last)
- ✅ All email addresses
- ✅ All phone numbers
- ✅ Physical addresses
- ✅ Company/organization
- ✅ Job title
- ✅ Notes field
- ✅ Birthday
- ✅ Custom fields
- ✅ Contact groups/labels
- ✅ Website URLs
- ✅ Relationship (spouse, assistant, etc.)

### Setup Steps
1. Go to [contacts.google.com](https://contacts.google.com)
2. Select all contacts (or specific labels)
3. Click "More actions" → "Export"
4. Choose "Google CSV" format
5. Download the file

### Import Process
```bash
# Create a simple Node.js script to parse CSV → markdown profiles
node scripts/import-google-contacts.js contacts.csv
```

The script would:
1. Parse CSV with headers
2. For each contact with sufficient data:
   - Create `memory/people/{firstname_lastname}.md`
   - Follow the template in `memory/people/_template.md`
   - Set `importance: low` for bulk imports (upgrade manually)
3. Create an index file for quick lookup

### Effort Level: ⭐ EASY
- No API keys
- No OAuth setup
- Works immediately
- Re-exportable anytime

---

## Option 2: Google People API (OAuth2)

### What It Is
Programmatic access to Google Contacts with automatic refresh capability.

### Data We'd Get
Everything from CSV export PLUS:
- ✅ Contact photos (URLs)
- ✅ Interaction metadata
- ✅ Last updated timestamps
- ✅ Resource names for updates
- ✅ Structured relationship data

### Setup Steps

1. **Google Cloud Console Setup**
   - Create/select a project at [console.cloud.google.com](https://console.cloud.google.com)
   - Enable the People API
   - Configure OAuth consent screen (Internal for testing)
   - Create OAuth 2.0 Client ID (Desktop app)
   - Download `credentials.json`

2. **Install Dependencies**
   ```bash
   npm install googleapis @google-cloud/local-auth
   ```

3. **Create Sync Script**
   ```javascript
   // scripts/sync-google-contacts.js
   const { google } = require('googleapis');
   const { authenticate } = require('@google-cloud/local-auth');
   
   const SCOPES = ['https://www.googleapis.com/auth/contacts.readonly'];
   
   async function listConnections() {
     const auth = await authenticate({
       keyfilePath: 'credentials.json',
       scopes: SCOPES,
     });
     
     const service = google.people({ version: 'v1', auth });
     const res = await service.people.connections.list({
       resourceName: 'people/me',
       pageSize: 1000,
       personFields: 'names,emailAddresses,phoneNumbers,organizations,birthdays,biographies,addresses,urls,relations,memberships,photos',
     });
     
     return res.data.connections;
   }
   ```

4. **First Run Authorization**
   - Browser opens for Google login
   - Grant contacts.readonly permission
   - Token saved for future runs

### API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `people.connections.list` | Get all contacts |
| `people.get` | Get single contact |
| `people.searchContacts` | Search by name/email |
| `contactGroups.list` | Get contact labels |

### Permissions Needed
- `contacts.readonly` — Read contacts (sufficient for import)
- `contacts` — Read/write (if we want to sync notes back)

### Effort Level: ⭐⭐⭐ MEDIUM
- Requires Google Cloud project
- OAuth consent screen setup
- First-time browser auth flow
- But enables ongoing sync

---

## Option 3: iPhone/iCloud vCard Export

### What It Is
Export contacts from iCloud as vCard (.vcf) files.

### Data We'd Get
- ✅ Names
- ✅ Phone numbers
- ✅ Emails
- ✅ Addresses
- ✅ Birthday
- ✅ Notes
- ⚠️ Custom fields (may vary)
- ⚠️ Groups (separate export)

### Export Methods

#### Method A: iCloud.com
1. Go to [icloud.com/contacts](https://icloud.com/contacts)
2. Select contacts (Cmd+A for all)
3. Click gear icon → "Export vCard"
4. Download .vcf file

#### Method B: Mac Contacts App
1. Open Contacts app
2. Select contacts
3. File → Export → Export vCard
4. Choose save location

#### Method C: iPhone (per contact)
1. Open contact
2. Share → Export as vCard
3. (Tedious for bulk)

### Import Process
```bash
# Parse vCard format
npm install vcard-parser
node scripts/import-vcard.js contacts.vcf
```

### vCard Fields Mapping
```
FN → Full Name
N → Structured Name
EMAIL → Email addresses
TEL → Phone numbers
ADR → Addresses
BDAY → Birthday
NOTE → Notes
ORG → Organization
TITLE → Job title
URL → Websites
```

### Effort Level: ⭐⭐ EASY-MEDIUM
- No API keys needed
- Manual export step required
- vCard parsing slightly trickier than CSV
- Good if Wes is iPhone-primary

---

## Option 4: Manual Entry Workflow

### What It Is
Human-curated profiles for key contacts.

### When to Use
- VIP contacts (investors, partners, key clients)
- Contacts with complex relationship context
- People who need communication DNA details
- After bulk import, to enhance important profiles

### Workflow

**Quick Add (via chat):**
```
"Create profile for John Smith - investor at Sequoia, met at TechCrunch"
```

**Deep Profile (dedicated time):**
1. Use `memory/people/_template.md`
2. Fill in from memory + LinkedIn + past emails
3. Add relationship context Opie can't infer

### Effort Level: ⭐⭐⭐⭐ HIGH (but highest quality)
- Best for 20-50 critical contacts
- Can be done incrementally
- Results in richest profiles

---

## Option 5: CardDAV Protocol (Advanced)

### What It Is
Real-time sync protocol used by Google Contacts, iCloud, etc.

### When to Use
- If you want live sync (contacts update automatically)
- Enterprise/complex setups
- Probably overkill for current needs

### Setup Complexity
- Requires CardDAV library
- Needs persistent sync daemon
- OAuth token refresh handling
- Conflict resolution logic

### Effort Level: ⭐⭐⭐⭐⭐ HIGH
- Skip for now
- Consider later if sync becomes important

---

## Recommended Implementation Plan

### Phase 1: Quick Win (Today - 30 min)
1. ✅ Wes exports Google Contacts as CSV
2. ✅ Create `scripts/import-google-contacts.js`
3. ✅ Run import → populates `memory/people/`
4. ✅ Review and spot-check imports

### Phase 2: Enrich VIPs (This Week)
1. Identify top 20-30 contacts
2. Manually enhance their profiles
3. Add communication DNA, relationship context
4. Set importance levels (critical/high)

### Phase 3: Optional API Sync (Later)
1. Set up Google People API if we want refresh capability
2. Create cron job for weekly sync
3. Detect new/changed contacts

---

## Import Script Outline

```javascript
// scripts/import-google-contacts.js

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

const PEOPLE_DIR = './memory/people';
const template = fs.readFileSync(path.join(PEOPLE_DIR, '_template.md'), 'utf8');

function slugify(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function createProfile(contact) {
  const name = contact['Name'] || `${contact['First Name']} ${contact['Last Name']}`.trim();
  if (!name) return null;
  
  const slug = slugify(name);
  const filename = `${slug}.md`;
  
  const profile = `# ${name}
*Updated: ${new Date().toISOString().split('T')[0]}*

## Quick Reference
- **Relationship**: [to fill]
- **Company/Role**: ${contact['Organization 1 - Name'] || ''} ${contact['Organization 1 - Title'] || ''}
- **Location**: ${contact['Address 1 - City'] || ''}
- **Contact**: ${contact['E-mail 1 - Value'] || contact['Phone 1 - Value'] || ''}
- **Network Tier**: 3

## Contact Info
${contact['E-mail 1 - Value'] ? `- Email: ${contact['E-mail 1 - Value']}` : ''}
${contact['E-mail 2 - Value'] ? `- Email 2: ${contact['E-mail 2 - Value']}` : ''}
${contact['Phone 1 - Value'] ? `- Phone: ${contact['Phone 1 - Value']}` : ''}
${contact['Phone 2 - Value'] ? `- Phone 2: ${contact['Phone 2 - Value']}` : ''}

## Professional Context
- **Company**: ${contact['Organization 1 - Name'] || '[unknown]'}
- **Title**: ${contact['Organization 1 - Title'] || '[unknown]'}

## Personal World
${contact['Birthday'] ? `- Birthday: ${contact['Birthday']}` : ''}

## Notes
${contact['Notes'] || '[No notes in Google Contacts]'}

---
*Auto-imported from Google Contacts. Enhance manually for VIPs.*
`;

  return { filename, profile, name };
}

// Main
const csvContent = fs.readFileSync(process.argv[2], 'utf8');
const records = csv.parse(csvContent, { columns: true, skip_empty_lines: true });

let imported = 0;
for (const record of records) {
  const result = createProfile(record);
  if (result) {
    const filepath = path.join(PEOPLE_DIR, result.filename);
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, result.profile);
      console.log(`✅ Created: ${result.filename} (${result.name})`);
      imported++;
    } else {
      console.log(`⏭️ Skipped: ${result.filename} (already exists)`);
    }
  }
}

console.log(`\nImported ${imported} new contacts.`);
```

---

## Data Quality Considerations

| Source | Completeness | Freshness | Notes Quality |
|--------|--------------|-----------|---------------|
| Google CSV | High | Snapshot | Whatever's in Notes field |
| Google API | High | Live | Same + metadata |
| iCloud vCard | Medium | Snapshot | Often sparse |
| Manual | Varies | Curated | Best context |

---

## Privacy & Storage Notes

- All contact data stays in `memory/people/` (local files)
- No data sent to external services
- Can gitignore `memory/people/*.md` if sensitive
- Individual profiles can be encrypted if needed

---

## Next Steps

1. **Wes to decide:** Google primary or iPhone primary?
2. **Export the contacts** (5 min)
3. **Run import script** (I'll create it)
4. **Review results** together
5. **Enhance VIP profiles** incrementally

---

*This research supports the Opie memory system. See `memory/MEMORY_SCHEMA.md` for profile structure.*
