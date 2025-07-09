const KLAVIYO_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api/klaviyo' 
  : 'http://localhost:4000/api/klaviyo';
const KLAVIYO_LIST_ID = 'QQSfkG';

// Interface for Klaviyo profile structure (used for type safety)
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
  async createOrGetProfile(email: string, firstName?: string, lastName?: string, leadStage?: string, phone?: string): Promise<CreateProfileResponse> {
    try {
      const response = await fetch(`${KLAVIYO_BASE_URL}/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: {
              email: email,
              ...(firstName && { first_name: firstName }),
              ...(lastName && { last_name: lastName }),
              ...(phone && { phone_number: phone }),
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

      // If duplicate, update the profile with latest info
      if (responseData?.errors?.[0]?.meta?.duplicate_profile_id && profileId) {
        await klaviyoService.updateProfile(profileId, firstName, lastName, phone);
      }

      // Subscribe to list if profile was created or found
      if (profileId) {
        await klaviyoService.subscribeToList(profileId, email);
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

  async subscribeToList(profileId: string, email: string): Promise<void> {
    try {
      await fetch(`${KLAVIYO_BASE_URL}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listId: KLAVIYO_LIST_ID,
          profileId
        })
      });
    } catch (error) {
      console.error('Klaviyo subscribeToList error:', error);
    }
  },



  async updateProfile(profileId: string, firstName?: string, lastName?: string, phone?: string): Promise<void> {
    try {
      const attributes: any = {};
      if (firstName) attributes.first_name = firstName;
      if (lastName) attributes.last_name = lastName;
      if (phone) {
        // Format phone for Klaviyo
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 10) {
          attributes.phone_number = `+1${digits}`;
        } else if (phone.startsWith('+')) {
          attributes.phone_number = phone;
        } else {
          attributes.phone_number = phone;
        }
      }
      await fetch(`${KLAVIYO_BASE_URL}/profiles/${profileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            id: profileId,
            attributes
          }
        })
      });
    } catch (error) {
      console.error('Klaviyo updateProfile error:', error);
    }
  },

  async updateProfilePhone(profileId: string, phoneNumber: string): Promise<UpdatePhoneResponse> {
    try {
      const response = await fetch(`${KLAVIYO_BASE_URL}/profiles/${profileId}`, {
        method: 'PATCH',
        headers: {
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