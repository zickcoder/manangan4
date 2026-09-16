// ============================================================================
// PAFMS / GOVSERVE ALL-IN-ONE EDGE FUNCTION
// Platform: eProvider Edge Functions
// Slug: api
// Signature: export default async ({ method, headers, body, query }) => { return { status, body, headers } }
// ============================================================================

export default async (req) => {
  const { method = 'GET', headers = {}, body = {}, query = {} } = req;

  // CORS headers
  const resHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') {
    return { status: 200, body: { ok: true }, headers: resHeaders };
  }

  // Determine the route path from req.path, req.url, query params, or subpath
  let rawPath = (req.path || req.url || '').toString();
  if (rawPath.includes('/api/')) {
    rawPath = rawPath.split('/api/')[1];
  } else if (rawPath.startsWith('/api')) {
    rawPath = rawPath.slice(4);
  }
  const route = (query.route || query.path || query.endpoint || rawPath || '').replace(/^\//, '').split('?')[0];

  try {
    // 1. HEALTH / ECHO / TEST
    if (!route || route === 'health' || route === 'ping') {
      return {
        status: 200,
        body: {
          success: true,
          message: 'PAFMS eProvider Edge Function is running!',
          tenant_id: 'tenant_3585c0ec474d4b5b9e095046236e3cdb',
          time: new Date().toISOString()
        },
        headers: resHeaders
      };
    }

    // 2. STATS
    if (route === 'stats' && method === 'GET') {
      return {
        status: 200,
        body: {
          success: true,
          data: {
            totalFacilities: 3,
            pendingReservations: 1,
            approvedReservations: 2,
            totalCemeteryPlots: 90,
            occupiedPlots: 8,
            availablePlots: 82,
            totalBurials: 3,
            openUtilityRequests: 2,
            resolvedUtilityRequests: 0,
            totalAssets: 4,
            assetsNeedingMaintenance: 0,
            systemStatus: 'Operational (eProvider Edge Function)',
            uptime: '99.99%'
          }
        },
        headers: resHeaders
      };
    }

    // 3. FACILITIES
    if (route === 'facilities' && method === 'GET') {
      return {
        status: 200,
        body: {
          success: true,
          data: [
            {
              id: 1,
              name: 'Barangay 178 Multi-Purpose Civic Center',
              category: 'Government Facility',
              capacity: 350,
              hourly_rate: 500,
              location: 'Civic Complex, Mindanao Ave.',
              amenities: 'Central Aircon, Full PA Sound System, Stage, 300 Chairs, Generator Backup',
              status: 'Available',
              image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&auto=format&fit=crop&q=80'
            },
            {
              id: 3,
              name: 'Camarin Green Urban Recreation Park',
              category: 'Park & Recreation',
              capacity: 500,
              hourly_rate: 0,
              location: 'Camarin Road Sector 3',
              amenities: 'Jogging Trail, Children Playground, Gazebo, Covered Picnic Sheds, Solar Lights',
              status: 'Available',
              image_url: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=500&auto=format&fit=crop&q=80'
            },
            {
              id: 4,
              name: 'Purok 7 Community Amphitheater & Plaza',
              category: 'Park & Recreation',
              capacity: 400,
              hourly_rate: 250,
              location: 'Purok 7 Hillsview',
              amenities: 'Open-Air Stage, Tiered Seating, Ambient Garden Lighting, Perimeter Fence',
              status: 'Available',
              image_url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80'
            }
          ]
        },
        headers: resHeaders
      };
    }

    // 4. RESERVATIONS
    if (route === 'facilities/reservations' && method === 'POST') {
      const refNo = body.reference_no || `RES-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      return {
        status: 200,
        body: {
          success: true,
          reference_no: refNo,
          data: { ...body, reference_no: refNo, status: 'Pending Review', id: Date.now() }
        },
        headers: resHeaders
      };
    }

    // 5. UTILITY TICKETS
    if (route === 'utilities' && method === 'POST') {
      const ticketNo = body.ticket_no || `UTL-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
      return {
        status: 200,
        body: {
          success: true,
          data: { ...body, ticket_no: ticketNo, status: 'Pending', id: Date.now() }
        },
        headers: resHeaders
      };
    }

    // 6. BURIALS
    if (route === 'cemetery/burials' && method === 'POST') {
      const refNo = body.reference_no || `BUR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
      return {
        status: 200,
        body: {
          success: true,
          data: { ...body, reference_no: refNo, status: 'Approved', id: Date.now() }
        },
        headers: resHeaders
      };
    }

    // 7. TRACKING
    if (route.startsWith('track/')) {
      const code = route.replace('track/', '').trim();
      return {
        status: 200,
        body: {
          success: true,
          type: 'reservation',
          data: {
            reference_no: code,
            status: 'Approved',
            event_date: '2026-09-20',
            facility_name: 'Barangay 178 Multi-Purpose Civic Center'
          }
        },
        headers: resHeaders
      };
    }

    // DEFAULT ECHO / SUCCESS
    return {
      status: 200,
      body: {
        success: true,
        route,
        method,
        receivedBody: body,
        tenant_id: 'tenant_3585c0ec474d4b5b9e095046236e3cdb'
      },
      headers: resHeaders
    };

  } catch (err) {
    return {
      status: 500,
      body: { success: false, error: err.message || String(err) },
      headers: resHeaders
    };
  }
};
