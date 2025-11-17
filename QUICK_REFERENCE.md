# Currency Feature - Quick Reference Card

## 🚀 Quick Start

### Display a Price
```tsx
<PriceDisplay price={{ usd: 299, ngn: 450000 }} />
```

### Get Currency Info
```tsx
const { currency, symbol } = useCurrency();
```

---

## 📦 Core Components

### `<PriceDisplay>`
```tsx
<PriceDisplay
  price={{ usd: 299, ngn: 450000 }}
  className="text-2xl"
  showCurrency={false}
/>
```

**Props:**
- `price: { usd: number, ngn: number }` - Required
- `className?: string` - Optional styling
- `showCurrency?: boolean` - Show/hide currency code (default: true)

---

## 🎣 Hooks

### `useCurrency()`
```tsx
const {
  currency,              // 'NGN' | 'USD'
  symbol,                // '₦' | '$'
  isLoading,             // boolean
  detectAndSetCurrency,  // () => Promise<void>
  setCurrency            // (currency: Currency) => void
} = useCurrency();
```

---

## 💾 Data Structure

### Price Object
```typescript
interface PriceValue {
  usd: number;
  ngn: number;
}

// Example
const price: PriceValue = {
  usd: 299,
  ngn: 450000
};
```

---

## 🔧 Common Patterns

### 1. Basic Display
```tsx
<PriceDisplay price={{ usd: 99, ngn: 150000 }} />
```
**Output:** `$99 USD` or `₦150,000 NGN`

### 2. No Currency Label
```tsx
<PriceDisplay price={{ usd: 99, ngn: 150000 }} showCurrency={false} />
```
**Output:** `$99` or `₦150,000`

### 3. Styled Price
```tsx
<PriceDisplay
  price={{ usd: 299, ngn: 450000 }}
  className="text-3xl font-bold text-red-600"
  showCurrency={false}
/>
```

### 4. In Button
```tsx
<button>
  Buy Now - <PriceDisplay price={{ usd: 99, ngn: 150000 }} showCurrency={false} />
</button>
```

### 5. Manual Currency Switch
```tsx
const { setCurrency } = useCurrency();

<button onClick={() => setCurrency('NGN')}>₦ NGN</button>
<button onClick={() => setCurrency('USD')}>$ USD</button>
```

### 6. Conditional Content
```tsx
const { currency } = useCurrency();

{currency === 'NGN' && <p>Special offer for Nigeria!</p>}
```

---

## 📍 How It Works

1. **First Visit:**
   - Detects country via IP (ipapi.co)
   - Sets currency: NG → NGN, Others → USD
   - Saves to localStorage

2. **Return Visit:**
   - Loads from localStorage
   - No API call needed

3. **Display:**
   - `<PriceDisplay>` shows correct price
   - Automatic symbol and formatting

---

## 🛠 Installation

Already installed! Just use:
```tsx
import { PriceDisplay } from '@/components/price-display';
import { useCurrency } from '@/hooks/use-currency';
```

---

## 🌍 Detection Logic

- **Nigeria (NG)** → Naira (₦)
- **All Others** → US Dollar ($)
- **Fallback** → USD (if detection fails)

---

## 💡 Tips

1. **Always provide both prices:**
   ```tsx
   price: { usd: 299, ngn: 450000 }
   ```

2. **No API keys needed** - Works out of the box

3. **Cached** - Only 1 API call per user ever

4. **Fast** - No UI blocking or delays

5. **Test with VPN** - Clear localStorage first

---

## 🐛 Debug

### Clear Cache
```javascript
localStorage.clear();
location.reload();
```

### Force Currency
```javascript
// Set to Naira
localStorage.setItem('currency-storage', '{"state":{"currency":"NGN"}}')

// Set to USD
localStorage.setItem('currency-storage', '{"state":{"currency":"USD"}}')
```

### Check Current
```javascript
useCurrencyStore.getState().currency
```

---

## 📊 Conversion Rates Used

| USD | NGN |
|-----|-----|
| $69 | ₦105,000 |
| $99 | ₦150,000 |
| $199 | ₦300,000 |
| $299 | ₦450,000 |
| $649 | ₦980,000 |

Rate: ~₦1,500 per $1

---

## 📁 Key Files

```
lib/geolocation.ts              # Location detection
hooks/use-currency.ts           # Currency state
components/price-display.tsx    # Display component
components/currency-provider.tsx # Auto-init provider
```

---

## ✅ Checklist

- [x] Import PriceDisplay
- [x] Add both usd and ngn prices
- [x] Use PriceDisplay component
- [x] CurrencyProvider in layout.tsx
- [x] Test with different locations
- [x] No environment variables needed

---

## 🔗 More Info

- Full docs: `CURRENCY_FEATURE.md`
- Examples: `EXAMPLE_USAGE.tsx`
- Summary: `IMPLEMENTATION_SUMMARY.md`
