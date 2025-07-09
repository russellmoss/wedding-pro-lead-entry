const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// CORS configuration for production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.vercel.app', 'https://your-custom-domain.com'] // Replace with your actual domains
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// Zapier proxy (existing)
app.post('/api/zapier', async (req, res) => {
  try {
    console.log('Proxy received body:', req.body);
    const zapierRes = await fetch('https://hooks.zapier.com/hooks/catch/21145311/u3kvd8u/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    const data = await zapierRes.text();
    if (!zapierRes.ok) {
      console.error('Zapier responded with error:', zapierRes.status, data);
    }
    res.status(zapierRes.status).send(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Klaviyo proxy
app.post('/api/klaviyo/profiles', async (req, res) => {
  try {
    const klaviyoRes = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
        'revision': '2024-10-15',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    const data = await klaviyoRes.text();
    if (!klaviyoRes.ok) {
      console.error('Klaviyo responded with error:', klaviyoRes.status, data);
    }
    res.status(klaviyoRes.status).send(data);
  } catch (err) {
    console.error('Klaviyo proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/klaviyo/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const klaviyoRes = await fetch(`https://a.klaviyo.com/api/profiles/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
        'revision': '2024-10-15',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    const data = await klaviyoRes.text();
    if (!klaviyoRes.ok) {
      console.error('Klaviyo responded with error:', klaviyoRes.status, data);
    }
    res.status(klaviyoRes.status).send(data);
  } catch (err) {
    console.error('Klaviyo proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Klaviyo subscribe to list
app.post('/api/klaviyo/subscribe', async (req, res) => {
  try {
    const { listId, profileId } = req.body;
    const payload = {
      data: [
        {
          type: 'profile',
          id: profileId,
          consent: ['email']
        }
      ]
    };
    console.log('Klaviyo subscribe payload:', JSON.stringify(payload));
    const klaviyoRes = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
        'revision': '2024-10-15',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await klaviyoRes.text();
    console.log('Klaviyo subscribe response status:', klaviyoRes.status);
    console.log('Klaviyo subscribe response body:', data);
    
    // Verify subscription by checking if profile is in the list
    if (klaviyoRes.status === 204) {
      console.log('Subscription successful! Verifying...');
      try {
        const verifyRes = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
          method: 'GET',
          headers: {
            'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
            'revision': '2024-10-15',
          },
        });
        const verifyData = await verifyRes.json();
        console.log('List verification response:', JSON.stringify(verifyData, null, 2));
        
        // Check if our profile is in the results
        const profileIds = verifyData.data.map((profile) => profile.id);
        if (profileIds.includes(profileId)) {
          console.log('✅ Profile found in list! Subscription confirmed.');
        } else {
          console.log('⚠️ Profile not found on first page. Checking next page...');
          // Try to check next page if available
          if (verifyData.links.next) {
            try {
              const nextRes = await fetch(verifyData.links.next, {
                headers: {
                  'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
                  'revision': '2024-10-15',
                },
              });
              const nextData = await nextRes.json();
              const nextProfileIds = nextData.data.map((profile) => profile.id);
              if (nextProfileIds.includes(profileId)) {
                console.log('✅ Profile found on next page! Subscription confirmed.');
              } else {
                console.log('⚠️ Profile not found on next page either. May be on later page or not subscribed.');
              }
            } catch (nextErr) {
              console.log('Could not check next page:', nextErr.message);
            }
          }
        }
      } catch (verifyErr) {
        console.log('Could not verify subscription:', verifyErr.message);
      }
    }
    
    if (!klaviyoRes.ok) {
      console.error('Klaviyo subscribe error:', klaviyoRes.status, data);
    }
    res.status(klaviyoRes.status).send(data);
  } catch (err) {
    console.error('Klaviyo subscribe proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));

// Export for Vercel
module.exports = app; 