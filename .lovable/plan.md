
## Plan

### 1. Fix reCAPTCHA OTP Issues
- Rewrite `clearRecaptcha()` to fully destroy and recreate the container DOM element
- Reset the verifier instance properly before re-sending OTP
- Remove the "Protected by reCAPTCHA" banner concern (invisible reCAPTCHA doesn't need user interaction)

### 2. Protect Customer App Routes  
- Create `CustomerProtectedRoute` component that checks `customerUser` from auth context
- Wrap all `/app/*` routes (except `/app/login`, `/app/register`, `/app/phone-login`) with this guard
- Make `/app` redirect to `/app/login` when not authenticated
- Remove "skip" button from login page

### 3. Post-Login Location Capture (Zepto-style)
- Create `/app/set-location` page with:
  - Google Maps embed showing user's pin
  - Browser Geolocation API / Capacitor GPS to get coordinates
  - Google Reverse Geocoding to show address from coordinates
  - Address fields: Apartment/Road/Area, House/Flat/Block, Landmark
  - "Save As" labels: Home, Work, Other
  - Save & Proceed button → saves to `customer_addresses` table
- After login, redirect to location page if no saved address exists
- **Note**: Google Maps API key needed from you

### 4. Razorpay Live Payment Integration
- Replace simulated payment with actual Razorpay Checkout SDK
- Load Razorpay script dynamically
- Call existing `razorpay` edge function to create order
- Open Razorpay checkout modal with live key
- Verify payment on success via edge function
- Only create order in DB after verified payment

### Questions for you:
- **Google Maps API Key**: Do you have one? I'll need it for the map and reverse geocoding
- **Razorpay Keys**: Are the `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` already configured as secrets? Are they live/production keys?
- **Social Login**: Which providers do you want working? (Google, Apple, Facebook?)
