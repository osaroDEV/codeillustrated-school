# Currency Feature Testing Guide

## Overview
This guide provides step-by-step instructions for testing the automatic currency switching feature.

## Test Scenarios

### Test 1: Initial Load (Nigeria)

**Objective:** Verify automatic detection works for Nigerian users

**Steps:**
1. Use a VPN to connect to Nigeria (or any Nigerian IP)
2. Open browser DevTools (F12)
3. Clear localStorage:
   ```javascript
   localStorage.clear();
   ```
4. Refresh the page
5. Check Console for location detection
6. Verify all prices show in Naira (₦)

**Expected Results:**
- Prices display with ₦ symbol
- Numbers formatted as Nigerian Naira
- Example: ₦450,000 (not $299)

**Verify on:**
- [ ] Homepage course cards
- [ ] Individual course detail pages
- [ ] All price displays throughout the site

---

### Test 2: Initial Load (Non-Nigeria)

**Objective:** Verify automatic detection works for international users

**Steps:**
1. Disconnect VPN (or use non-Nigerian VPN)
2. Open browser DevTools (F12)
3. Clear localStorage:
   ```javascript
   localStorage.clear();
   ```
4. Refresh the page
5. Check Console for location detection
6. Verify all prices show in US Dollars ($)

**Expected Results:**
- Prices display with $ symbol
- Numbers formatted as US Dollars
- Example: $299 (not ₦450,000)

**Verify on:**
- [ ] Homepage course cards
- [ ] Individual course detail pages
- [ ] All price displays throughout the site

---

### Test 3: Persistent Currency

**Objective:** Verify currency preference persists across sessions

**Steps:**
1. Complete Test 1 or Test 2
2. Note the currency displayed
3. Close browser completely
4. Reopen browser
5. Navigate to the site
6. Verify same currency displays immediately

**Expected Results:**
- No loading delay
- Same currency as before
- No API call made (check Network tab)
- localStorage contains currency preference

**Check localStorage:**
```javascript
// In browser console
JSON.parse(localStorage.getItem('currency-storage'))
// Should show: { state: { currency: 'NGN' or 'USD', ... } }
```

---

### Test 4: Manual Currency Override

**Objective:** Test manual currency switching

**Steps:**
1. Open browser console
2. Get current currency:
   ```javascript
   useCurrencyStore.getState().currency
   ```
3. Switch to NGN:
   ```javascript
   useCurrencyStore.getState().setCurrency('NGN')
   ```
4. Refresh page
5. Verify prices in Naira
6. Switch to USD:
   ```javascript
   useCurrencyStore.getState().setCurrency('USD')
   ```
7. Refresh page
8. Verify prices in Dollars

**Expected Results:**
- Currency changes immediately after setCurrency
- Change persists after page refresh
- All prices update correctly

---

### Test 5: Price Display Component

**Objective:** Verify PriceDisplay component works correctly

**Test Cases:**

#### A. With Currency Label
```tsx
<PriceDisplay price={{ usd: 299, ngn: 450000 }} />
```
**Expected:** `$299 USD` or `₦450,000 NGN`

#### B. Without Currency Label
```tsx
<PriceDisplay price={{ usd: 299, ngn: 450000 }} showCurrency={false} />
```
**Expected:** `$299` or `₦450,000`

#### C. Custom Styling
```tsx
<PriceDisplay
  price={{ usd: 299, ngn: 450000 }}
  className="text-3xl font-bold text-red-600"
  showCurrency={false}
/>
```
**Expected:** Large, bold, red price text

---

### Test 6: Network Failure Handling

**Objective:** Verify graceful fallback when geolocation fails

**Steps:**
1. Open DevTools → Network tab
2. Enable "Offline" mode
3. Clear localStorage
4. Refresh page
5. Verify fallback behavior

**Expected Results:**
- Defaults to USD currency
- No errors in console
- Site remains functional
- Prices display correctly in USD

---

### Test 7: Loading States

**Objective:** Verify loading indicators work

**Steps:**
1. Clear localStorage
2. Add artificial delay to test loading:
   ```javascript
   // Temporarily add to geolocation.ts for testing
   await new Promise(resolve => setTimeout(resolve, 3000));
   ```
3. Refresh page
4. Observe loading behavior

**Expected Results:**
- UI doesn't break during detection
- Prices display immediately (with cached or default currency)
- No layout shift or flicker

---

### Test 8: Cross-Browser Compatibility

**Objective:** Verify works across different browsers

**Browsers to Test:**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

**Test Each:**
1. Clear data/cache
2. Load site
3. Verify currency detection
4. Check localStorage persistence
5. Test manual switching

---

### Test 9: Course Data Integrity

**Objective:** Verify all courses have both USD and NGN prices

**Steps:**
1. Open course store: `store/course-store.ts`
2. Verify each course has:
   ```typescript
   price: { usd: number, ngn: number }
   ```
3. Check for missing or invalid prices

**Automated Check:**
```javascript
// Run in browser console
const { courses } = useCourseStore.getState();
const invalid = courses.filter(c =>
  !c.price.usd || !c.price.ngn ||
  typeof c.price.usd !== 'number' ||
  typeof c.price.ngn !== 'number'
);
console.log('Invalid prices:', invalid);
// Should be empty array
```

---

### Test 10: Performance

**Objective:** Verify no performance degradation

**Metrics to Check:**
- [ ] First load time < 2s
- [ ] Subsequent loads < 500ms
- [ ] No layout shift (CLS = 0)
- [ ] API call only on first visit
- [ ] No blocked rendering

**Tools:**
- Chrome DevTools → Performance
- Lighthouse audit
- Network tab monitoring

---

## Automated Testing Script

Copy this into browser console for quick verification:

```javascript
// Quick Currency Test Suite
async function testCurrency() {
  console.log('🧪 Starting Currency Tests...\n');

  // Test 1: Check currency store
  const store = useCurrencyStore.getState();
  console.log('✓ Currency:', store.currency);
  console.log('✓ Detected:', store.isDetected);

  // Test 2: Check localStorage
  const stored = JSON.parse(localStorage.getItem('currency-storage'));
  console.log('✓ Stored currency:', stored?.state?.currency);

  // Test 3: Check all courses have prices
  const { courses } = useCourseStore.getState();
  const invalid = courses.filter(c => !c.price?.usd || !c.price?.ngn);
  console.log('✓ Courses checked:', courses.length);
  console.log('✓ Invalid prices:', invalid.length);

  // Test 4: Switch currency
  console.log('\n🔄 Testing currency switch...');
  const original = store.currency;
  const newCurrency = original === 'USD' ? 'NGN' : 'USD';
  store.setCurrency(newCurrency);
  console.log('✓ Switched to:', newCurrency);

  // Switch back
  setTimeout(() => {
    store.setCurrency(original);
    console.log('✓ Switched back to:', original);
    console.log('\n✅ All tests passed!');
  }, 1000);
}

// Run tests
testCurrency();
```

---

## Common Issues & Solutions

### Issue: Currency always shows USD
**Solution:**
1. Check VPN connection
2. Clear localStorage and refresh
3. Check network tab for API call
4. Verify ipapi.co is accessible

### Issue: Prices not updating after currency change
**Solution:**
1. Ensure page refresh after setCurrency
2. Check React DevTools for component re-renders
3. Verify useCurrency hook is being called

### Issue: localStorage not persisting
**Solution:**
1. Check browser privacy settings
2. Disable incognito/private mode
3. Check for extensions blocking localStorage
4. Verify localStorage quota not exceeded

### Issue: API rate limit reached
**Solution:**
1. ipapi.co free tier: 1,000 requests/day
2. Clear localStorage to reduce repeated calls
3. Consider upgrading ipapi.co plan
4. Check for infinite loops in detection code

---

## Test Checklist

Before deploying to production:

- [ ] Nigerian IP shows NGN currency
- [ ] Non-Nigerian IP shows USD currency
- [ ] Currency persists after browser restart
- [ ] Manual override works
- [ ] All courses have both prices
- [ ] No console errors
- [ ] Network failure handled gracefully
- [ ] Works in all major browsers
- [ ] Mobile responsive
- [ ] Performance metrics acceptable
- [ ] No layout shift during detection
- [ ] API only called once per user

---

## Test Data

Use these test IPs for manual testing (if needed):

**Nigeria:**
- VPN: Use any Nigerian VPN server
- Manual: Set localStorage manually (see Test 4)

**USA:**
- No VPN (default)
- Manual: Set localStorage manually (see Test 4)

---

## Reporting Issues

When reporting bugs, include:

1. **Browser:** Chrome 120, Safari 17, etc.
2. **Location:** Nigeria, USA, etc.
3. **localStorage value:**
   ```javascript
   localStorage.getItem('currency-storage')
   ```
4. **Current currency:**
   ```javascript
   useCurrencyStore.getState().currency
   ```
5. **Console errors:** Screenshots
6. **Network tab:** API calls made
7. **Steps to reproduce:** Detailed steps

---

## Next Steps

After testing:

1. ✅ Verify all tests pass
2. ✅ Document any issues found
3. ✅ Fix issues and retest
4. ✅ Perform final UAT (User Acceptance Testing)
5. ✅ Deploy to production
6. ✅ Monitor production metrics
7. ✅ Collect user feedback
