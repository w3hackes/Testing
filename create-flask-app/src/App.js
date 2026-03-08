import './App.css';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';

// ── Icons ──────────────────────────────────────────
const BloodDrop = ({ color = "#e05c5c", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C12 2 5 9.5 5 14a7 7 0 0014 0C19 9.5 12 2 12 2z" fill={color} />
  </svg>
);

const HeartIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#52a882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const PlasmaIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7eaacc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
    <circle cx="12" cy="9" r="2.5" fill="#7eaacc" stroke="none" />
  </svg>
);



// ── Static fallback inventory ──────────────────────
const STATIC_BLOOD = [
  { type: 'A+',  units: 120 }, { type: 'A-',  units: 45 },
  { type: 'B+',  units: 65  }, { type: 'B-',  units: 98 },
  { type: 'O+',  units: 210 }, { type: 'O-',  units: 60 },
  { type: 'AB+', units: 30  }, { type: 'AB-', units: 20 },
];

const STATIC_PLASMA = [
  { type: 'A+',  units: 80 }, { type: 'A-',  units: 34 },
  { type: 'B+',  units: 45 }, { type: 'B-',  units: 28 },
  { type: 'AB+', units: 90 }, { type: 'AB-', units: 18 },
  { type: 'O+',  units: 97 }, { type: 'O-',  units: 41 },
];

// ── Bar Chart ──────────────────────────────────────
function BarChart({ data, color, label }) {
  const max = Math.max(...data.map(d => d.units), 1);
  return (
    <div className="bar-chart">
      <p className="bar-chart-label">{label}</p>
      <div className="bar-chart-bars">
        {data.map(d => (
          <div key={d.type} className="bar-col">
            <span className="bar-value">{d.units}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${Math.round((d.units / max) * 100)}%`, background: color }} />
            </div>
            <span className="bar-type">{d.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Critical Alert Banner ──────────────────────────
const CRITICAL_THRESHOLD = 50;

function CriticalAlerts({ bloodRows, plasmaRows, onRequestSupply }) {
  const lowBlood  = bloodRows.filter(r => r.units < CRITICAL_THRESHOLD);
  const lowPlasma = plasmaRows.filter(r => r.units < CRITICAL_THRESHOLD);
  const allLow    = [
    ...lowBlood.map(r  => ({ ...r, category: 'Blood'  })),
    ...lowPlasma.map(r => ({ ...r, category: 'Plasma' })),
  ];

  if (allLow.length === 0) return null;

  const handleRequestAll = () => {
    onRequestSupply(
      lowBlood.map(r => r.type),
      lowPlasma.map(r => r.type)
    );
  };

  const handleRequestOne = (item) => {
    onRequestSupply(
      item.category === 'Blood'  ? [item.type] : [],
      item.category === 'Plasma' ? [item.type] : []
    );
  };

  return (
    <div className="critical-banner">
      <div className="critical-banner-header">
        <div className="critical-banner-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Critical Stock Alert — {allLow.length} type{allLow.length > 1 ? 's' : ''} below {CRITICAL_THRESHOLD} units
        </div>
        <button className="critical-request-all-btn" onClick={handleRequestAll}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          Request All
        </button>
      </div>
      <div className="critical-pills">
        {allLow.map(r => (
          <div key={`${r.category}-${r.type}`} className="critical-pill">
            <span className="critical-pill-type">{r.category} {r.type}</span>
            <span className="critical-pill-units">{r.units} units</span>
            <button className="critical-pill-btn" onClick={() => handleRequestOne(r)}>
              Request
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BloodSupplyHeatmap ─────────────────────────────
function BloodSupplyHeatmap({ inventory, label }) {
  const getLevel = (units) => {
    if (units < 25)  return 'critical';
    if (units < 50)  return 'low';
    return 'ok';
  };

  const levelMeta = {
    critical: { label: 'Critical', color: '#c94040' },
    low:      { label: 'Low',      color: '#b5820a' },
    ok:       { label: 'Good',     color: '#3a8c5c'  },
  };

  return (
    <div className="heatmap">
      <div className="heatmap-header">
        <span className="heatmap-title">{label}</span>
        <div className="heatmap-legend">
          {Object.entries(levelMeta).map(([key, meta]) => (
            <div key={key} className="heatmap-legend-item">
              <span className="heatmap-legend-dot" style={{ background: meta.color }} />
              <span>{meta.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-grid">
        {inventory.map(({ type, units }) => {
          const level = getLevel(units);
          const meta  = levelMeta[level];
          return (
            <div key={type} className={`heatmap-cell heatmap-cell--${level}`}>
              <span className="heatmap-cell-type">{type}</span>
              <span className="heatmap-cell-units">{units}</span>
              <span className="heatmap-cell-label">{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── InventoryStats ─────────────────────────────────
function InventoryStats({ bloodRows, plasmaRows, mask = v => v, isUnlocked = true }) {
  const totalBlood  = bloodRows.reduce((s, r)  => s + r.units, 0);
  const totalPlasma = plasmaRows.reduce((s, r) => s + r.units, 0);
  const lowAlerts   = [
    ...bloodRows.filter(r  => r.units < 25).map(r => ({ ...r, category: 'Blood'  })),
    ...plasmaRows.filter(r => r.units < 25).map(r => ({ ...r, category: 'Plasma' })),
  ];

  return (
    <div className="stats-row">
      {/* Total Blood */}
      <div className="stat-card">
        <div className="stat-card-icon stat-card-icon--blood">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#e05c5c">
            <path d="M12 2C12 2 5 9.5 5 14a7 7 0 0014 0C19 9.5 12 2 12 2z"/>
          </svg>
        </div>
        <div className="stat-card-body">
          <div className="stat-card-label">Total Blood Units</div>
          <div className={`stat-card-value ${!isUnlocked ? 'stat-card-value--masked' : ''}`}>{mask(totalBlood.toLocaleString())}</div>
          <div className="stat-card-sub">{bloodRows.length} blood types tracked</div>
        </div>
      </div>

      {/* Total Plasma */}
      <div className="stat-card">
        <div className="stat-card-icon stat-card-icon--plasma">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7eaacc" strokeWidth="1.5">
            <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/>
            <circle cx="12" cy="9" r="2.5" fill="#7eaacc" stroke="none"/>
          </svg>
        </div>
        <div className="stat-card-body">
          <div className="stat-card-label">Total Plasma Units</div>
          <div className={`stat-card-value ${!isUnlocked ? 'stat-card-value--masked' : ''}`}>{mask(totalPlasma.toLocaleString())}</div>
          <div className="stat-card-sub">{plasmaRows.length} plasma types tracked</div>
        </div>
      </div>

      {/* Low Supply Alerts */}
      <div className={`stat-card ${isUnlocked && lowAlerts.length > 0 ? 'stat-card--alert' : ''}`}>
        <div className={`stat-card-icon ${isUnlocked && lowAlerts.length > 0 ? 'stat-card-icon--alert' : 'stat-card-icon--ok'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div className="stat-card-body">
          <div className="stat-card-label">Low Supply Alerts</div>
          <div className={`stat-card-value ${!isUnlocked ? 'stat-card-value--masked' : isUnlocked && lowAlerts.length > 0 ? 'stat-card-value--alert' : 'stat-card-value--ok'}`}>
            {mask(lowAlerts.length)}
          </div>
          <div className="stat-card-sub">
            {!isUnlocked
              ? 'Set location to view alerts'
              : lowAlerts.length === 0
                ? 'All types adequately stocked'
                : lowAlerts.map(r => `${r.category} ${r.type}`).join(', ')
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Donation Facilities ────────────────────────────
const ORG_COLORS = {
  'American Red Cross':      '#e05c5c',
  'Vitalant':                '#7eaacc',
  'OneBlood':                '#d4a22a',
  'New York Blood Center':   '#a78bfa',
  'Gulf Coast Regional':     '#52a882',
  'Carter BloodCare':        '#f97316',
};

const FACILITIES = [
  // American Red Cross
  { id: 1,  org: 'American Red Cross',    name: 'DC Chapter Donation Center',     address: '2025 E St NW, Washington, DC 20006',          lat: 38.8936, lng: -77.0458 },
  { id: 2,  org: 'American Red Cross',    name: 'Rockville Donation Center',      address: '51 Monroe St, Rockville, MD 20850',           lat: 39.0840, lng: -77.1528 },
  { id: 3,  org: 'American Red Cross',    name: 'Baltimore Donation Center',      address: '4800 Mt Hope Dr, Baltimore, MD 21215',        lat: 39.3498, lng: -76.6665 },
  { id: 4,  org: 'American Red Cross',    name: 'Richmond Donation Center',       address: '1001 Grove Ave, Richmond, VA 23220',          lat: 37.5535, lng: -77.4609 },
  { id: 5,  org: 'American Red Cross',    name: 'Philadelphia Donation Center',   address: '709 Chestnut St, Philadelphia, PA 19106',     lat: 39.9474, lng: -75.1492 },

  // Vitalant
  { id: 6,  org: 'Vitalant',              name: 'Pittsburgh Donation Center',     address: '812 5th Ave, Pittsburgh, PA 15219',           lat: 40.4415, lng: -79.9968 },
  { id: 7,  org: 'Vitalant',              name: 'Denver Tech Center',             address: '7007 E Hampden Ave, Denver, CO 80224',        lat: 39.6501, lng: -104.9311 },
  { id: 8,  org: 'Vitalant',              name: 'Tucson Donor Center',            address: '1011 N Campbell Ave, Tucson, AZ 85719',       lat: 32.2386, lng: -110.9481 },
  { id: 9,  org: 'Vitalant',              name: 'San Francisco Center',           address: '270 Masonic Ave, San Francisco, CA 94117',    lat: 37.7782, lng: -122.4460 },
  { id: 10, org: 'Vitalant',              name: 'Phoenix Donor Center',           address: '2525 E Arizona Biltmore Cir, Phoenix, AZ',    lat: 33.5206, lng: -112.0173 },

  // OneBlood
  { id: 11, org: 'OneBlood',              name: 'Orlando Donor Center',           address: '2322 S Orange Ave, Orlando, FL 32806',        lat: 28.5140, lng: -81.3748 },
  { id: 12, org: 'OneBlood',              name: 'Tampa Donor Center',             address: '400 N Ashley Dr, Tampa, FL 33602',            lat: 27.9472, lng: -82.4586 },
  { id: 13, org: 'OneBlood',              name: 'Miami Lakes Center',             address: '15255 NW 82nd Ave, Miami Lakes, FL 33016',    lat: 25.9209, lng: -80.3079 },
  { id: 14, org: 'OneBlood',              name: 'Jacksonville Center',            address: '410 W Forsyth St, Jacksonville, FL 32202',    lat: 30.3229, lng: -81.6608 },

  // New York Blood Center
  { id: 15, org: 'New York Blood Center', name: 'Manhattan Donor Center',         address: '310 E 67th St, New York, NY 10065',           lat: 40.7662, lng: -73.9596 },
  { id: 16, org: 'New York Blood Center', name: 'Brooklyn Donor Center',          address: '310 Flatbush Ave, Brooklyn, NY 11238',        lat: 40.6741, lng: -73.9744 },
  { id: 17, org: 'New York Blood Center', name: 'Queens Donor Center',            address: '189-11 Hillside Ave, Queens, NY 11432',       lat: 40.7074, lng: -73.7894 },
  { id: 18, org: 'New York Blood Center', name: 'Westchester Center',             address: '245 Saw Mill River Rd, Yonkers, NY 10701',    lat: 40.9481, lng: -73.8677 },

  // Gulf Coast Regional
  { id: 19, org: 'Gulf Coast Regional',   name: 'Houston Medical Center',         address: '1400 La Concha Ln, Houston, TX 77054',        lat: 29.7072, lng: -95.3987 },
  { id: 20, org: 'Gulf Coast Regional',   name: 'Sugar Land Center',              address: '2235 Williams Trace Blvd, Sugar Land, TX',    lat: 29.5874, lng: -95.6350 },
  { id: 21, org: 'Gulf Coast Regional',   name: 'The Woodlands Center',           address: '9320 Pinecroft Dr, The Woodlands, TX 77380',  lat: 30.1745, lng: -95.5011 },

  // Carter BloodCare
  { id: 22, org: 'Carter BloodCare',      name: 'Bedford Donor Center',           address: '2205 Hwy 121, Bedford, TX 76021',             lat: 32.8457, lng: -97.1431 },
  { id: 23, org: 'Carter BloodCare',      name: 'Dallas Donor Center',            address: '2205 N O Connor Rd, Irving, TX 75062',        lat: 32.8592, lng: -97.0147 },
  { id: 24, org: 'Carter BloodCare',      name: 'Waco Donor Center',              address: '1901 N Valley Mills Dr, Waco, TX 76710',      lat: 31.5581, lng: -97.1817 },
];

// ── Haversine distance (miles) ─────────────────────
function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Medical facilities (origin locations) ──────────
const MEDICAL_LOCATIONS = [
  { id: 'ml1',  name: 'Johns Hopkins Hospital',              city: 'Baltimore, MD',       lat: 39.2961, lng: -76.5927 },
  { id: 'ml2',  name: 'George Washington University Hospital',city: 'Washington, DC',     lat: 38.9007, lng: -77.0502 },
  { id: 'ml3',  name: 'MedStar Georgetown University Hospital',city: 'Washington, DC',    lat: 38.9373, lng: -77.0727 },
  { id: 'ml4',  name: 'Inova Fairfax Medical Campus',         city: 'Falls Church, VA',   lat: 38.8531, lng: -77.2280 },
  { id: 'ml5',  name: 'Virginia Hospital Center',             city: 'Arlington, VA',      lat: 38.8825, lng: -77.1050 },
  { id: 'ml6',  name: 'NYU Langone Health',                   city: 'New York, NY',       lat: 40.7421, lng: -73.9739 },
  { id: 'ml7',  name: 'NewYork-Presbyterian Hospital',        city: 'New York, NY',       lat: 40.7645, lng: -73.9552 },
  { id: 'ml8',  name: 'Mount Sinai Hospital',                 city: 'New York, NY',       lat: 40.7900, lng: -73.9524 },
  { id: 'ml9',  name: 'Hospital of the University of Pennsylvania', city: 'Philadelphia, PA', lat: 39.9496, lng: -75.1943 },
  { id: 'ml10', name: 'Thomas Jefferson University Hospital', city: 'Philadelphia, PA',   lat: 39.9480, lng: -75.1573 },
  { id: 'ml11', name: 'UPMC Presbyterian',                    city: 'Pittsburgh, PA',     lat: 40.4415, lng: -79.9603 },
  { id: 'ml12', name: 'Cleveland Clinic Main Campus',         city: 'Cleveland, OH',      lat: 41.5031, lng: -81.6209 },
  { id: 'ml13', name: 'Mass General Hospital',                city: 'Boston, MA',         lat: 42.3632, lng: -71.0686 },
  { id: 'ml14', name: 'Brigham and Women\'s Hospital',        city: 'Boston, MA',         lat: 42.3354, lng: -71.1065 },
  { id: 'ml15', name: 'Jackson Memorial Hospital',            city: 'Miami, FL',          lat: 25.7906, lng: -80.2089 },
  { id: 'ml16', name: 'Tampa General Hospital',               city: 'Tampa, FL',          lat: 27.9342, lng: -82.4588 },
  { id: 'ml17', name: 'Orlando Health',                       city: 'Orlando, FL',        lat: 28.5227, lng: -81.3779 },
  { id: 'ml18', name: 'Houston Methodist Hospital',           city: 'Houston, TX',        lat: 29.7099, lng: -95.4010 },
  { id: 'ml19', name: 'UT Southwestern Medical Center',       city: 'Dallas, TX',         lat: 32.8128, lng: -96.8397 },
  { id: 'ml20', name: 'Baylor Scott & White Medical Center',  city: 'Temple, TX',         lat: 31.1108, lng: -97.3641 },
  { id: 'ml21', name: 'University of Colorado Hospital',      city: 'Aurora, CO',         lat: 39.7455, lng: -104.8389 },
  { id: 'ml22', name: 'Banner University Medical Center',     city: 'Tucson, AZ',         lat: 32.2386, lng: -110.9506 },
  { id: 'ml23', name: 'UCSF Medical Center',                  city: 'San Francisco, CA',  lat: 37.7631, lng: -122.4575 },
  { id: 'ml24', name: 'Cedars-Sinai Medical Center',          city: 'Los Angeles, CA',    lat: 34.0752, lng: -118.3801 },
  { id: 'ml25', name: 'UCLA Medical Center',                  city: 'Los Angeles, CA',    lat: 34.0663, lng: -118.4457 },
  { id: 'ml26', name: 'Harborview Medical Center',            city: 'Seattle, WA',        lat: 47.6038, lng: -122.3204 },
  { id: 'ml27', name: 'Oregon Health & Science University',   city: 'Portland, OR',       lat: 45.4994, lng: -122.6863 },
  { id: 'ml28', name: 'Northwestern Memorial Hospital',       city: 'Chicago, IL',        lat: 41.8954, lng: -87.6218 },
  { id: 'ml29', name: 'Rush University Medical Center',       city: 'Chicago, IL',        lat: 41.8739, lng: -87.6713 },
  { id: 'ml30', name: 'Mayo Clinic',                          city: 'Rochester, MN',      lat: 44.0234, lng: -92.4669 },
];

// ── Blood type options ─────────────────────────────
const BLOOD_TYPES = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
const PLASMA_TYPES = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];

// ── Request Panel ──────────────────────────────────
function RequestPanel({ facility, originLoc, preloadedTypes, onClose, onSubmit }) {
  // Derive initial reqType from preload
  const initReqType = () => {
    if (!preloadedTypes) return 'blood';
    const hasBlood  = preloadedTypes.blood.length  > 0;
    const hasPlasma = preloadedTypes.plasma.length > 0;
    if (hasBlood && hasPlasma) return 'both';
    if (hasPlasma) return 'plasma';
    return 'blood';
  };

  const [reqType,          setReqType]          = useState(initReqType);
  const [bloodSelections,  setBloodSelections]  = useState(() =>
    preloadedTypes ? Object.fromEntries(preloadedTypes.blood.map(t => [t, ''])) : {}
  );
  const [plasmaSelections, setPlasmaSelections] = useState(() =>
    preloadedTypes ? Object.fromEntries(preloadedTypes.plasma.map(t => [t, ''])) : {}
  );
  const [submitted, setSubmitted] = useState(false);
  const [urgency,   setUrgency]   = useState(preloadedTypes ? 'urgent' : 'standard');
  const orgColor = ORG_COLORS[facility.org];

  const toggleType = (category, type) => {
    const setter = category === 'blood' ? setBloodSelections : setPlasmaSelections;
    setter(prev => {
      const next = { ...prev };
      if (next[type] !== undefined) { delete next[type]; } else { next[type] = ''; }
      return next;
    });
  };

  const setAmount = (category, type, val) => {
    const setter = category === 'blood' ? setBloodSelections : setPlasmaSelections;
    setter(prev => ({ ...prev, [type]: val }));
  };

  const needsBlood  = reqType === 'blood'  || reqType === 'both';
  const needsPlasma = reqType === 'plasma' || reqType === 'both';

  const bloodItems  = Object.entries(bloodSelections);
  const plasmaItems = Object.entries(plasmaSelections);

  const hasOrigin = !!originLoc;

  const canSubmit =
    hasOrigin &&
    (needsBlood  ? bloodItems.length  > 0 && bloodItems.every(([,v])  => v > 0) : true) &&
    (needsPlasma ? plasmaItems.length > 0 && plasmaItems.every(([,v]) => v > 0) : true) &&
    (bloodItems.length + plasmaItems.length > 0);

  const handleSubmit = () => {
    const payload = {
      facilityId:   facility.id,
      facilityName: facility.name,
      org:          facility.org,
      originName:   originLoc?.name ?? 'Unknown',
      urgency,
      blood:  needsBlood  ? bloodSelections  : {},
      plasma: needsPlasma ? plasmaSelections : {},
    };
    onSubmit(payload);
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="req-panel req-panel--success">
      <div className="req-success-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#52a882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <div className="req-success-title">Request Submitted</div>
      <div className="req-success-sub">
        Your request to <span style={{color: orgColor}}>{facility.name}</span> has been sent.
      </div>
      <button className="btn btn--secondary req-close-btn" onClick={onClose}>Close</button>
    </div>
  );

  return (
    <div className="req-panel">
      {/* Header */}
      <div className="req-panel-header" style={{ borderLeftColor: orgColor }}>
        <div className="req-panel-header-top">
          <div>
            <div className="req-panel-org" style={{ color: orgColor }}>{facility.org}</div>
            <div className="req-panel-name">{facility.name}</div>
            <div className="req-panel-addr">{facility.address}</div>
          </div>
          <button className="req-close-x" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {originLoc && (
          <div className="req-panel-dist">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4a8fbd" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {distanceMiles(originLoc.lat, originLoc.lng, facility.lat, facility.lng).toFixed(1)} mi from {originLoc.name}
          </div>
        )}
      </div>

      <div className="req-panel-body">

        {/* Preload indicator */}
        {preloadedTypes && (
          <div className="req-preload-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Auto-filled from dashboard alert — review and enter units below
          </div>
        )}

        {/* Step 1 — Request type */}
        <div className="req-section">
          <div className="req-section-label">
            <span className="req-step">1</span> What do you need?
          </div>
          <div className="req-type-row">
            {[['blood','Blood'],['plasma','Plasma'],['both','Both']].map(([val, label]) => (
              <button
                key={val}
                className={`req-type-btn ${reqType === val ? 'req-type-btn--on' : ''}`}
                onClick={() => setReqType(val)}
              >
                {val === 'blood'  && <svg width="13" height="13" viewBox="0 0 24 24" fill={reqType===val?'#e05c5c':'currentColor'}><path d="M12 2C12 2 5 9.5 5 14a7 7 0 0014 0C19 9.5 12 2 12 2z"/></svg>}
                {val === 'plasma' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={reqType===val?'#7eaacc':'currentColor'} strokeWidth="2"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/></svg>}
                {val === 'both'   && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={reqType===val?'#d4a22a':'currentColor'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — Blood types */}
        {needsBlood && (
          <div className="req-section">
            <div className="req-section-label">
              <span className="req-step req-step--blood">2{needsPlasma ? 'a' : ''}</span> Select blood types
            </div>
            <div className="req-type-grid">
              {BLOOD_TYPES.map(t => (
                <button
                  key={t}
                  className={`req-blood-chip ${bloodSelections[t] !== undefined ? 'req-blood-chip--on' : ''}`}
                  onClick={() => toggleType('blood', t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {bloodItems.length > 0 && (
              <div className="req-amounts">
                {bloodItems.map(([type]) => (
                  <div key={type} className="req-amount-row">
                    <span className="req-amount-label">{type}</span>
                    <input
                      className="req-amount-input"
                      type="number" min="1" placeholder="Units"
                      value={bloodSelections[type]}
                      onChange={e => setAmount('blood', type, e.target.value)}
                    />
                    <span className="req-amount-unit">units</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Plasma types */}
        {needsPlasma && (
          <div className="req-section">
            <div className="req-section-label">
              <span className="req-step req-step--plasma">{needsBlood ? '2b' : '2'}</span> Select plasma types
            </div>
            <div className="req-type-grid">
              {PLASMA_TYPES.map(t => (
                <button
                  key={t}
                  className={`req-plasma-chip ${plasmaSelections[t] !== undefined ? 'req-plasma-chip--on' : ''}`}
                  onClick={() => toggleType('plasma', t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {plasmaItems.length > 0 && (
              <div className="req-amounts">
                {plasmaItems.map(([type]) => (
                  <div key={type} className="req-amount-row">
                    <span className="req-amount-label">{type}</span>
                    <input
                      className="req-amount-input"
                      type="number" min="1" placeholder="Units"
                      value={plasmaSelections[type]}
                      onChange={e => setAmount('plasma', type, e.target.value)}
                    />
                    <span className="req-amount-unit">units</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step — Urgency */}
        {(bloodItems.length + plasmaItems.length) > 0 && (
          <div className="req-section">
            <div className="req-section-label">
              <span className="req-step">3</span> Urgency level
            </div>
            <div className="req-type-row">
              {[['standard','Standard'],['urgent','Urgent'],['critical','Critical']].map(([val, label]) => (
                <button
                  key={val}
                  className={`req-urgency-btn req-urgency-btn--${val} ${urgency === val ? 'req-urgency-btn--on' : ''}`}
                  onClick={() => setUrgency(val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {canSubmit && (
          <div className="req-summary">
            <div className="req-summary-title">Request Summary</div>
            {bloodItems.map(([t,v]) => (
              <div key={t} className="req-summary-row">
                <span className="req-summary-cat req-summary-cat--blood">Blood {t}</span>
                <span className="req-summary-val">{v} units</span>
              </div>
            ))}
            {plasmaItems.map(([t,v]) => (
              <div key={t} className="req-summary-row">
                <span className="req-summary-cat req-summary-cat--plasma">Plasma {t}</span>
                <span className="req-summary-val">{v} units</span>
              </div>
            ))}
            <div className="req-summary-row req-summary-row--urgency">
              <span className="req-summary-cat">Urgency</span>
              <span className={`req-urgency-tag req-urgency-tag--${urgency}`}>{urgency}</span>
            </div>
          </div>
        )}

        {/* Submit */}
        {!hasOrigin && (
          <div className="req-no-origin-warning">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            You must search and select your medical facility location before submitting a request.
          </div>
        )}
        <button
          className="btn btn--submit-req"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Submit Request to {facility.org}
        </button>

      </div>
    </div>
  );
}

// ── Donation Facilities Map ────────────────────────
function DonationMap({ preloadedTypes, onPreloadConsumed, onLocationSet, currentLocation }) {
  const [activeOrgs,      setActiveOrgs]      = useState(new Set(Object.keys(ORG_COLORS)));
  const [searchQuery,     setSearchQuery]     = useState(currentLocation?.name ?? '');
  const [selectedLoc,     setSelectedLoc]     = useState(currentLocation ?? null);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [selectedFacility,setSelectedFacility]= useState(null);
  const [submittedReqs,   setSubmittedReqs]   = useState([]);
  const consumedRef = useState(false);

  const toggleOrg = (org) => {
    setActiveOrgs(prev => {
      const next = new Set(prev);
      next.has(org) ? next.delete(org) : next.add(org);
      return next;
    });
  };

  const filteredLocs = searchQuery.trim().length > 0
    ? MEDICAL_LOCATIONS.filter(l =>
        `${l.name} ${l.city}`.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const selectLocation = (loc) => {
    setSelectedLoc(loc);
    setSearchQuery(loc.name);
    setShowDropdown(false);
    onLocationSet?.(loc);
  };

  const clearLocation = () => {
    setSelectedLoc(null);
    setSearchQuery('');
    onLocationSet?.(null);
  };

  const visible = FACILITIES.filter(f => activeOrgs.has(f.org)).map(f => ({
    ...f,
    distance: selectedLoc ? distanceMiles(selectedLoc.lat, selectedLoc.lng, f.lat, f.lng) : null,
  }));

  const sorted = selectedLoc ? [...visible].sort((a, b) => a.distance - b.distance) : visible;
  const nearest = selectedLoc ? sorted[0] : null;

  const handleRequestSubmit = async (payload) => {
    try {
      const res = await fetch('/api/facility-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // Show error in the submitted requests log with a failed status
        setSubmittedReqs(prev => [...prev, {
          ...payload,
          id: Date.now(),
          status: 'failed',
          message: data.message || 'Request could not be fulfilled.',
        }]);
        return;
      }

      // Success — add to log with allocated breakdown
      setSubmittedReqs(prev => [...prev, {
        ...payload,
        id: Date.now(),
        status: 'success',
        allocated: data.allocated,
        message: data.message,
      }]);

    } catch (err) {
      // Network error
      setSubmittedReqs(prev => [...prev, {
        ...payload,
        id: Date.now(),
        status: 'failed',
        message: 'Network error — could not reach the server.',
      }]);
    }
  };

  return (
    <div className="map-wrapper">

      {/* ── Location Search ── */}
      <div className="loc-search-bar">
        <div className="loc-search-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <input
          className="loc-search-input"
          type="text"
          placeholder="Search your medical facility to see distances…"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedLoc(null); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          autoComplete="off"
        />
        {searchQuery && (
          <button className="loc-clear-btn" onClick={clearLocation}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
        {showDropdown && filteredLocs.length > 0 && (
          <div className="loc-dropdown">
            {filteredLocs.map(loc => (
              <button key={loc.id} className="loc-dropdown-item" onMouseDown={() => selectLocation(loc)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4a8fbd" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <div>
                  <div className="loc-dropdown-name">{loc.name}</div>
                  <div className="loc-dropdown-city">{loc.city}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {showDropdown && searchQuery.trim().length > 1 && filteredLocs.length === 0 && (
          <div className="loc-dropdown">
            <div className="loc-dropdown-empty">No facilities found for "{searchQuery}"</div>
          </div>
        )}
      </div>

      {/* ── Preload banner — shown when redirected from dashboard alert ── */}
      {preloadedTypes && !selectedFacility && (
        <div className="preload-banner">
          <div className="preload-banner-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4a22a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <div className="preload-banner-title">Critical supply request ready</div>
              <div className="preload-banner-sub">
                Types preloaded:&nbsp;
                {[
                  ...preloadedTypes.blood.map(t  => `Blood ${t}`),
                  ...preloadedTypes.plasma.map(t => `Plasma ${t}`),
                ].join(', ')}
              </div>
            </div>
          </div>
          <div className="preload-banner-right">Click any pin to open the request panel</div>
        </div>
      )}

      {/* ── Hint when no facility selected ── */}
      {!selectedFacility && !preloadedTypes && (
        <div className="map-hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a8fbd" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Click any pin on the map to open a supply request
        </div>
      )}

      {/* ── Nearest banner ── */}
      {nearest && !selectedFacility && (
        <div className="nearest-banner">
          <div className="nearest-banner-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52a882" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span className="nearest-label">Nearest donation center</span>
          </div>
          <div className="nearest-banner-right">
            <span className="nearest-name" style={{ color: ORG_COLORS[nearest.org] }}>{nearest.name}</span>
            <span className="nearest-dist">{nearest.distance.toFixed(1)} mi away</span>
          </div>
        </div>
      )}

      {/* ── Org filters ── */}
      <div className="map-legend">
        {Object.entries(ORG_COLORS).map(([org, color]) => (
          <button
            key={org}
            className={`map-legend-btn ${activeOrgs.has(org) ? 'map-legend-btn--on' : 'map-legend-btn--off'}`}
            style={{ '--org-color': color }}
            onClick={() => toggleOrg(org)}
          >
            <span className="map-legend-dot" style={{ background: activeOrgs.has(org) ? color : '#3a4450' }} />
            {org}
          </button>
        ))}
      </div>

      {/* ── Split: map + request panel ── */}
      <div className={`map-split ${selectedFacility ? 'map-split--open' : ''}`}>

        {/* Map */}
        <div className="map-container">
          <MapContainer center={[38.5, -96]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {selectedLoc && (
              <CircleMarker center={[selectedLoc.lat, selectedLoc.lng]} radius={10}
                pathOptions={{ fillColor: '#ffffff', fillOpacity: 1, color: '#4a8fbd', weight: 3 }}>
                <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                  <div className="map-tooltip">
                    <div className="map-tooltip-org" style={{ color: '#4a8fbd' }}>Your Location</div>
                    <div className="map-tooltip-name">{selectedLoc.name}</div>
                    <div className="map-tooltip-addr">{selectedLoc.city}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            )}

            {sorted.map(f => (
              <CircleMarker
                key={f.id}
                center={[f.lat, f.lng]}
                radius={selectedFacility?.id === f.id ? 13 : (f.id === nearest?.id ? 11 : 8)}
                pathOptions={{
                  fillColor: ORG_COLORS[f.org],
                  fillOpacity: selectedFacility && selectedFacility.id !== f.id ? 0.4 : 0.95,
                  color: selectedFacility?.id === f.id ? '#fff' : (f.id === nearest?.id ? '#fff' : 'rgba(255,255,255,0.4)'),
                  weight: selectedFacility?.id === f.id ? 3 : (f.id === nearest?.id ? 2 : 1),
                }}
                eventHandlers={{ click: () => setSelectedFacility(f) }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div className="map-tooltip">
                    <div className="map-tooltip-org" style={{ color: ORG_COLORS[f.org] }}>{f.org}</div>
                    <div className="map-tooltip-name">{f.name}</div>
                    <div className="map-tooltip-addr">{f.address}</div>
                    {f.distance !== null && (
                      <div className="map-tooltip-dist">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4a8fbd" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {f.distance.toFixed(1)} mi away
                      </div>
                    )}
                    <div className="map-tooltip-click">Click to request supply</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Request Panel */}
        {selectedFacility && (
          <RequestPanel
            facility={selectedFacility}
            originLoc={selectedLoc}
            preloadedTypes={preloadedTypes}
            onClose={() => { setSelectedFacility(null); }}
            onSubmit={handleRequestSubmit}
          />
        )}
      </div>

      {/* Submitted requests log */}
      {submittedReqs.length > 0 && (
          <div className="req-log">
            <div className="req-log-title">Recent Requests ({submittedReqs.length})</div>
            {submittedReqs.map(r => (
                <div key={r.id} className={`req-log-item ${r.status === 'failed' ? 'req-log-item--failed' : ''}`}>
                  <span className="req-log-fac" style={{ color: ORG_COLORS[r.org] }}>{r.facilityName}</span>
                  <span className="req-log-detail">
          {Object.entries(r.blood).map(([t, v]) => `Blood ${t}: ${v}`).join(', ')}
                    {Object.keys(r.blood).length > 0 && Object.keys(r.plasma).length > 0 ? ' · ' : ''}
                    {Object.entries(r.plasma).map(([t, v]) => `Plasma ${t}: ${v}`).join(', ')}
        </span>
                  <span className={`req-urgency-tag req-urgency-tag--${r.urgency}`}>{r.urgency}</span>
                  {r.status === 'failed'
                      ? <span style={{ color: '#e05c5c', fontSize: 11 }}>✗ {r.message}</span>
                      : <span style={{ color: '#52a882', fontSize: 11 }}>✓ Fulfilled</span>
                  }
                </div>
            ))}
          </div>
      )}

      <div className="map-count">
        Showing {sorted.length} of {FACILITIES.length} facilities
        {selectedLoc && ` · distances from ${selectedLoc.name}`}
        {selectedFacility && ` · ${selectedFacility.name} selected`}
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────
function App() {
  const [activeTab,       setActiveTab]       = useState('dashboard');
  const [mode,            setMode]            = useState(null);
  const [bloodType,       setBloodType]       = useState('');
  const [rhFactor,        setRhFactor]        = useState('');
  const [amount,          setAmount]          = useState('');
  const [plasmaMode,      setPlasmaMode]      = useState(null);
  const [plasmaBloodType, setPlasmaBloodType] = useState('');
  const [plasmaAmount,    setPlasmaAmount]    = useState('');
  const [loading,         setLoading]         = useState(false);
  const [bloodInventory,  setBloodInventory]  = useState(null);
  const [plasmaInventory, setPlasmaInventory] = useState(null);
  const [inventoryLoading,setInventoryLoading]= useState(false);
  const [inventoryError,  setInventoryError]  = useState(null);
  const [preloadedTypes,   setPreloadedTypes]   = useState(null);
  const [facilityLocation, setFacilityLocation] = useState(null); // set when user picks their location

  // Mask values until facility location is set
  const mask = (val) => facilityLocation ? val : '—';

  const goTo = (tab, m = null, pm = null) => {
    setActiveTab(tab); setMode(m); setPlasmaMode(pm);
    setBloodType(''); setRhFactor(''); setAmount('');
    setPlasmaBloodType(''); setPlasmaAmount('');
  };

  // Called from CriticalAlerts — redirect to Facilities and preload types
  const goToFacilitiesWithTypes = (bloodTypes, plasmaTypes) => {
    setPreloadedTypes({ blood: bloodTypes, plasma: plasmaTypes });
    setActiveTab('facilities');
  };

  const loadInventory = async () => {
    setInventoryLoading(true); setInventoryError(null);
    try {
      const [bloodRes, plasmaRes] = await Promise.all([
        fetch('/api/inventory/blood'),
        fetch('/api/inventory/plasma'),
      ]);
      if (!bloodRes.ok || !plasmaRes.ok) throw new Error('Failed to load inventory');
      const [bloodData, plasmaData] = await Promise.all([bloodRes.json(), plasmaRes.json()]);
      setBloodInventory(bloodData); setPlasmaInventory(plasmaData);
    } catch (err) {
      console.error(err);
      setInventoryError('Could not load inventory. Please try again.');
    } finally { setInventoryLoading(false); }
  };

  const handleGo = async () => {
    const payload = { bloodType, rhFactor, amount: amount ? Number(amount) : 0 };
    const endpoint = mode === 'withdraw' ? '/api/withdraw' : '/api/deposit';
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Request failed');
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handlePlasmaGo = async () => {
    const payload = { bloodType: plasmaBloodType, amount: plasmaAmount ? Number(plasmaAmount) : 0 };
    const endpoint = plasmaMode === 'withdraw' ? '/api/plasma/withdraw' : '/api/plasma/deposit';
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Request failed');
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const toArray = (data) => data ? Object.entries(data).map(([type, units]) => ({ type, units })) : null;
  const bloodRows  = toArray(bloodInventory)  || STATIC_BLOOD;
  const plasmaRows = toArray(plasmaInventory) || STATIC_PLASMA;

  const ActionPair = ({ onW, onD, wLabel = 'Withdraw Blood', dLabel = 'Donate Blood', wSub = 'Used for patient transfusions', dSub = 'Add new blood donations.', icon = 'blood' }) => (
    <div className="action-cards-row">
      <div className="action-card action-card--withdraw">
        <div className="action-card-top">
          {icon === 'blood' ? <BloodDrop /> : <PlasmaIcon />}
          <div>
            <div className="action-title">{wLabel}</div>
            <div className="action-sub">{wSub}</div>
          </div>
        </div>
        <button className="btn btn--withdraw" onClick={onW}>Withdraw</button>
      </div>
      <div className="action-card action-card--donate">
        <div className="action-card-top">
          {icon === 'blood' ? <HeartIcon /> : <PlasmaIcon />}
          <div>
            <div className="action-title">{dLabel}</div>
            <div className="action-sub">{dSub}</div>
          </div>
        </div>
        <button className="btn btn--donate" onClick={onD}>Donate</button>
      </div>
    </div>
  );

  return (
    <div className="app">

      {/* ── Navbar ── */}
      <header className="navbar">
        <div className="navbar-left">
          <div className="navbar-logo"><BloodDrop size={18} color="#e05c5c" /></div>
          <span className="navbar-title">Blood Bank Management System</span>
          <span className="navbar-badge">BMS</span>
        </div>
        <div className="navbar-right">
          {facilityLocation
            ? (
              <div className="navbar-location">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#52a882" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span className="navbar-location-name">{facilityLocation.name}</span>
                <button className="navbar-location-clear" onClick={() => setFacilityLocation(null)} title="Clear location">×</button>
              </div>
            ) : (
              <button className="navbar-location-unset" onClick={() => goTo('facilities')}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Set facility location
              </button>
            )
          }
          <div className="nav-divider" />
          <div className="avatar">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="#9ba8b8">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5a6a7e" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <nav className="tab-bar">
        {[['dashboard','Dashboard'],['actions','Blood Actions'],['plasma','Plasma'],['inventory','Inventory'],['facilities','Facilities']].map(([id, label]) => (
          <button key={id} className={`tab-btn ${activeTab === id ? 'tab-active' : ''}`} onClick={() => goTo(id)}>
            {label}
          </button>
        ))}
      </nav>

      <main className="main">

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (<>
          {!facilityLocation && (
            <div className="facility-lock-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Values are hidden until you set your facility location.</span>
              <button className="facility-lock-link" onClick={() => goTo('facilities')}>
                Set location in Facilities tab →
              </button>
            </div>
          )}
          <InventoryStats bloodRows={bloodRows} plasmaRows={plasmaRows} mask={mask} isUnlocked={!!facilityLocation} />
          {facilityLocation && <CriticalAlerts bloodRows={bloodRows} plasmaRows={plasmaRows} onRequestSupply={goToFacilitiesWithTypes} />}

          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Blood Actions</span>
              <span className="dots-btn">···</span>
            </div>
            <ActionPair icon="blood" onW={() => goTo('actions','withdraw')} onD={() => goTo('actions','deposit')} />
          </div>

          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Plasma Actions</span>
              <span className="dots-btn">···</span>
            </div>
            <ActionPair icon="plasma" onW={() => goTo('plasma',null,'withdraw')} onD={() => goTo('plasma',null,'deposit')} wLabel="Withdraw Plasma" dLabel="Donate Plasma" wSub="Used for patient treatment" dSub="Add new plasma donations." />
          </div>

          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Current Inventory</span>
              <button className="link-btn" onClick={() => goTo('inventory')}>View Full Inventory →</button>
            </div>
            <div className="inv-two-col">
              <div className="inv-tables">
                <p className="inv-sub-label">Blood</p>
                <table className="inv-table">
                  <thead><tr><th>Type</th><th>Units</th></tr></thead>
                  <tbody>{bloodRows.map(r => <tr key={r.type}><td>{r.type}</td><td className={!facilityLocation ? 'masked-cell' : ''}>{mask(r.units)}</td></tr>)}</tbody>
                </table>
                <p className="inv-sub-label" style={{marginTop:'1.5rem'}}>Plasma</p>
                <table className="inv-table">
                  <thead><tr><th>Type</th><th>Units</th></tr></thead>
                  <tbody>{plasmaRows.map(r => <tr key={r.type}><td>{r.type}</td><td className={!facilityLocation ? 'masked-cell' : ''}>{mask(r.units)}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="inv-charts">
                {facilityLocation
                  ? <><BarChart data={bloodRows} color="linear-gradient(to top,#8b1a1a,#e05c5c)" label="Blood Units by Type" /><BarChart data={plasmaRows} color="linear-gradient(to top,#1a4a6b,#7eaacc)" label="Plasma Units by Type" /></>
                  : <div className="chart-locked"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#55636f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Charts locked until location is set</span></div>
                }
              </div>
            </div>
          </div>

          {/* Heatmaps */}
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Supply Heatmap</span>
              <div className="heatmap-legend-inline">
                <span className="heatmap-legend-dot" style={{background:'#c94040'}} /> Critical &lt;25
                <span className="heatmap-legend-dot" style={{background:'#b5820a', marginLeft:'0.75rem'}} /> Low 25–50
                <span className="heatmap-legend-dot" style={{background:'#3a8c5c', marginLeft:'0.75rem'}} /> Good &gt;50
              </div>
            </div>
            {facilityLocation
              ? <div className="heatmap-two-col"><BloodSupplyHeatmap inventory={bloodRows} label="Blood" /><BloodSupplyHeatmap inventory={plasmaRows} label="Plasma" /></div>
              : <div className="chart-locked chart-locked--tall"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#55636f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Heatmap locked until location is set</span></div>
            }
          </div>
        </>)}

        {/* ── BLOOD ACTIONS ── */}
        {activeTab === 'actions' && (
          <div className="section-card">
            <div className="section-header"><span className="section-title">Blood Actions</span></div>
            {mode === null ? (
              <ActionPair icon="blood" onW={() => setMode('withdraw')} onD={() => setMode('deposit')} />
            ) : (
              <div className="form-panel">
                <span className={`form-badge ${mode==='withdraw'?'form-badge--w':'form-badge--d'}`}>
                  {mode==='withdraw'?'Withdraw Blood':'Donate Blood'}
                </span>
                <div className="form-fields">
                  <div className="form-row">
                    <label htmlFor="blood-type">Blood type</label>
                    <select id="blood-type" value={bloodType} onChange={e=>setBloodType(e.target.value)}>
                      <option value="">Select blood type</option>
                      <option value="A">A</option><option value="B">B</option>
                      <option value="AB">AB</option><option value="O">O</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label htmlFor="rh-factor">Rh factor</label>
                    <select id="rh-factor" value={rhFactor} onChange={e=>setRhFactor(e.target.value)}>
                      <option value="">Select Rh factor</option>
                      <option value="+">Rh+</option><option value="-">Rh-</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label htmlFor="amount">Amount (ml)</label>
                    <input id="amount" type="number" min="0" placeholder="e.g. 450" value={amount} onChange={e=>setAmount(e.target.value)} />
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn btn--secondary" onClick={()=>setMode(null)}>Cancel</button>
                  <button className={`btn ${mode==='withdraw'?'btn--withdraw':'btn--donate'}`} onClick={handleGo} disabled={loading||!bloodType||!rhFactor||!amount}>
                    {loading?'Sending…':'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PLASMA ── */}
        {activeTab === 'plasma' && (
          <div className="section-card">
            <div className="section-header"><span className="section-title">Plasma</span></div>
            {plasmaMode === null ? (
              <ActionPair icon="plasma" onW={()=>setPlasmaMode('withdraw')} onD={()=>setPlasmaMode('deposit')} wLabel="Withdraw Plasma" dLabel="Donate Plasma" wSub="Used for patient treatment" dSub="Add new plasma donations." />
            ) : (
              <div className="form-panel">
                <span className={`form-badge ${plasmaMode==='withdraw'?'form-badge--w':'form-badge--d'}`}>
                  {plasmaMode==='withdraw'?'Withdraw Plasma':'Donate Plasma'}
                </span>
                <div className="form-fields">
                  <div className="form-row">
                    <label htmlFor="plasma-blood-type">Blood type</label>
                    <select id="plasma-blood-type" value={plasmaBloodType} onChange={e=>setPlasmaBloodType(e.target.value)}>
                      <option value="">Select blood type</option>
                      <option value="A">A</option><option value="B">B</option>
                      <option value="AB">AB</option><option value="O">O</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label htmlFor="plasma-amount">Amount (ml)</label>
                    <input id="plasma-amount" type="number" min="0" placeholder="e.g. 250" value={plasmaAmount} onChange={e=>setPlasmaAmount(e.target.value)} />
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn btn--secondary" onClick={()=>setPlasmaMode(null)}>Cancel</button>
                  <button className={`btn ${plasmaMode==='withdraw'?'btn--withdraw':'btn--donate'}`} onClick={handlePlasmaGo} disabled={loading||!plasmaBloodType||!plasmaAmount}>
                    {loading?'Sending…':'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── INVENTORY ── */}
        {activeTab === 'inventory' && (
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Inventory</span>
              <button className="btn btn--refresh" onClick={loadInventory} disabled={inventoryLoading}>
                {inventoryLoading?'Loading…':'↻ Refresh'}
              </button>
            </div>
            {!facilityLocation && (
              <div className="facility-lock-banner" style={{marginBottom:'1rem'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Values are hidden until you set your facility location.</span>
                <button className="facility-lock-link" onClick={() => goTo('facilities')}>Set location in Facilities tab →</button>
              </div>
            )}
            {inventoryError && <p className="error-text">{inventoryError}</p>}
            {!inventoryLoading && !inventoryError && !bloodInventory && !plasmaInventory && (
              <p className="placeholder-text">Click "Refresh" to load current balances from the server.</p>
            )}
            <div className="inv-two-col">
              <div className="inv-tables">
                <p className="inv-sub-label">Blood</p>
                <table className="inv-table inv-table--full">
                  <thead><tr><th>Type</th><th>Balance (ml)</th></tr></thead>
                  <tbody>{bloodRows.map(r=><tr key={r.type}><td>{r.type}</td><td className={!facilityLocation?'masked-cell':''}>{mask(r.units)}</td></tr>)}</tbody>
                </table>
                <p className="inv-sub-label" style={{marginTop:'1.75rem'}}>Plasma</p>
                <table className="inv-table inv-table--full">
                  <thead><tr><th>Type</th><th>Balance (ml)</th></tr></thead>
                  <tbody>{plasmaRows.map(r=><tr key={r.type}><td>{r.type}</td><td className={!facilityLocation?'masked-cell':''}>{mask(r.units)}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="inv-charts">
                {facilityLocation
                  ? <><BarChart data={bloodRows} color="linear-gradient(to top,#8b1a1a,#e05c5c)" label="Blood Units by Type" /><BarChart data={plasmaRows} color="linear-gradient(to top,#1a4a6b,#7eaacc)" label="Plasma Units by Type" /></>
                  : <div className="chart-locked chart-locked--tall"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#55636f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Charts locked until location is set</span></div>
                }
              </div>
            </div>
          </div>
        )}

        {/* ── FACILITIES ── */}
        {activeTab === 'facilities' && (
          <div className="section-card section-card--map">
            <div className="section-header">
              <span className="section-title">Donation Facilities</span>
              <span className="section-sub">{FACILITIES.length} locations across the US</span>
            </div>
            <DonationMap
              preloadedTypes={preloadedTypes}
              onPreloadConsumed={() => setPreloadedTypes(null)}
              onLocationSet={(loc) => setFacilityLocation(loc)}
              currentLocation={facilityLocation}
            />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;