import React, { useState, useEffect } from 'react';
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
  const [autoPopulatedFields, setAutoPopulatedFields] = useState<string[]>([]);

  // Auto-populate form from URL parameters
  useEffect(() => {
    const autoPopulateForm = () => {
      const urlParams = new URLSearchParams(window.location.search);
      console.log('🔍 Auto-population: URL params found:', Object.fromEntries(urlParams.entries()));
      console.log('🚀 Version: 1.0.2 - Auto-population active');
      
      // Field mappings for URL parameters to form fields
      const fieldMappings: { [key: string]: keyof FormData } = {
        // Name handling - split full name into first and last
        'name': 'firstName', // Will be handled specially
        'firstName': 'firstName',
        'first-name': 'firstName',
        'fname': 'firstName',
        'first_name': 'firstName',
        'lastName': 'lastName',
        'last-name': 'lastName',
        'lname': 'lastName',
        'last_name': 'lastName',
        'email': 'email',
        'Email': 'email',
        'primaryEmail': 'email',
        'guest-email': 'email',
        'phone': 'phone',
        'phoneNumber': 'phone',
        'phone-number': 'phone',
        'Phone Number': 'phone',
        'date': 'desiredDate',
        'eventDate': 'desiredDate',
        'desired-date': 'desiredDate',
        'Desired Date': 'desiredDate',
        'guests': 'guestCount',
        'guestCount': 'guestCount',
        'estimated-guest-count': 'guestCount',
        'Estimated Guest Count': 'guestCount',
        'message': 'message',
        'Message': 'message',
        'notes': 'message',
        'description': 'message',
        'leadStage': 'leadStage',
        'lead-stage': 'leadStage',
        'stage': 'leadStage'
      };
      
      const populatedFields: string[] = [];
      const newFormData = { ...formData };
      
      // Auto-populate each field
      Object.keys(fieldMappings).forEach(param => {
        const value = urlParams.get(param);
        if (value && value.trim()) {
          const formField = fieldMappings[param];
          if (formField) {
            // Special handling for name parameter - split into first and last
            if (param === 'name') {
              const nameParts = value.trim().split(' ');
              if (nameParts.length >= 2) {
                newFormData.firstName = nameParts[0];
                newFormData.lastName = nameParts.slice(1).join(' ');
                populatedFields.push('firstName', 'lastName');
              } else {
                newFormData.firstName = value.trim();
                populatedFields.push('firstName');
              }
            }
            // Special handling for leadStage to ensure valid values
            else if (formField === 'leadStage') {
              const trimmedValue = value.trim().toLowerCase();
              console.log('🔍 Auto-population: Processing leadStage value:', value, '→ trimmed:', trimmedValue);
              
              // Check for "Hot - Manual Reply" variations first
              if (trimmedValue === 'hot - manual reply' || 
                  trimmedValue === 'hot-manual' || 
                  trimmedValue === 'hot_manual' ||
                  trimmedValue === 'hot_manual_reply' ||
                  trimmedValue.includes('manual') ||
                  trimmedValue.includes('reply')) {
                newFormData[formField] = 'Hot - Manual Reply' as 'Hot' | 'Hot - Manual Reply';
                populatedFields.push(formField);
                console.log('✅ Auto-population: Set leadStage to "Hot - Manual Reply"');
              } 
              // Check for "Hot" (exact match)
              else if (trimmedValue === 'hot') {
                newFormData[formField] = 'Hot' as 'Hot' | 'Hot - Manual Reply';
                populatedFields.push(formField);
                console.log('✅ Auto-population: Set leadStage to "Hot"');
              } 
              // Default to "Hot" for any other value
              else {
                console.log('⚠️ Auto-population: Unknown leadStage value:', value, '- using default "Hot"');
                newFormData[formField] = 'Hot' as 'Hot' | 'Hot - Manual Reply';
                populatedFields.push(formField);
              }
            } else if (formField === 'guestCount') {
              // Handle guest count - keep exact value as entered
              const guestValue = value.trim();
              if (guestValue) {
                newFormData[formField] = guestValue;
                populatedFields.push(formField);
              }
            } else {
              newFormData[formField] = value.trim();
              populatedFields.push(formField);
            }
          }
        }
      });
      
      // Update form data if any fields were populated
      if (populatedFields.length > 0) {
        console.log('✅ Auto-population: Populated fields:', populatedFields);
        console.log('✅ Auto-population: New form data:', newFormData);
        setFormData(newFormData);
        setAutoPopulatedFields(populatedFields);
        showAutoPopulateMessage(populatedFields.length);
      } else {
        console.log('❌ Auto-population: No fields were populated');
      }
    };

    autoPopulateForm();
  }, []); // Run only once on component mount

  // Debug function - call this in console to see what fields are available
  const debugFormFields = () => {
    console.log('=== Available Form Fields ===');
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((field, index) => {
      const element = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const placeholder = 'placeholder' in element ? element.placeholder : '';
      console.log(`${index + 1}. Type: ${element.type || element.tagName}, ID: "${element.id}", Name: "${element.name}", Placeholder: "${placeholder}"`);
    });
    
    console.log('\n=== Available Labels ===');
    const labels = document.querySelectorAll('label');
    labels.forEach((label, index) => {
      console.log(`${index + 1}. Text: "${label.textContent?.trim()}", For: "${label.getAttribute('for')}"`);
    });
  };

  // Make debug function available globally
  (window as any).debugFormFields = debugFormFields;

  // Show success message for auto-population
  const showAutoPopulateMessage = (fieldsCount: number) => {
    // Remove any existing messages
    const existingMessage = document.getElementById('auto-populate-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // Create success message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'auto-populate-message';
    messageDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-weight: bold;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 16px; margin-bottom: 5px;">✅ Form Auto-Populated!</div>
            <div style="font-size: 12px; opacity: 0.9;">${fieldsCount} field(s) filled from email</div>
          </div>
          <button onclick="document.getElementById('auto-populate-message').remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            margin-left: 15px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
          ">×</button>
        </div>
      </div>
    `;
    
    // Add CSS animation
    if (!document.getElementById('auto-populate-styles')) {
      const style = document.createElement('style');
      style.id = 'auto-populate-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (messageDiv.parentElement) {
        messageDiv.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
          if (messageDiv.parentElement) {
            messageDiv.remove();
          }
        }, 300);
      }
    }, 8000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate essential fields before proceeding
    const validationErrors: string[] = [];
    
    // Check if essential fields are filled
    if (!formData.firstName.trim()) {
      validationErrors.push('First Name is required');
    }
    
    if (!formData.lastName.trim()) {
      validationErrors.push('Last Name is required');
    }
    
    if (!formData.email.trim()) {
      validationErrors.push('Email is required');
    } else {
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        validationErrors.push('Please enter a valid email address');
      }
    }
    
    // If there are validation errors, show them and stop submission
    if (validationErrors.length > 0) {
      setSubmitStatus('error');
      setStatusMessage(validationErrors.join('. '));
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setStatusMessage('');

    // Get EST time
    const now = new Date();
    const estTime = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false }); // HH:mm:ss
    const estDateTimeISO = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/New_York' })
    ).toISOString();

    // Format phone number for Klaviyo (add +1 if it's a US number)
    const formatPhoneForKlaviyo = (phone: string) => {
      if (!phone) return phone;
      // Remove all non-digits
      const digits = phone.replace(/\D/g, '');
      // If it's 10 digits, assume it's a US number and add +1
      if (digits.length === 10) {
        return `+1${digits}`;
      }
      // If it already starts with +, return as is
      if (phone.startsWith('+')) {
        return phone;
      }
      // Otherwise, return the original
      return phone;
    };

    // Validate phone number (basic US mobile validation)
    const validatePhoneNumber = (phone: string) => {
      if (!phone) return true; // Phone is optional
      const digits = phone.replace(/\D/g, '');
      // Check if it's a valid US mobile number (10 digits, starts with valid area code)
      if (digits.length === 10) {
        // Basic check for valid US area codes (this is a simplified check)
        const areaCode = parseInt(digits.substring(0, 3));
        // Most US area codes are between 200-999, but some specific ones are invalid
        if (areaCode >= 200 && areaCode <= 999) {
          // Additional check: avoid obviously fake/test numbers
          // Check if it's a common test pattern (like 999, 888, etc.)
          if (areaCode === 999 || areaCode === 888 || areaCode === 777) {
            return false;
          }
          return true;
        }
      }
      return false;
    };

    const formattedPhone = formatPhoneForKlaviyo(formData.phone);
    const isPhoneValid = validatePhoneNumber(formData.phone);

    try {
      // Step 1: Send to Zapier webhook
      const zapierUrl = process.env.NODE_ENV === 'production' 
        ? '/api/zapier' 
        : 'http://localhost:4000/api/zapier';
        
      const zapierResponse = await fetch(zapierUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          source: 'WeddingPro/The Knot',
          submissionDate: estDateTimeISO,
          submissionTime: estTime,
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
        formData.leadStage,
        formattedPhone
      );

      if (!profileResult.success) {
        throw new Error(`Klaviyo profile error: ${profileResult.error}`);
      }

      // Step 3: Update phone number if we have one and it's valid
      if (formattedPhone && profileResult.profileId && isPhoneValid) {
        const phoneResult = await klaviyoService.updateProfilePhone(
          profileResult.profileId,
          formattedPhone
        );

        if (!phoneResult.success && phoneResult.code !== 409) {
          // Don't fail completely for phone conflicts, just warn
          console.warn('Phone update warning:', phoneResult.error);
        }
      } else if (formData.phone && !isPhoneValid) {
        console.warn('Phone number appears to be invalid or a landline:', formData.phone);
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
          <h1 className="text-3xl font-gilda text-text mb-2">
            Milea Estate Manual Lead Entry
          </h1>
          <p className="text-accent">
            Enter WeddingPro and The Knot leads manually
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-form rounded-lg shadow-md p-8 border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-text mb-2">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-text placeholder:text-accent ${
                  autoPopulatedFields.includes('firstName') 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-border'
                }`}
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-text mb-2">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-text placeholder:text-accent ${
                  autoPopulatedFields.includes('lastName') 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-border'
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-text placeholder:text-accent ${
                  autoPopulatedFields.includes('email') 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-border'
                }`}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-text mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-text placeholder:text-accent ${
                  autoPopulatedFields.includes('phone') 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-border'
                }`}
              />
            </div>

            {/* Desired Date */}
            <div>
              <label htmlFor="desiredDate" className="block text-sm font-medium text-text mb-2">
                Desired Date
              </label>
              <input
                type="date"
                id="desiredDate"
                name="desiredDate"
                value={formData.desiredDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-text placeholder:text-accent ${
                  autoPopulatedFields.includes('desiredDate') 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-border'
                }`}
              />
            </div>

            {/* Guest Count */}
            <div>
              <label htmlFor="guestCount" className="block text-sm font-medium text-text mb-2">
                Estimated Guest Count
              </label>
              <input
                type="text"
                id="guestCount"
                name="guestCount"
                value={formData.guestCount}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-text placeholder:text-accent ${
                  autoPopulatedFields.includes('guestCount') 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-border'
                }`}
              />
            </div>
          </div>

          {/* Lead Stage Dropdown */}
          <div className="mt-6">
            <label htmlFor="leadStage" className="block text-sm font-medium text-text mb-2">
              Lead Stage *
            </label>
            <select
              id="leadStage"
              name="leadStage"
              value={formData.leadStage}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-text ${
                autoPopulatedFields.includes('leadStage') 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-border'
              }`}
            >
              <option value="Hot">Hot</option>
              <option value="Hot - Manual Reply">Hot - Manual Reply</option>
            </select>
          </div>

          {/* Message */}
          <div className="mt-6">
            <label htmlFor="message" className="block text-sm font-medium text-text mb-2">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-text placeholder:text-accent ${
                autoPopulatedFields.includes('message') 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-border'
              }`}
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