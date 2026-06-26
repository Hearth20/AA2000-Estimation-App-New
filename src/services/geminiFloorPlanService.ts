// Groq Vision API service for floor plan security estimation
// Phase 1 Vision: qwen/qwen3.6-27b  — vision-capable, reads floor plan images
// Phase 2 BOQ:    llama-3.3-70b-versatile — large reasoning model, generates accurate quantities
// Get a free key at console.groq.com

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Vision model — supports image_url input (qwen is currently the best vision model on Groq)
const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';
// BOQ reasoning model — 70B, much better at quantity math and JSON structure
const GROQ_REASONING_MODEL = 'llama-3.3-70b-versatile';

// API key loaded from .env (VITE_GROQ_API_KEY)
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;

export const GEMINI_KEY_STORAGE = 'aa2000_groq_key'; // localStorage override key

export interface FloorPlanEstimation {
  observations: string;
  manpower: {
    role: string;
    headcount: number;
    hours: number;
    manDays: number;
  }[];
  consumables: {
    name: string;
    category: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
  }[];
  fees: {
    type: string;
    amount: number;
    description: string;
  }[];
  constraints: {
    physical: string;
    electrical: string;
    installation: string;
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMimeType(file: File): string {
  if (file.type && file.type !== '') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function isImageFile(file: File): boolean {
  const mime = getMimeType(file);
  return mime.startsWith('image/');
}

// Per-system equipment rules injected into the AI prompt
const SYSTEM_RULES: Record<string, { label: string; rules: string; exampleItems: string }> = {
  CCTV: {
    label: 'CCTV System',
    rules: `- IP Dome Camera: 1 per 80–100 sqm or per room/corridor entry point
- IP Bullet Camera: use for outdoor perimeter, parking lots, building exterior
- PTZ Camera: 1 per large open area (lobby, atrium, warehouse floor >500sqm)
- PoE Network Switch (8/16/24-port): 1 per 8–16 cameras
- NVR (Network Video Recorder): size based on camera count (8ch, 16ch, 32ch)
- Hard Disk Drive (HDD): calculate for 30-day retention at 1080p (≈1TB per 4 cameras)
- Cat6 UTP Cable: estimate total cable meters (avg 40–60m per camera + 10% slack); output unit as "meters"
- RJ45 Connectors: 2 per camera run
- Cable Tray / J-Hook: estimate in meters along ceiling runs
- Wall Mount Bracket / Dome Mount: 1 per camera
- UPS (Uninterruptible Power Supply): 1 per NVR rack`,
    exampleItems: `{ "name": "IP Dome Camera 2MP Full HD", "category": "Hardware", "quantity": 12, "unit": "pcs", "unitPrice": 0 },
    { "name": "NVR 16-Channel", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "PoE Switch 16-Port", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "HDD 4TB Surveillance Grade", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Cat6 UTP Cable", "category": "Wires & Cables", "quantity": 480, "unit": "meters", "unitPrice": 0 },
    { "name": "RJ45 Connector", "category": "Mounting Hardware", "quantity": 50, "unit": "pcs", "unitPrice": 0 }`,
  },
  FDAS: {
    label: 'FDAS / Fire Alarm System',
    rules: `- Smoke Detector (Photo-electric): 1 per 60 sqm ceiling area or per room
- Heat Detector: use in kitchens, parking, mechanical rooms (not smoke-sensitive zones)
- Manual Call Point (Break Glass / Pull Station): 1 per floor exit, max 30m spacing
- Fire Alarm Control Panel (FACP): size based on zone count (4-zone, 8-zone, 16-zone)
- Sounder / Alarm Bell: 1 per zone, spaced for 65dB coverage
- Strobe Light: 1 per zone for hearing-impaired compliance
- End-of-Line Resistor: 1 per zone circuit
- Fire Alarm Cable (2-core sheathed): estimate in meters — avg 25–40m per detector + 10% slack; unit "meters"
- Battery Backup (12V, 7Ah/17Ah): per FACP spec (typically 2 per panel)`,
    exampleItems: `{ "name": "Photoelectric Smoke Detector", "category": "Hardware", "quantity": 24, "unit": "pcs", "unitPrice": 0 },
    { "name": "Heat Detector", "category": "Hardware", "quantity": 6, "unit": "pcs", "unitPrice": 0 },
    { "name": "Manual Call Point", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "FACP 8-Zone Fire Alarm Control Panel", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Alarm Bell / Sounder", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Fire Alarm Cable 2-Core", "category": "Wires & Cables", "quantity": 350, "unit": "meters", "unitPrice": 0 }`,
  },
  ACCESS_CONTROL: {
    label: 'Access Control System',
    rules: `- Card Reader (Proximity / RFID): 1 per secured door (in + out = 2 if bidirectional)
- Electromagnetic Lock (Mag-lock): 1 per door controlled
- Access Control Controller / Panel: 1 per 2–4 doors (check capacity)
- Door Exit Button (REX): 1 per door inner side
- Door Sensor (Magnetic): 1 per controlled door
- Power Supply (12VDC / 24VDC): 1 per 2–4 locks
- Network Cable Cat6: estimate in meters for controller runs
- Electric Strike: alternative to mag-lock for outswing doors
- Biometric Reader: upgrade option for high-security zones
- UPS / Battery Backup: 1 per controller`,
    exampleItems: `{ "name": "Proximity Card Reader", "category": "Hardware", "quantity": 8, "unit": "pcs", "unitPrice": 0 },
    { "name": "Electromagnetic Lock 600lbs", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Access Controller 4-Door", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Exit Button / REX", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Cat6 UTP Cable", "category": "Wires & Cables", "quantity": 200, "unit": "meters", "unitPrice": 0 }`,
  },
  BURGLAR_ALARM: {
    label: 'Burglar Alarm System',
    rules: `- PIR Motion Detector: 1 per room / zone (covers 90° x 12m)
- Door/Window Contact Sensor: 1 per opening (door or window)
- Glass Break Detector: 1 per room with large glass panels
- Alarm Control Panel (DSC / Paradox / Hikvision): size based on zone count (8-zone, 16-zone, 32-zone)
- Outdoor Siren / Strobe: 1 per building face (front and rear minimum)
- Indoor Siren: 1 per floor
- Keypad: 1 per entry/exit zone
- Alarm Cable (4-core): estimate in meters — avg 20–30m per detector; unit "meters"
- SIM Card Communicator / GSM Module: 1 per panel for remote alerts`,
    exampleItems: `{ "name": "PIR Motion Detector", "category": "Hardware", "quantity": 12, "unit": "pcs", "unitPrice": 0 },
    { "name": "Door Contact Sensor", "category": "Hardware", "quantity": 8, "unit": "pcs", "unitPrice": 0 },
    { "name": "Alarm Control Panel 16-Zone", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Outdoor Siren with Strobe", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Alarm Cable 4-Core", "category": "Wires & Cables", "quantity": 220, "unit": "meters", "unitPrice": 0 }`,
  },
  DOOR_LOCK: {
    label: 'Door Lock System',
    rules: `- Hotel Door Lock / Smart Lock: 1 per guest room / private office door
- Lock Accessory (Magnetic cards, keyfobs): estimate based on expected users
- Smart Hotel Solution Software / Controller: 1 per reception/desk setup`,
    exampleItems: `{ "name": "Smart Hotel RFID Lock", "category": "Hardware", "quantity": 50, "unit": "pcs", "unitPrice": 0 },
    { "name": "Proximity RFID Guest Card", "category": "Hardware", "quantity": 200, "unit": "pcs", "unitPrice": 0 },
    { "name": "Smart Lock Controller Center", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 }`,
  },
  EAS_SYSTEM: {
    label: 'EAS System',
    rules: `- EAS Gate Antenna (Anti-theft): 1 pair per main retail exit point
- EAS Hard Tags / Soft Labels: estimate based on retail inventory count (packs of 1000)
- EAS Tag Detacher / Deactivator: 1 per cash register / POS station`,
    exampleItems: `{ "name": "EAS Anti-Theft Gate Antenna", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "EAS Hard Tag 58Khz (1000pcs/box)", "category": "Hardware", "quantity": 5, "unit": "pcs", "unitPrice": 0 },
    { "name": "EAS Magnetic Tag Detacher", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 }`,
  },
  FIRE_PROTECTION: {
    label: 'Fire Protection / Suppression System',
    rules: `- Sprinkler Head (Pendant / Upright): 1 per 9–12 sqm ceiling area
- Sprinkler Pipe (Schedule 40 Black Steel): estimate in meters along ceiling grid; unit "meters"
- Fire Suppression Cylinder (FM200 / CO2 / Novec): for server rooms — 1 per protected zone
- Fire Hose Cabinet (Reel or Box): 1 per 25–30m radius coverage
- Siamese Connection: 1 per building exterior (BFP requirement)
- Pressure Gauge / Flow Switch: 1 per riser/zone`,
    exampleItems: `{ "name": "Sprinkler Head Pendant Type", "category": "Hardware", "quantity": 40, "unit": "pcs", "unitPrice": 0 },
    { "name": "Schedule 40 Black Steel Pipe 1-inch", "category": "Protective Coverings", "quantity": 120, "unit": "meters", "unitPrice": 0 },
    { "name": "FM200 Suppression Cylinder 30kg", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Fire Hose Cabinet with Reel", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 }`,
  },
  FIXED_ARM_ELEVATOR: {
    label: 'Fixed Arm & Elevator Related System',
    rules: `- Elevator Access Controller: 1 per lift cabin/shaft (supports multi-floor control)
- Fixed Arm Bracket/Support: 1 per turnstile/barrier gate installation
- Elevator RFID Reader / Biometric Scanner: 1 per lift cabin`,
    exampleItems: `{ "name": "Elevator Control Panel 20-Floor", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Fixed Arm Mounting Pole", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Elevator Card Reader", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 }`,
  },
  INTERCOM_NURSE_CALL: {
    label: 'Intercom & Nurse Call System',
    rules: `- Video Intercom Door Station: 1 per building entry or lobby door
- Video Intercom Room Master Station: 1 per counter / security desk
- Nurse Call Master Panel: 1 per nurse station (sized for bed count)
- Patient Bed Station (with pull cord/button): 1 per hospital/clinic bed
- Hallway Dome Light: 1 per patient room entrance`,
    exampleItems: `{ "name": "Nurse Call Master Station 24-ch", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Patient Bed Call Button Station", "category": "Hardware", "quantity": 16, "unit": "pcs", "unitPrice": 0 },
    { "name": "Intercom Door Station", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Intercom Indoor Monitor 7-inch", "category": "Hardware", "quantity": 6, "unit": "pcs", "unitPrice": 0 }`,
  },
  PABX_PAGING: {
    label: 'PABX & Paging System',
    rules: `- PABX Central Control Box / IP-PBX: 1 per main wiring hub
- Paging Power Amplifier (120W/240W/350W): 1 per paging setup or zone
- Ceiling Speakers: 1 per 35-40 sqm ceiling space
- Wall / Column Speakers: 1 per corridor or warehouse zone
- Paging Microphone Console: 1 per reception/announcement area`,
    exampleItems: `{ "name": "PABX 8-Line 32-Extension Control Box", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Paging Amplifier 240W", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "PA Ceiling Speaker 6W", "category": "Hardware", "quantity": 30, "unit": "pcs", "unitPrice": 0 },
    { "name": "Paging Desktop Microphone Console", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 }`,
  },
  PARKING_BARRIER: {
    label: 'Parking Barrier System',
    rules: `- Barrier Gate Boom: 1 per parking entry or exit lane
- Parking Barrier Controller: 1 per lane checkpoint
- Vehicle Loop Detector: 2 per barrier gate (safety loop + trigger loop)
- UHF Long-Range RFID Reader: 1 per entry/exit lane for hands-free vehicle access
- Loop Detector Wire: estimate in meters (typically 15-20 meters per loop)`,
    exampleItems: `{ "name": "Automatic Parking Barrier Gate with 4m Boom", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "UHF RFID Long Range Reader", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Vehicle Loop Detector Module", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Loop Detector Wire", "category": "Wires & Cables", "quantity": 80, "unit": "meters", "unitPrice": 0 }`,
  },
  POS_SYSTEM: {
    label: 'POS System',
    rules: `- POS Terminal / POS Computer: 1 per cashier counter
- POS Thermal Receipt Printer: 1 per POS terminal
- Cash Drawer (Heavy duty): 1 per POS terminal
- Barcode Scanner (Handheld or Omni-directional): 1 per POS terminal`,
    exampleItems: `{ "name": "All-in-One Touchscreen POS Terminal", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 },
    { "name": "Thermal Receipt Printer 80mm", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 },
    { "name": "Heavy Duty Cash Drawer", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 },
    { "name": "USB Laser Barcode Scanner", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 }`,
  },
  ROOM_ALERT: {
    label: 'Room Alert System',
    rules: `- Room Alert Environment Monitor Unit: 1 per server room, data center, or telecom closet
- External Temperature/Humidity Sensor: 1–2 per server rack
- Water Flood Sensor: 1 per sub-floor or air-con unit location
- Dry Contact Smoke Sensor (Room Alert compliant): 1 per critical enclosure`,
    exampleItems: `{ "name": "Room Alert Environment Monitor Main Unit", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Digital Temperature and Humidity Sensor", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Flood Sensor Cable 10ft", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 }`,
  },
  XRAY_SECURITY: {
    label: 'X-Ray, Turnstile & Security Inspection System',
    rules: `- X-Ray Baggage Scanner: 1 per main building lobby entrance checkpoint
- Walk-Through Metal Detector (WTMD): 1 per entrance checkpoint lane
- Hand-Held Metal Detector: 1–2 per security guard station
- Tripod Turnstile or Flap Barrier: 1 per entrance lane (e.g. 3 lanes = 3 barriers)
- Turnstile Access Control Integration Board: 1 per turnstile setup`,
    exampleItems: `{ "name": "X-Ray Baggage Scanner Machine", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Walk-Through Metal Detector 33-Zone", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Hand-Held Security Metal Detector Wand", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 },
    { "name": "Tripod Turnstile Gate", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 }`,
  },
};

// ─── STEP 1 PROMPT: Floor Plan Visual Analysis ───────────────────────────────
// This prompt forces the model to carefully read and count everything in the image
// before generating any BOQ numbers.
function buildAnalysisPrompt(
  surveyType: string,
  info: { buildingType?: string; floors?: number; location?: string; projectName?: string; surveyScope?: string },
): string {
  const systemKeys = surveyType.split(',').map(s => s.trim().toUpperCase());
  const systems = systemKeys.filter(k => SYSTEM_RULES[k]);
  const systemLabel = systems.length > 0
    ? systems.map(k => SYSTEM_RULES[k].label).join(', ')
    : 'General Security System';

  return `You are an expert security systems estimator reviewing architectural floor plans for a ${systemLabel} installation in the Philippines.

PROJECT DETAILS:
- Building type: ${info.buildingType || 'Office'}
- Floors shown: ${info.floors || 1}
- Location: ${info.location || 'Metro Manila, Philippines'}
- Project: ${info.projectName || 'Security Installation'}${info.surveyScope ? `\n- Scope: ${info.surveyScope}` : ''}

TASK — Carefully analyze the floor plan image(s) and extract the following EXACT counts. Be precise. Look at every room, door, and corridor in the image.

Respond in this EXACT JSON format (no markdown, no explanation):
{
  "floorCount": <number of floors visible in the plan>,
  "estimatedTotalAreaSqm": <total built-up area in square meters — estimate from scale or room sizes>,
  "rooms": {
    "offices": <count all labeled office / workstation / cubicle rooms>,
    "conferenceRooms": <count all meeting / conference / boardrooms>,
    "serverRooms": <count all server / IDF / MDF / telecom rooms>,
    "toilets": <count all toilet / CR / comfort room spaces>,
    "lobbies": <count all lobby / reception / entrance hall areas>,
    "corridors": <count all corridor / hallway segments>,
    "stairwells": <count all staircase / fire exit stairwells>,
    "elevatorShafts": <count all elevator / lift shafts>,
    "parkingSlots": <count all marked parking slots or bays>,
    "warehouse": <count all warehouse / storage / bodega areas>,
    "kitchen": <count all pantry / kitchen / break room areas>,
    "other": <count all other unlabeled or miscellaneous rooms>
  },
  "doors": {
    "mainEntrances": <count of main lobby / main entrance doors>,
    "fireExitDoors": <count of emergency / fire exit doors>,
    "securedDoors": <count of doors likely needing access control — server rooms, restricted areas>,
    "regularDoors": <count of all other interior doors>
  },
  "ceilingHeightMeters": <estimated ceiling height — typical office = 3.0m, warehouse = 6–9m>,
  "buildingPerimeterMeters": <estimate the outer perimeter in meters for cable routing>,
  "observations": "Describe in 2–3 sentences what you see: layout, key zones, special areas, and anything notable for security system planning."
}`;
}

// ─── STEP 2 PROMPT: BOQ Generation from analysis data ────────────────────────
function buildBoqPrompt(
  surveyType: string,
  info: { buildingType?: string; floors?: number; location?: string; projectName?: string; surveyScope?: string },
  analysis: Record<string, unknown>,
): string {
  const systemKeys = surveyType.split(',').map(s => s.trim().toUpperCase());
  const systems = systemKeys.filter(k => SYSTEM_RULES[k]);

  let systemRulesBlock = '';
  if (systems.length > 0) {
    systemRulesBlock = systems.map(key => {
      const s = SYSTEM_RULES[key];
      return `\n## ${s.label}\n${s.rules}`;
    }).join('\n');
  } else {
    systemRulesBlock = `\n## General Security Systems\n- Estimate equipment appropriate for the building type and floor plan\n- Include cabling in meters where applicable`;
  }

  const exampleConsumables = systems.map(key => SYSTEM_RULES[key].exampleItems).join(',\n    ');
  const systemLabel = systems.length > 0
    ? systems.map(k => SYSTEM_RULES[k].label).join(' + ')
    : 'Security System';

  const rooms = analysis.rooms as Record<string, number> || {};
  const doors = analysis.doors as Record<string, number> || {};
  const totalRooms = Object.values(rooms).reduce((a, b) => a + (b || 0), 0);
  const totalAreaSqm = (analysis.estimatedTotalAreaSqm as number) || (totalRooms * 25);
  const perimeter = (analysis.buildingPerimeterMeters as number) || 100;
  const ceilingH = (analysis.ceilingHeightMeters as number) || 3.0;

  return `You are an expert electronic security and fire safety systems estimator for the Philippines.

You have already analyzed the floor plan. Here are the EXACT counts extracted:

FLOOR PLAN ANALYSIS RESULTS:
- Total area: ~${totalAreaSqm} sqm across ${analysis.floorCount || info.floors || 1} floor(s)
- Offices: ${rooms.offices || 0}, Conference rooms: ${rooms.conferenceRooms || 0}, Server rooms: ${rooms.serverRooms || 0}
- Lobbies: ${rooms.lobbies || 0}, Corridors: ${rooms.corridors || 0}, Toilets: ${rooms.toilets || 0}
- Stairwells: ${rooms.stairwells || 0}, Elevators: ${rooms.elevatorShafts || 0}
- Parking slots: ${rooms.parkingSlots || 0}, Warehouse: ${rooms.warehouse || 0}, Kitchen: ${rooms.kitchen || 0}, Other: ${rooms.other || 0}
- Main entrances: ${doors.mainEntrances || 0}, Fire exits: ${doors.fireExitDoors || 0}
- Secured/restricted doors: ${doors.securedDoors || 0}, Regular doors: ${doors.regularDoors || 0}
- Building perimeter: ~${perimeter}m, Ceiling height: ~${ceilingH}m
- Observations: ${(analysis.observations as string) || 'N/A'}

SYSTEM TO INSTALL: ${systemLabel}
Building: ${info.buildingType || 'Office'}, ${info.floors || 1} floor(s), ${info.location || 'Metro Manila'}${info.surveyScope ? `\nScope: ${info.surveyScope}` : ''}

=== EQUIPMENT RULES — Apply EXACTLY to the room/door counts above ===
${systemRulesBlock}

=== CABLE LENGTH CALCULATION ===
- Route cables from each device back to the nearest panel/NVR/controller
- Average horizontal run = half the floor width + vertical drop from ceiling
- Add 15% slack for bends, loops, and termination
- Use the building perimeter (${perimeter}m) and area (${totalAreaSqm} sqm) to calibrate distances

=== MANPOWER CALCULATION ===
- Lead Security Engineer: 1 person, full project duration
- Safety Officer: 1 person, DOLE compliance (full duration)
- System Installers: size based on scope — ~4–6 CCTV cameras per day, ~100m cable per day, ~8–10 detectors per day, ~4 access doors per day
- man-days = ceil(headcount × hours / 8)
- Working hours per day = 8

CRITICAL: Use the EXACT room and door counts above — do NOT invent numbers. Scale quantities directly from the analysis data.

Respond ONLY with a single valid JSON object. No markdown fences, no explanation:

{
  "observations": "2-3 sentence summary of the floor plan and what drives the BOQ quantities.",
  "manpower": [
    { "role": "Lead Security Engineer", "headcount": 1, "hours": 32, "manDays": 4 },
    { "role": "Systems Installer", "headcount": 2, "hours": 48, "manDays": 12 }
  ],
  "consumables": [
    ${exampleConsumables || `{ "name": "Cat6 UTP Cable", "category": "Wires & Cables", "quantity": 200, "unit": "meters", "unitPrice": 0 }`}
  ],
  "fees": [
    { "type": "Travel Fee", "amount": 0, "description": "Mobilization to site" }
  ],
  "constraints": {
    "physical": "Describe wall types, ceiling height (${ceilingH}m), and physical obstacles from the floor plan.",
    "electrical": "Describe power supply needs, UPS requirements, DB room location.",
    "installation": "Describe access timing, shift requirements, and any restrictions."
  }
}`;
}

async function callGroq(
  apiKey: string,
  contentParts: object[],
  model: string,
  systemPrompt?: string
): Promise<string> {
  const messages: object[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({
    role: 'user',
    content: contentParts,
  });

  const requestBody = {
    model,
    messages,
    temperature: 0.1,       // Low temp = consistent, factual output
    max_tokens: 4096,
  };

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errMsg = `Groq API error (${response.status})`;
    try {
      const errData = await response.json();
      errMsg = errData?.error?.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  const rawText: string | undefined = data?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Groq returned an empty response. Try again.');
  return rawText;
}

function extractJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not extract JSON from response. Try a higher resolution floor plan image.');

  return JSON.parse(jsonMatch[0]);
}

export async function analyzeFloorPlan(
  imageFiles: File[],
  surveyType: string,
  buildingInfo: {
    buildingType?: string;
    floors?: number;
    location?: string;
    projectName?: string;
    surveyScope?: string;
  }
): Promise<FloorPlanEstimation> {
  const apiKey = GROQ_API_KEY || localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  if (!apiKey.trim() || apiKey === 'your_groq_api_key_here') {
    throw new Error(
      'Groq API key not configured. Please set VITE_GROQ_API_KEY in the .env file and restart the dev server. Get a free key at console.groq.com'
    );
  }
  if (!imageFiles.length) {
    throw new Error('No floor plan files provided.');
  }

  // Separate images from PDFs
  const images = imageFiles.filter(isImageFile);
  const pdfs = imageFiles.filter(f => !isImageFile(f));

  // Build image content parts for vision
  const imageParts: object[] = [];
  for (const img of images) {
    const base64 = await fileToBase64(img);
    const mime = getMimeType(img);
    imageParts.push({
      type: 'image_url',
      image_url: { url: `data:${mime};base64,${base64}` },
    });
  }

  let analysis: Record<string, unknown> = {};

  if (images.length > 0) {
    // ── PHASE 1: Visual analysis — count rooms, doors, area from the image ──
    const phase1Prompt = buildAnalysisPrompt(surveyType, buildingInfo);

    let pdfContext = '';
    if (pdfs.length > 0) {
      pdfContext = `\n\nAdditional PDF files (use filename for context):\n${pdfs.map(f => `- ${f.name}`).join('\n')}`;
    }

    const phase1Parts: object[] = [
      ...imageParts,
      { type: 'text', text: phase1Prompt + pdfContext },
    ];

    const phase1Raw = await callGroq(apiKey, phase1Parts, GROQ_VISION_MODEL);

    try {
      analysis = extractJson(phase1Raw);
    } catch {
      // If phase 1 JSON fails, continue with empty analysis and let phase 2 use building info
      console.warn('Phase 1 analysis parse failed, falling back to building info only');
      analysis = {
        floorCount: buildingInfo.floors || 1,
        estimatedTotalAreaSqm: (buildingInfo.floors || 1) * 300,
        observations: 'Floor plan analyzed from building information.',
      };
    }

    // ── PHASE 2: BOQ generation using the analysis data ──
    const phase2Prompt = buildBoqPrompt(surveyType, buildingInfo, analysis);
    const phase2Parts: object[] = [
      { type: 'text', text: phase2Prompt },
    ];

    // Phase 2 uses the larger 70B reasoning model — no images needed, just the analysis data
    const phase2Raw = await callGroq(apiKey, phase2Parts, GROQ_REASONING_MODEL);
    const boq = extractJson(phase2Raw) as unknown as FloorPlanEstimation;

    // Merge observations from phase 1 into final result if phase 2 observations is generic
    if (analysis.observations && typeof analysis.observations === 'string' && analysis.observations.length > boq.observations?.length) {
      boq.observations = analysis.observations;
    }

    return boq;

  } else {
    // PDF-only: single pass with filename context
    const prompt = buildBoqPrompt(surveyType, buildingInfo, {
      floorCount: buildingInfo.floors || 1,
      estimatedTotalAreaSqm: (buildingInfo.floors || 1) * 300,
      observations: `PDF floor plans provided: ${pdfs.map(f => f.name).join(', ')}`,
    });

    const textParts: object[] = [
      { type: 'text', text: prompt + `\n\nPDF files:\n${pdfs.map(f => `- ${f.name}`).join('\n')}` },
    ];

    const raw = await callGroq(apiKey, textParts, GROQ_REASONING_MODEL);
    return extractJson(raw) as unknown as FloorPlanEstimation;
  }
}

export async function testGeminiConnection(apiKey?: string): Promise<string> {
  const key = apiKey || GROQ_API_KEY || localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  if (!key.trim() || key === 'your_groq_api_key_here') {
    throw new Error('No Groq API key set.');
  }
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.trim()}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Reply with just: OK' }],
      max_tokens: 10,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message || `HTTP ${response.status}`);
  }
  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  return data?.choices?.[0]?.message?.content || 'OK';
}
