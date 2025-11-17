# Automatic Currency Switching Feature

This feature automatically detects the user's geographical location and displays prices in the appropriate currency:
- **Nigeria (NG)**: Prices shown in Nigerian Naira (₦)
- **All other countries**: Prices shown in US Dollars ($)

## How It Works

### 1. Location Detection
The system uses the **ipapi.co** free API to detect the user's country based on their IP address.
- **No API key required**
- **Free tier**: 1,000 requests per day
- **Fallback**: Defaults to USD if detection fails

### 2. Automatic Currency Selection
On first page load, the system:
1. Detects user's location via IP address
2. Sets currency to NGN if user is in Nigeria, otherwise USD
3. Stores the currency preference in localStorage
4. Displays all prices in the selected currency

### 3. Persistent Currency
Once detected, the currency preference is saved in the browser's localStorage, so:
- No repeated API calls on subsequent visits
- Faster loading times
- User preference is maintained across sessions

## Implementation Details

### Core Files

#### **lib/geolocation.ts**
Handles IP-based location detection:
```typescript
// Detects user location and returns country code
detectUserLocation(): Promise<LocationData>

// Checks if user is in Nigeria
isNigeria(countryCode: string): boolean
```

#### **hooks/use-currency.ts**
Manages currency state with Zustand:
```typescript
// Hook that provides currency info
useCurrency() => {
  currency: 'NGN' | 'USD',
  symbol: '₦' | '$',
  isLoading: boolean,
  detectAndSetCurrency: () => Promise<void>,
  setCurrency: (currency) => void
}
```

#### **components/price-display.tsx**
Reusable component for displaying prices:
```typescript
<PriceDisplay
  price={{ usd: 299, ngn: 450000 }}
  className="text-2xl font-bold"
  showCurrency={false}
/>
```

#### **components/currency-provider.tsx**
Provider that initializes currency detection on app load.

### Data Structure

Prices are stored as objects with both USD and NGN values:
```typescript
interface PriceValue {
  usd: number;
  ngn: number;
}

// Example in course data:
price: { usd: 299, ngn: 450000 }
```

## Usage Examples

### Basic Price Display
```tsx
import { PriceDisplay } from '@/components/price-display';

<PriceDisplay
  price={{ usd: 99, ngn: 150000 }}
/>
// Output in Nigeria: ₦150,000 NGN
// Output elsewhere: $99 USD
```

### Without Currency Label
```tsx
<PriceDisplay
  price={{ usd: 299, ngn: 450000 }}
  showCurrency={false}
/>
// Output in Nigeria: ₦450,000
// Output elsewhere: $299
```

### Custom Styling
```tsx
<PriceDisplay
  price={{ usd: 649, ngn: 980000 }}
  className="text-3xl font-bold text-red-600"
  showCurrency={false}
/>
```

### Accessing Currency Info
```tsx
import { useCurrency } from '@/hooks/use-currency';

function MyComponent() {
  const { currency, symbol, isLoading } = useCurrency();

  return (
    <div>
      Current currency: {currency}
      Symbol: {symbol}
    </div>
  );
}
```

### Manual Currency Override
```tsx
import { useCurrency } from '@/hooks/use-currency';

function CurrencySwitcher() {
  const { setCurrency } = useCurrency();

  return (
    <div>
      <button onClick={() => setCurrency('USD')}>USD</button>
      <button onClick={() => setCurrency('NGN')}>NGN</button>
    </div>
  );
}
```

## Adding New Prices

When adding new courses or products, include both USD and NGN prices:

```typescript
{
  id: "new-course",
  title: "New Course",
  price: {
    usd: 199,    // Price in US Dollars
    ngn: 300000  // Price in Nigerian Naira
  },
  // ... other fields
}
```

## Customization

### Using a Different Geolocation Service

To use a different geolocation API, modify **lib/geolocation.ts**:

```typescript
export async function detectUserLocation(): Promise<LocationData> {
  // Replace with your preferred API
  const response = await fetch('https://your-api.com/location');
  const data = await response.json();

  return {
    country_code: data.countryCode,
    country_name: data.countryName,
  };
}
```

### Adding More Countries

To support more countries with specific currencies:

1. Update the currency type in **hooks/use-currency.ts**:
```typescript
export type Currency = 'NGN' | 'USD' | 'GBP' | 'EUR';
```

2. Update the detection logic:
```typescript
detectAndSetCurrency: async () => {
  const locationData = await detectUserLocation();

  let detectedCurrency: Currency;

  if (isNigeria(locationData.country_code)) {
    detectedCurrency = 'NGN';
  } else if (locationData.country_code === 'GB') {
    detectedCurrency = 'GBP';
  } else {
    detectedCurrency = 'USD';
  }

  set({ currency: detectedCurrency });
}
```

3. Update price interfaces:
```typescript
interface PriceValue {
  usd: number;
  ngn: number;
  gbp?: number;
  eur?: number;
}
```

## Performance Considerations

- **Caching**: Currency preference is cached in localStorage
- **Single API Call**: Location detection happens only once per user
- **Fallback Strategy**: Defaults to USD if detection fails
- **No Blocking**: Detection runs asynchronously without blocking UI

## Environment Variables

No environment variables are required for the basic implementation. The feature works out of the box using the free ipapi.co service.

Optional (for custom geolocation services):
```env
NEXT_PUBLIC_GEOLOCATION_API_KEY=your_api_key_here
```

## Testing

### Testing Location Detection
1. **VPN Testing**: Use a VPN to test different locations
2. **Manual Override**: Use browser console:
   ```javascript
   localStorage.setItem('currency-storage', '{"state":{"currency":"NGN"}}')
   ```

### Testing Different Currencies
```typescript
import { useCurrencyStore } from '@/hooks/use-currency';

// In browser console or test:
useCurrencyStore.getState().setCurrency('NGN'); // Switch to Naira
useCurrencyStore.getState().setCurrency('USD'); // Switch to Dollars
```

## Troubleshooting

### Prices Not Updating
- Clear localStorage: `localStorage.clear()`
- Refresh the page
- Check browser console for errors

### Location Detection Fails
- Check network connection
- Verify ipapi.co is accessible
- System automatically falls back to USD

### Currency Not Persisting
- Check if localStorage is enabled in browser
- Verify no browser extensions are blocking storage
- Check privacy/incognito mode settings

## API Rate Limits

**ipapi.co Free Tier**:
- 1,000 requests per day
- No API key required
- Automatic IP-based detection

Since currency preference is cached, each user triggers only ONE API call, making this solution scalable for most applications.
