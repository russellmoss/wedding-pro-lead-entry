# Manual Wedding Lead Entry System - Step-by-Step Guide (Updated)

## Overview
This guide will help you create a simple web page to manually input WeddingPro and The Knot leads, which will integrate with your existing Google Sheet CRM via Zapier and send data directly to Klaviyo with proper lead staging.

---

## Step 1: Initialize React Project

**Cursor.ai Prompt:**
```
Create a new React app with Tailwind CSS in the current directory. Set up the basic project structure with components folder and configure Tailwind for a winery-themed design.
```

**Commands to run:**
```bash
# Navigate to your project folder
cd C:\Users\russe\manual_wedding_leads

# Create React app
npx create-react-app . --template typescript
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Update `tailwind.config.js`:**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#8B4513', // Brown color for winery theme
        darkBrownHover: '#6B3410',
        background: '#F8F9FA',
      },
      fontFamily: {
        'gilda': ['Gilda Display', 'serif'],
      },
    },
  },
  plugins: [],
}
```

---

## Step 2: Setup Project Structure and CSS

**Cursor.ai Prompt:**
```
Replace the contents of src/index.css with the provided CSS that includes Tailwind imports, Gilda Display font, and custom button components for a winery theme.
```

**Update `src/index.css`:**
```css
@import url('https://fonts.googleapis.com/css2?family=Gilda+Display&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-background text-gray-900;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

@layer components {
  .button {
    @apply px-6 py-2 rounded-md font-medium transition-colors;
  }
  
  .button-primary {
    @apply bg-primary text-white hover:bg-darkBrownHover;
  }
  
  .button-secondary {
    @apply bg-white text-primary border-2 border-primary hover:bg-primary hover:text-white;
  }
}
```

**Create folder structure:**
```bash
mkdir src/components
mkdir src/services
```

---

## Step 3: Create Klaviyo Service

**Cursor.ai Prompt:**
```
Create a Klaviyo service file that handles creating/finding profiles and updating them with phone numbers using the Klaviyo API. Include proper error handling and TypeScript types.
```

**Create `src/services/klaviyoService.ts`:**
```typescript
const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY || 'your-klaviyo-api-key-here';
const KLAVIYO_BASE_URL = 'https://a.klaviyo.com/api';

interface KlaviyoProfile {
  id: string;
  email: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
}

interface CreateProfileResponse {
  profileId: string;
  success: boolean;
  error?: string;
}

interface UpdatePhoneResponse {
  success: boolean;
  error?: string;
  code?: number;
}

export const klaviyoService = {
  async createOrGetProfile(email: string, firstName?: string, lastName?: string, leadStage?: string): Promise<CreateProfileResponse> {
    try {
      const response = await fetch(`${KLAVIYO_BASE_URL}/profiles/`, {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
          'revision': '2024-10-15',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: {
              email: email,
              ...(firstName && { first_name: firstName }),
              ...(lastName && { last_name: lastName }),
              ...(leadStage && { 
                properties: {
                  lead_stage: leadStage
                }
              })
            }
          }
        })
      });

      const responseData = await response.json();
      
      // Get profile ID from success response or error metadata (if duplicate)
      const profileId = 
        responseData?.data?.id ||
        responseData?.errors?.[0]?.meta?.duplicate_profile_id ||
        null;

      if (profileId) {
        return {
          profileId,
          success: true
        };
      } else {
        return {
          profileId: '',
          success: false,
          error: 'Could not create or find profile'
        };
      }
    } catch (error) {
      console.error('Klaviyo profile creation error:', error);
      return {
        profileId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async updateProfilePhone(profileId: string, phoneNumber: string): Promise<UpdatePhoneResponse> {
    try {
      const response = await fetch(`${KLAVIYO_BASE_URL}/profiles/${profileId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
          'revision': '2024-10-15',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            id: profileId,
            attributes: {
              phone_number: phoneNumber
            }
          }
        })
      });

      if (response.status === 409) {
        return {
          success: false,
          error: 'Phone number already exists on another profile',
          code: 409
        };
      }

      if (response.ok) {
        return {
          success: true
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData?.errors?.[0]?.detail || 'Failed to update phone number',
          code: response.status
        };
      }
    } catch (error) {
      console.error('Klaviyo phone update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};
```

---

## Step 4: Create the Main Lead Entry Component

**Cursor.ai Prompt:**
```
Create a React component called LeadEntryForm that includes:
1. Milea Estate logo at the top (20% original size)
2. Title "Milea Estate Manual Lead Entry"
3. Form with fields: First Name, Last Name, Phone, Email, Message (textarea), Desired Date, Estimated Guest Count, and Lead Stage dropdown
4. Lead Stage dropdown with options "Hot" and "Hot - Manual Reply"
5. Submit button that sends data to Zapier webhook and Klaviyo
6. Use Tailwind classes and handle both integrations with proper error handling
```

**Create `src/components/LeadEntryForm.tsx`:**
```typescript
import React, { useState } from 'react';
import { klaviyoService } from '../services/klaviyoService';

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  message: string;
  desiredDate: string;
  guestCount: string;
  leadStage: 'Hot' | 'Hot - Manual Reply';
}

const LeadEntryForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    message: '',
    desiredDate: '',
    guestCount: '',
    leadStage: 'Hot'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setStatusMessage('');

    try {
      // Step 1: Send to Zapier webhook
      const zapierResponse = await fetch('https://hooks.zapier.com/hooks/catch/21145311/u3kvd8u/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          source: 'Manual Entry',
          submissionDate: new Date().toISOString(),
          submissionTime: new Date().toLocaleTimeString(),
          inquirySource: 'Manual Entry'
        }),
      });

      if (!zapierResponse.ok) {
        throw new Error('Failed to send to Zapier');
      }

      // Step 2: Create/get Klaviyo profile
      const profileResult = await klaviyoService.createOrGetProfile(
        formData.email,
        formData.firstName,
        formData.lastName,
        formData.leadStage
      );

      if (!profileResult.success) {
        throw new Error(`Klaviyo profile error: ${profileResult.error}`);
      }

      // Step 3: Update phone number if we have one
      if (formData.phone && profileResult.profileId) {
        const phoneResult = await klaviyoService.updateProfilePhone(
          profileResult.profileId,
          formData.phone
        );

        if (!phoneResult.success && phoneResult.code !== 409) {
          // Don't fail completely for phone conflicts, just warn
          console.warn('Phone update warning:', phoneResult.error);
        }
      }

      setSubmitStatus('success');
      setStatusMessage('Lead submitted successfully! The lead has been added to your CRM and Klaviyo, and nurturing sequences have been triggered.');
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        message: '',
        desiredDate: '',
        guestCount: '',
        leadStage: 'Hot'
      });

    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://i.imgur.com/qfTW5j0.png" 
            alt="Milea Estate Vineyard" 
            className="mx-auto mb-6"
            style={{ width: '20%', height: 'auto' }}
          />
          <h1 className="text-3xl font-gilda text-gray-900 mb-2">
            Milea Estate Manual Lead Entry
          </h1>
          <p className="text-gray-600">
            Enter WeddingPro and The Knot leads manually
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Desired Date */}
            <div>
              <label htmlFor="desiredDate" className="block text-sm font-medium text-gray-700 mb-2">
                Desired Date
              </label>
              <input
                type="date"
                id="desiredDate"
                name="desiredDate"
                value={formData.desiredDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Guest Count */}
            <div>
              <label htmlFor="guestCount" className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Guest Count
              </label>
              <input
                type="number"
                id="guestCount"
                name="guestCount"
                value={formData.guestCount}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Lead Stage Dropdown */}
          <div className="mt-6">
            <label htmlFor="leadStage" className="block text-sm font-medium text-gray-700 mb-2">
              Lead Stage *
            </label>
            <select
              id="leadStage"
              name="leadStage"
              value={formData.leadStage}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="Hot">Hot</option>
              <option value="Hot - Manual Reply">Hot - Manual Reply</option>
            </select>
          </div>

          {/* Message */}
          <div className="mt-6">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter any additional details about the inquiry..."
            />
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="button button-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Lead'}
            </button>
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
              {statusMessage}
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {statusMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LeadEntryForm;
```

---

## Step 5: Update App.tsx

**Cursor.ai Prompt:**
```
Replace the contents of App.tsx to use our LeadEntryForm component and remove the default React app content.
```

**Update `src/App.tsx`:**
```typescript
import React from 'react';
import './App.css';
import LeadEntryForm from './components/LeadEntryForm';

function App() {
  return (
    <div className="App">
      <LeadEntryForm />
    </div>
  );
}

export default App;
```

---

## Step 6: Configure Zapier Integration

**Cursor.ai Prompt:**
```
I need to configure my existing Zapier webhook to handle the manual lead entry data and ensure it maps correctly to my Google Sheet columns and triggers the same flows as other lead sources.
```

**Zapier Configuration Steps:**

1. **Your webhook is already set up:** `https://hooks.zapier.com/hooks/catch/21145311/u3kvd8u/`

2. **Configure Zapier Actions in your existing Zap:**
   - **Action 1:** Google Sheets → "Create Spreadsheet Row"
     - Map fields to match your existing columns:
       - `firstName` → First Name
       - `lastName` → Last Name
       - `email` → Email
       - `phone` → Phone
       - `message` → Message
       - `desiredDate` → Desired Date
       - `guestCount` → Guest Count
       - `leadStage` → Lead Stage
       - `source` → Inquiry Source (will be "Manual Entry")
       - `submissionDate` → Submission Date
       - `submissionTime` → Submission Time

   - **Action 2:** Send team notification email
     - Use existing email template
     - Include lead stage information

   - **Action 3:** SimpleTexting → "Add Contact to Group"
     - Map phone and name fields

   - **Action 4:** SimpleTexting → "Send SMS"
     - Use conditional logic based on `leadStage`
     - Different message templates for "Hot" vs "Hot - Manual Reply"

3. **Test the webhook:**
   - Use Zapier's webhook testing tool
   - Send a test submission from your form

---

## Step 7: Deploy to Vercel

**Cursor.ai Prompt:**
```
Help me deploy this React app to Vercel with proper build configuration and environment setup.
```

**Deployment Steps:**

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Build and test locally:**
```bash
npm run build
npm start
```

3. **Deploy to Vercel:**
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- Project name: `manual-wedding-leads`
- Directory: `./` (current directory)
- Override settings? **N**

4. **Set up custom domain (optional):**
   - In Vercel dashboard, go to your project
   - Settings → Domains
   - Add your custom domain (e.g., `leads.mileaestate.com`)

---

## Step 8: Test the Complete Integration

**Cursor.ai Prompt:**
```
Create a comprehensive test plan to verify that the manual lead entry system works correctly with both Zapier and Klaviyo integrations, including different lead stage scenarios.
```

**Testing Checklist:**

1. **Form Functionality:**
   - [ ] All form fields accept input correctly
   - [ ] Lead Stage dropdown shows both options
   - [ ] Form validation works for required fields
   - [ ] Submit button shows loading state
   - [ ] Success/error messages display correctly

2. **Zapier Integration:**
   - [ ] Webhook receives form data with all fields
   - [ ] Google Sheet row is created with correct mapping
   - [ ] Lead Stage is populated correctly
   - [ ] Team notification email is sent
   - [ ] SimpleTexting contact is added
   - [ ] Appropriate SMS is sent based on lead stage

3. **Klaviyo Integration:**
   - [ ] Profile is created in Klaviyo
   - [ ] `lead_stage` custom property is set correctly
   - [ ] Phone number is added to profile
   - [ ] First name and last name are populated
   - [ ] Handles duplicate emails gracefully

4. **Lead Stage Testing:**
   - [ ] Test with "Hot" selection
   - [ ] Test with "Hot - Manual Reply" selection
   - [ ] Verify different SMS templates are triggered
   - [ ] Confirm lead stage appears in Google Sheet

---

## Step 9: Add Error Handling and Monitoring

**Cursor.ai Prompt:**
```
Add comprehensive error handling and logging to help monitor the system and troubleshoot issues when they arise.
```

**Create `src/utils/logger.ts`:**
```typescript
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    // In production, you might want to send this to a logging service
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  }
};
```

**Update LeadEntryForm.tsx to include better error handling:**
```typescript
// Add this import at the top
import { logger } from '../utils/logger';

// Update the handleSubmit function to include better logging
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setSubmitStatus('idle');
  setStatusMessage('');

  logger.info('Starting lead submission', { email: formData.email, leadStage: formData.leadStage });

  try {
    // Step 1: Send to Zapier webhook
    logger.info('Sending to Zapier webhook');
    const zapierResponse = await fetch('https://hooks.zapier.com/hooks/catch/21145311/u3kvd8u/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData,
        source: 'Manual Entry',
        submissionDate: new Date().toISOString(),
        submissionTime: new Date().toLocaleTimeString(),
        inquirySource: 'Manual Entry'
      }),
    });

    if (!zapierResponse.ok) {
      logger.error('Zapier webhook failed', { status: zapierResponse.status });
      throw new Error('Failed to send to Zapier');
    }
    logger.info('Zapier webhook successful');

    // Rest of the function remains the same...
    // (Include the Klaviyo integration code as before)

  } catch (error) {
    logger.error('Lead submission failed', error);
    // Rest of error handling...
  }
};
```

---

## Step 10: Production Checklist

**Cursor.ai Prompt:**
```
Create a final production checklist to ensure the manual lead entry system is ready for daily use by the team.
```

**Pre-Launch Checklist:**

1. **Security:**
   - [ ] API keys are properly secured (not exposed in client-side code)
   - [ ] CORS is configured correctly
   - [ ] Form includes basic spam protection

2. **Performance:**
   - [ ] Form loads quickly
   - [ ] Submission completes within reasonable time
   - [ ] Error messages are clear and actionable

3. **Integration Testing:**
   - [ ] Test both "Hot" and "Hot - Manual Reply" scenarios
   - [ ] Verify Google Sheet data appears correctly
   - [ ] Confirm Klaviyo profiles are created properly
   - [ ] Check SMS delivery works
   - [ ] Validate team notification emails

4. **User Experience:**
   - [ ] Form is mobile-responsive
   - [ ] Logo displays at correct size
   - [ ] Success messages are encouraging
   - [ ] Error messages are helpful

5. **Monitoring:**
   - [ ] Set up alerts for failed submissions
   - [ ] Monitor Zapier task usage
   - [ ] Track Klaviyo API usage
   - [ ] Regular data quality checks

**Access Information:**
- **Production URL:** Your Vercel deployment URL
- **Zapier Webhook:** `https://hooks.zapier.com/hooks/catch/21145311/u3kvd8u/`
- **Klaviyo API:** Using environment variable `KLAVIYO_API_KEY`

Your manual lead entry system is now ready to seamlessly integrate WeddingPro and The Knot leads into your existing automated wedding sales funnel with proper lead staging!