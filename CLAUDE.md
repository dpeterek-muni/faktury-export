# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fakturoid Invoice Export - A web application for exporting license/service records from Excel to the Fakturoid invoicing system, with additional XML export capability for Munipolis integration.

**Live URL**: https://faktury-muni.vercel.app/ (or faktury-chi.vercel.app)

## Architecture

### Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS (at `/frontend/`)
- **Backend**: Vercel Serverless Functions (at `/api/`)
- **Deployment**: Vercel (auto-deploys from `main` branch)
- **APIs**: Fakturoid API v3 (OAuth 2.0), Munipolis XML export

### Project Structure
```
/frontend/          - React SPA
  /src/
    /components/    - React components
    App.jsx         - Main app with workflow steps
/api/               - Vercel serverless functions
  /fakturoid/       - Fakturoid API endpoints
  /munipolis/       - XML export for Munipolis
```

### Key Components (Frontend)
- **FileUpload** - Excel file upload (.xlsx, .xls)
- **ClientsTable** - Item selection with filtering, auto-excludes already invoiced items
- **InvoicePreview** - Editable invoice preview (prices, VAT, currency, DUZP, item names)
- **ExportPanel** - Fakturoid export + XML download with preview
- **FakturoidSettings** - API credentials configuration

### API Endpoints
- `POST /api/upload` - Parse Excel file, extract client data
- `POST /api/fakturoid/test` - Test Fakturoid connection
- `POST /api/fakturoid/preview` - Generate invoice preview from selected items
- `POST /api/fakturoid/check-subjects` - Verify clients exist in Fakturoid
- `POST /api/fakturoid/create-invoices` - Create invoices in Fakturoid
- `POST /api/munipolis/export-xml` - Generate XML export for Munipolis

## Development Commands

### Initial Setup
```bash
npm install              # Install root dependencies
cd frontend && npm install
```

### Development
```bash
# Frontend only (recommended for development)
cd frontend && npm run dev    # Runs on http://localhost:5173

# Backend API testing
# Note: Vercel functions run automatically when deployed
# For local testing, use `vercel dev` (requires Vercel CLI)
```

### Build & Deploy
```bash
# Build frontend
cd frontend && npm run build

# Deploy to Vercel (auto-deploy on git push to main)
git push origin main

# Manual deploy (requires Vercel CLI)
vercel --prod
```

## Key Features & Implementation Details

### 1. Hybrid Credentials System
The app supports two credential modes:
- **Server credentials**: Set via Vercel environment variables (optional)
- **User credentials**: Entered by user in the UI (stored in sessionStorage)

**Priority**: User-provided credentials ALWAYS override server credentials.

Implementation in all `/api/fakturoid/*` endpoints:
```javascript
const { clientId: bodyClientId, clientSecret: bodyClientSecret, slug: bodySlug, email: bodyEmail } = req.body || {};
const hasUserCredentials = bodyClientId && bodyClientSecret && bodySlug;

const clientId = hasUserCredentials ? bodyClientId : process.env.FAKTUROID_CLIENT_ID;
// Same for clientSecret, slug, email
```

### 2. Auto-Detection by Country
- **VAT rates**: Automatically set based on country (CZE: 21%, SVK: 20%, DEU: 19%, HUN: 27%, etc.)
- **Currency**: Auto-mapped by country (CZE→CZK, SVK→EUR, DEU→EUR, HUN→HUF, POL→PLN, etc.)
- **22 countries supported**: CZE, SVK, HUN, DEU, AUT, POL, CHE, BEL, NLD, FRA, ITA, ESP, PRT, ROU, BGR, HRV, SVN, SRB, BIH, UKR, GBR, USA
- **Mappings**: See `CURRENCY_BY_COUNTRY` and `VAT_RATE_BY_COUNTRY` in `frontend/src/components/InvoicePreview.jsx`

All values remain editable by the user in the invoice preview.

### 3. DUZP (Taxable Fulfillment Date)
- **Global setting**: Configurable in step 2 (item selection), default is today's date
- **Per-invoice override**: User can change DUZP for individual invoices in step 3 (preview)
- **Default**: Today's date (safe, always legal)
- **Czech law requirement**: DUZP must not be older than 14 days from invoice issue date

### 4. Invoice Grouping
Items are grouped by IČO (company registration number) in `/api/fakturoid/preview.js`.
Each group becomes one invoice with multiple line items.

### 5. Already Invoiced Items
Items with `vyfakturovano === 'ano'` or `vyfakturovano === 'áno'` are automatically filtered out in `ClientsTable`.

### 6. XML Export
Standard invoice XML format generated in `/api/munipolis/export-xml.js`:
- Includes all edited values (prices, VAT, names, currency, DUZP)
- Can be previewed before download (syntax-highlighted modal with copy/open-in-browser)
- Fields: InvoiceNumber, VariableSymbol, IssuedOn, TaxableFulfillmentDue, DueOn, Currency, Subject, Lines, Summary
- Ready for Munipolis integration (format may need adjustment when exact spec is available)

## Working with the Codebase

### Adding New Countries
Update both mappings in `frontend/src/components/InvoicePreview.jsx`:
```javascript
const CURRENCY_BY_COUNTRY = { /* ... */ };
const VAT_RATE_BY_COUNTRY = { /* ... */ };
const CURRENCIES = [/* add new currency */];
```

### Modifying Invoice Data
Invoice data flows: Excel → Parse → Preview (with defaults) → Edit → Export

The preview API (`/api/fakturoid/preview.js`) sets `vatRate: null` to let frontend auto-detect by country.

### Fakturoid API Integration
- **Authentication**: OAuth 2.0 Client Credentials flow
- **Base URL**: `https://app.fakturoid.cz/api/v3`
- **Required headers**: `Authorization: Bearer <token>`, `User-Agent: FakturyExport (<email>)`
- **Invoice status**: Created as `'open'` (ready to send)

### Error Handling for OAuth
If OAuth fails with `invalid_client`, the API returns `needsCredentials: true` to prompt user for credentials.

## Important Notes

- Never commit Fakturoid credentials to the repository
- When modifying number inputs, use `lang="en"` attribute to ensure dot decimal separator
- The app auto-excludes already invoiced items - do not remove this filter
- Vercel auto-deploys from `main` branch - test changes before pushing
- XML format is a baseline and can be adjusted when Munipolis spec is available
