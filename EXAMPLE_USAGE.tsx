/**
 * Example Usage of Currency Switching Feature
 *
 * This file demonstrates various ways to use the currency feature.
 * You can copy these examples into your components.
 */

import { PriceDisplay } from '@/components/price-display';
import { useCurrency } from '@/hooks/use-currency';
import Link from 'next/link';

// ============================================================
// Example 1: Basic Price Display
// ============================================================
export function Example1_BasicPrice() {
  return (
    <div>
      <h2>Course Price</h2>
      <PriceDisplay
        price={{ usd: 299, ngn: 450000 }}
      />
      {/* Output in Nigeria: ₦450,000 NGN */}
      {/* Output elsewhere: $299 USD */}
    </div>
  );
}

// ============================================================
// Example 2: Price Without Currency Label
// ============================================================
export function Example2_NoCurrencyLabel() {
  return (
    <div className="text-2xl font-bold text-red-600">
      <PriceDisplay
        price={{ usd: 99, ngn: 150000 }}
        showCurrency={false}
      />
      {/* Output in Nigeria: ₦150,000 */}
      {/* Output elsewhere: $99 */}
    </div>
  );
}

// ============================================================
// Example 3: Custom Styled Price
// ============================================================
export function Example3_CustomStyling() {
  return (
    <div>
      <h3>Premium Course</h3>
      <PriceDisplay
        price={{ usd: 649, ngn: 980000 }}
        className="text-3xl font-extrabold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent"
        showCurrency={false}
      />
    </div>
  );
}

// ============================================================
// Example 4: Access Currency Information
// ============================================================
export function Example4_CurrencyInfo() {
  const { currency, symbol, isLoading } = useCurrency();

  if (isLoading) {
    return <div>Detecting location...</div>;
  }

  return (
    <div>
      <p>Current Currency: {currency}</p>
      <p>Symbol: {symbol}</p>
      <p>You are viewing prices in {currency === 'NGN' ? 'Nigerian Naira' : 'US Dollars'}</p>
    </div>
  );
}

// ============================================================
// Example 5: Price in Button Text
// ============================================================
export function Example5_PriceInButton() {
  return (
    <button className="px-6 py-3 bg-red-600 text-white rounded-lg">
      Enroll Now - <PriceDisplay
        price={{ usd: 199, ngn: 300000 }}
        showCurrency={false}
        className="inline"
      />
    </button>
  );
}

// ============================================================
// Example 6: Conditional Rendering Based on Currency
// ============================================================
export function Example6_ConditionalRender() {
  const { currency } = useCurrency();

  return (
    <div>
      {currency === 'NGN' ? (
        <p>Special discount for Nigerian students!</p>
      ) : (
        <p>International pricing applies</p>
      )}
    </div>
  );
}

// ============================================================
// Example 7: Manual Currency Switcher
// ============================================================
export function Example7_ManualSwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div>
      <p>Current: {currency}</p>
      <div className="flex gap-2">
        <button
          onClick={() => setCurrency('USD')}
          className={`px-4 py-2 rounded ${currency === 'USD' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          USD ($)
        </button>
        <button
          onClick={() => setCurrency('NGN')}
          className={`px-4 py-2 rounded ${currency === 'NGN' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          NGN (₦)
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Example 8: Price Comparison Table
// ============================================================
export function Example8_PriceTable() {
  const courses = [
    { name: 'React Basics', price: { usd: 199, ngn: 300000 } },
    { name: 'Advanced JS', price: { usd: 299, ngn: 450000 } },
    { name: 'Full Stack', price: { usd: 649, ngn: 980000 } },
  ];

  return (
    <table>
      <thead>
        <tr>
          <th>Course</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        {courses.map((course) => (
          <tr key={course.name}>
            <td>{course.name}</td>
            <td>
              <PriceDisplay price={course.price} showCurrency={false} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ============================================================
// Example 9: Price Range Display
// ============================================================
export function Example9_PriceRange() {
  return (
    <div>
      <p>Courses from</p>
      <PriceDisplay
        price={{ usd: 69, ngn: 105000 }}
        showCurrency={false}
      />
      <span> to </span>
      <PriceDisplay
        price={{ usd: 649, ngn: 980000 }}
        showCurrency={false}
      />
    </div>
  );
}

// ============================================================
// Example 10: Complete Product Card
// ============================================================
export function Example10_ProductCard() {
  const { currency, symbol } = useCurrency();

  const course = {
    title: 'React Crash Course',
    description: 'Master React in 5 days',
    price: { usd: 299, ngn: 450000 },
    discount: { usd: 249, ngn: 375000 },
  };

  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-xl font-bold">{course.title}</h3>
      <p className="text-gray-600">{course.description}</p>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <PriceDisplay
            price={course.discount}
            className="text-2xl font-bold text-red-600"
            showCurrency={false}
          />
          <PriceDisplay
            price={course.price}
            className="text-lg line-through text-gray-400"
            showCurrency={false}
          />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Save {symbol}
          {currency === 'NGN'
            ? (course.price.ngn - course.discount.ngn).toLocaleString()
            : (course.price.usd - course.discount.usd).toLocaleString()}
        </p>
      </div>

      <Link href="academy/contact-us" className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
        Enroll Now
      </Link>
    </div>
  );
}
