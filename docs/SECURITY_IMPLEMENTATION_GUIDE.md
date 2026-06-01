# Security Implementation Guide

**Quick-start guide for implementing critical security fixes**

---

## ⚠️ Critical: Fix XSS Vulnerabilities (Deploy ASAP)

### Step 1: Add DOMPurify Library

Add to [index.html](../index.html) after existing CDN scripts (line ~13):

```html
<!-- DOMPurify - XSS Prevention -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
        crossorigin="anonymous"></script>
```

### Step 2: Create Sanitization Helper

Add to [js/utilities.js](../js/utilities.js) at the top (after imports):

```javascript
/**
 * Sanitize user-provided text to prevent XSS
 * Strips all HTML tags and dangerous characters
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [], // Strip all HTML
    KEEP_CONTENT: true // Keep text content
  });
}

/**
 * Sanitize and validate URLs
 * Only allows http:, https:, and mailto: protocols
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';

  const allowedProtocols = ['http:', 'https:', 'mailto:'];
  try {
    const parsed = new URL(url);
    if (allowedProtocols.includes(parsed.protocol)) {
      // Still sanitize the URL string to prevent edge cases
      return DOMPurify.sanitize(url, {
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):)/i
      });
    }
  } catch (e) {
    // Invalid URL
    return '#';
  }

  // Reject javascript:, data:, and other dangerous protocols
  return '#';
}

// Export for use in other modules
export { sanitizeText, sanitizeUrl };
```

### Step 3: Update showTooltip Function

In [js/utilities.js](../js/utilities.js), update the `showTooltip` function (lines ~63-89):

**Find this code:**
```javascript
items.forEach(item => {
  const itemTitle = item.title || item.name || 'Untitled';
  const itemType = item.type_ || item.type || '';
  const itemAuthor = item.author || item.creator || '';
  const itemUrl = item.url || '';
  const itemDate = item.date || '';

  detailsHtml += `<div style="margin: 8px 0; padding: 6px; border-left: 2px solid #40916c; background: rgba(64, 145, 108, 0.05);">`;

  if (itemUrl) {
    detailsHtml += `<div style="font-weight: 500;"><a href="${itemUrl}" target="_blank" onclick="event.stopPropagation()" style="color: #40916c; text-decoration: none;">${itemTitle}</a></div>`;
  } else {
    detailsHtml += `<div style="font-weight: 500;">${itemTitle}</div>`;
  }
```

**Replace with:**
```javascript
items.forEach(item => {
  // SANITIZE ALL USER DATA
  const itemTitle = sanitizeText(item.title || item.name || 'Untitled');
  const itemType = sanitizeText(item.type_ || item.type || '');
  const itemAuthor = sanitizeText(item.author || item.creator || '');
  const itemUrl = sanitizeUrl(item.url || '');
  const itemDate = sanitizeText(item.date || '');

  detailsHtml += `<div style="margin: 8px 0; padding: 6px; border-left: 2px solid #40916c; background: rgba(64, 145, 108, 0.05);">`;

  if (itemUrl && itemUrl !== '#') {
    detailsHtml += `<div style="font-weight: 500;"><a href="${itemUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color: #40916c; text-decoration: none;">${itemTitle}</a></div>`;
  } else {
    detailsHtml += `<div style="font-weight: 500;">${itemTitle}</div>`;
  }
```

### Step 4: Update showSidePanel Function

In [js/utilities.js](../js/utilities.js), update the `showSidePanel` function (lines ~143-228):

**Find this code:**
```javascript
export function showSidePanel(sidePanel, d) {
  const name = d.data?.name || d.data?.entity_name || 'Unknown';
  const items = d.data?.urls || d.data?.content || d.data?.items || [];
```

**Replace with:**
```javascript
export function showSidePanel(sidePanel, d) {
  const name = sanitizeText(d.data?.name || d.data?.entity_name || 'Unknown');
  const items = d.data?.urls || d.data?.content || d.data?.items || [];
```

**Find this code (around line 181-222):**
```javascript
items.forEach((item, index) => {
  const itemTitle = item.title || item.name || 'Untitled';
  const itemType = item.type_ || item.type || '';
  const itemAuthor = item.author || item.creator || '';
  const itemUrl = item.url || '';
  const itemDate = item.date || '';
  const itemDescription = item.description || item.abstract || '';
  const itemTags = item.tags || '';
```

**Replace with:**
```javascript
items.forEach((item, index) => {
  // SANITIZE ALL USER DATA
  const itemTitle = sanitizeText(item.title || item.name || 'Untitled');
  const itemType = sanitizeText(item.type_ || item.type || '');
  const itemAuthor = sanitizeText(item.author || item.creator || '');
  const itemUrl = sanitizeUrl(item.url || '');
  const itemDate = sanitizeText(item.date || '');
  const itemDescription = sanitizeText(item.description || item.abstract || '');
  const itemTags = item.tags || '';
```

**Find this code (around line 194-198):**
```javascript
if (itemUrl) {
  contentHtml += `<div class="item-title"><a href="${itemUrl}" target="_blank" onclick="event.stopPropagation()">${itemTitle}</a></div>`;
} else {
  contentHtml += `<div class="item-title">${itemTitle}</div>`;
}
```

**Replace with:**
```javascript
if (itemUrl && itemUrl !== '#') {
  contentHtml += `<div class="item-title"><a href="${itemUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${itemTitle}</a></div>`;
} else {
  contentHtml += `<div class="item-title">${itemTitle}</div>`;
}
```

**Find this code (around line 213-217):**
```javascript
if (itemTags) {
  const tagsArray = Array.isArray(itemTags) ? itemTags : itemTags.split(',').map(t => t.trim());
  contentHtml += `<div class="item-tags">`;
  tagsArray.forEach(tag => {
    contentHtml += `<span class="tag">${tag}</span>`;
```

**Replace with:**
```javascript
if (itemTags) {
  const tagsArray = Array.isArray(itemTags) ? itemTags : itemTags.split(',').map(t => t.trim());
  contentHtml += `<div class="item-tags">`;
  tagsArray.forEach(tag => {
    contentHtml += `<span class="tag">${sanitizeText(tag)}</span>`;
```

### Step 5: Test XSS Prevention

**Test in browser console:**
```javascript
// Test 1: Try malicious title
const maliciousData = {
  data: {
    name: "Test",
    urls: [{
      title: "<script>alert('XSS')</script>Test",
      url: "https://example.com",
      description: "<img src=x onerror=alert('XSS')>"
    }]
  }
};

// This should show escaped text, not execute scripts
showSidePanel(document.getElementById('sidePanel'), maliciousData);

// Test 2: Try javascript: URL
const maliciousUrl = {
  data: {
    name: "Test",
    urls: [{
      title: "Click me",
      url: "javascript:alert('XSS')"
    }]
  }
};

// URL should be replaced with '#' (safe)
showSidePanel(document.getElementById('sidePanel'), maliciousUrl);
```

**Expected Result**: No alerts, no script execution, safe display.

---

## 🔒 High Priority: Add SRI Hashes

### Step 1: Generate SRI Hashes

**Option A: Use online tool**
1. Visit https://www.srihash.org/
2. Enter each CDN URL
3. Copy the full `<script>` tag with integrity hash

**Option B: Use command line**
```bash
# For D3.js
curl -s https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js | \
  openssl dgst -sha384 -binary | openssl base64 -A

# For Compromise
curl -s https://unpkg.com/compromise@14.14.0/builds/compromise.min.js | \
  openssl dgst -sha384 -binary | openssl base64 -A
```

### Step 2: Update index.html

Replace lines 9-13 in [index.html](../index.html):

```html
<!-- Before (NO SRI) -->
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
<script src="https://unpkg.com/compromise@14.14.0/builds/compromise.min.js"></script>
<script src="https://unpkg.com/compromise-dates@3.4.0/builds/compromise-dates.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/minisearch@7.1.2/dist/umd/index.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>

<!-- After (WITH SRI) - REPLACE WITH ACTUAL HASHES -->
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"
        integrity="sha384-GENERATE_HASH_HERE"
        crossorigin="anonymous"></script>
<script src="https://unpkg.com/compromise@14.14.0/builds/compromise.min.js"
        integrity="sha384-GENERATE_HASH_HERE"
        crossorigin="anonymous"></script>
<script src="https://unpkg.com/compromise-dates@3.4.0/builds/compromise-dates.min.js"
        integrity="sha384-GENERATE_HASH_HERE"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/minisearch@7.1.2/dist/umd/index.min.js"
        integrity="sha384-GENERATE_HASH_HERE"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
        integrity="sha384-GENERATE_HASH_HERE"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
        integrity="sha384-GENERATE_HASH_HERE"
        crossorigin="anonymous"></script>
```

### Step 3: Test SRI

1. Open browser DevTools Console
2. Look for **integrity errors** - should be NONE
3. If errors appear, regenerate hashes for that specific file

---

## 🛡️ High Priority: Add Content Security Policy

### Step 1: Add CSP Meta Tag

Add to [index.html](../index.html) `<head>` section (after line 6):

```html
<!-- Content Security Policy -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self'
    https://cdn.jsdelivr.net
    https://unpkg.com;
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

### Step 2: Test CSP

1. Open browser DevTools Console
2. Look for **CSP violations** - note any blocked resources
3. If legitimate resources are blocked, add their domains to CSP

### Step 3: Validate CSP

Use Google's CSP Evaluator:
1. Visit https://csp-evaluator.withgoogle.com/
2. Paste your CSP string
3. Fix any HIGH or MEDIUM severity issues

---

## 📋 Testing Checklist

After implementing all fixes:

### XSS Prevention
- [ ] Tested malicious HTML in form fields
- [ ] Tested `<script>` tags in titles
- [ ] Tested `javascript:` URLs
- [ ] Tested `<img onerror>` in descriptions
- [ ] Tested special characters: `< > " ' &`
- [ ] Verified links still work with `https://` URLs
- [ ] Verified tags display correctly

### SRI Hashes
- [ ] No console errors for CDN scripts
- [ ] All scripts load successfully
- [ ] Page functions correctly
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Safari

### CSP
- [ ] No CSP violations in console
- [ ] All CDN scripts allowed
- [ ] All images load
- [ ] Styles apply correctly
- [ ] No inline scripts blocked (we don't have any)
- [ ] Tested CSP with Google CSP Evaluator

---

## 🚀 Deployment Steps

### 1. Test Locally
```bash
python -m http.server 8000
# Visit http://localhost:8000
# Test all security fixes
```

### 2. Commit Changes
```bash
git add docs/SECURITY_AUDIT.md docs/PRIVACY.md docs/SECURITY_IMPLEMENTATION_GUIDE.md
git add index.html js/utilities.js
git commit -m "🔒 Security: Add XSS prevention, SRI hashes, and CSP

- Add DOMPurify for XSS sanitization
- Add SRI hashes to all CDN scripts
- Implement Content Security Policy
- Create security audit and privacy policy
- Sanitize all user-provided data

Fixes critical XSS vulnerabilities in tooltips and side panel.

See docs/SECURITY_AUDIT.md for full details."
```

### 3. Push to GitHub
```bash
git push origin main
```

### 4. Verify Production
1. Visit live site
2. Open DevTools Console
3. Check for errors
4. Test XSS scenarios
5. Verify SRI loads correctly
6. Check CSP is active

---

## 📞 Need Help?

If you encounter issues:

1. **Check browser console** for specific errors
2. **Review error messages** - they often indicate the exact problem
3. **Test with different browsers** - some have stricter CSP enforcement
4. **Contact**: aphilosof@gmail.com with subject "Security Implementation Help"

---

## 📚 Additional Resources

- [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify GitHub](https://github.com/cure53/DOMPurify)
- [SRI Hash Generator](https://www.srihash.org/)
- [CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

---

**Estimated Implementation Time**: 2-3 hours
**Difficulty**: Moderate (copy-paste with testing)
**Priority**: CRITICAL - Deploy within 1 week
