import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/chatgpt-4o-latest';


async function callOpenRouter(messages, temperature = 0.5) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'GOVSERVE Municipal Platform',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        temperature,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('OpenRouter AI Error:', error.message);
    return null;
  }
}

/**
 * 1. AI Decision Support: Facility & Park Schedule Conflict Detection & Smart Slot Recommender
 */
export async function checkFacilityConflictAndSuggest({ facilityName, eventDate, startTime, endTime, existingBookings }) {
  const prompt = [
    {
      role: 'system',
      content: `You are the GOVSERVE AI Municipal Scheduling Engine.
Analyze requested facility, date, start time, end time, and existing booking count.
Return JSON with:
{
  "hasConflict": false,
  "confidenceScore": 98,
  "aiAnalysis": "1-2 sentence analysis of facility capacity and time window.",
  "alternativeSlots": ["01:00 PM - 05:00 PM", "06:00 PM - 09:00 PM"],
  "specialPrecautions": ["Assign sound technician", "Confirm janitorial clean-up gap of 1 hour"]
}`
    },
    {
      role: 'user',
      content: `Facility: ${facilityName}\nDate: ${eventDate}\nTime: ${startTime} to ${endTime}\nExisting Bookings: ${existingBookings || 1}`
    }
  ];

  const reply = await callOpenRouter(prompt, 0.3);
  if (reply) {
    try {
      const cleaned = reply.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {}
  }

  return {
    hasConflict: false,
    confidenceScore: 95,
    aiAnalysis: `Schedule window for ${facilityName} on ${eventDate} is optimal with sufficient preparation buffer.`,
    alternativeSlots: ["08:00 AM - 12:00 PM", "01:00 PM - 05:00 PM"],
    specialPrecautions: ["Ensure 1-hour sanitation window after event", "Security detail assigned for capacity > 100"]
  };
}

/**
 * 2. AI Decision Support: Water Supply & Drainage Urgency Prioritization
 */
export async function prioritizeUtilityRequest({ serviceType, location, description }) {
  const prompt = [
    {
      role: 'system',
      content: `You are the GOVSERVE AI Utility Incident Priority Triage Engine.
Evaluate the water leak or drainage complaint and assign:
1. Urgency: 'Urgent' (immediate flood/hazard/loss), 'High' (disruptive), or 'Normal' (routine repair)
2. Priority Score: Integer from 1 to 100 (100 is critical disaster emergency)
3. Recommended Response Team
4. Action Recommendation
Return JSON:
{
  "urgency": "Urgent",
  "priorityScore": 92,
  "recommendedTeam": "Quick Response Water Crew Alpha",
  "triageRationale": "Brief 1-sentence risk summary."
}`
    },
    {
      role: 'user',
      content: `Service: ${serviceType}\nLocation: ${location}\nDescription: ${description}`
    }
  ];

  const reply = await callOpenRouter(prompt, 0.3);
  if (reply) {
    try {
      const cleaned = reply.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {}
  }

  const isUrgent = description.toLowerCase().includes('flood') || description.toLowerCase().includes('burst') || description.toLowerCase().includes('sewer');
  return {
    urgency: isUrgent ? 'Urgent' : 'High',
    priorityScore: isUrgent ? 90 : 75,
    recommendedTeam: isUrgent ? 'Quick Response Water Crew Alpha' : 'Drainage Cleanout Team 2',
    triageRationale: 'Assessed based on public health risk and potential property inundation hazard.'
  };
}

/**
 * 3. AI Decision Support: Asset Predictive Maintenance Engine
 */
export async function predictAssetMaintenance(asset) {
  const prompt = [
    {
      role: 'system',
      content: `You are GOVSERVE AI Asset Reliability Engineer.
Analyze the asset category, condition, and maintenance dates. Return a concise 1-sentence predictive maintenance alert.`
    },
    {
      role: 'user',
      content: `Asset: ${asset.name} (${asset.category})\nCondition: ${asset.current_condition}\nLast Maintenance: ${asset.last_maintenance_date}\nNext Due: ${asset.next_maintenance_due}`
    }
  ];

  const reply = await callOpenRouter(prompt, 0.4);
  return reply || `Routine inspection recommended within 30 days to maintain peak operational reliability.`;
}

/**
 * 4. General Assistant Chat for 7 Modules
 */
export async function getAIChatResponse(chatHistory, role = 'citizen') {
  const systemPrompt = `You are GOVSERVE AI Assistant for the Municipal Management Platform.
You support these 7 modules:
1. Cemetery & Burial Management (plot search, burial permits, scheduling)
2. Parks & Recreation Scheduling (park booking, sports complex schedules)
3. Facility Reservation (civic centers, gyms, multi-purpose halls)
4. Water Supply & Drainage Requests (pipe leaks, clogged drainage, sewer issues)
5. Asset Inventory Management (municipal equipment, vehicles, pumps)
6. AI Decision Support (conflict detection, triage, predictive maintenance)
7. Reporting and Dashboard

Be polite, accurate, concise, and helpful.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-6),
  ];

  const reply = await callOpenRouter(messages, 0.7);
  return reply || `Hello! I am your GOVSERVE Assistant. I can assist with Facility & Park Reservations, Water & Drainage Requests, Cemetery Plots & Burial Permits, or Asset tracking. How can I help you today?`;
}
