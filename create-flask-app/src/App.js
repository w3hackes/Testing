import './App.css';
import { useState } from 'react';

// ── Icons ──────────────────────────────────────────
const BloodDrop = ({ color = "#fca5a5", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C12 2 5 9.5 5 14a7 7 0 0014 0C19 9.5 12 2 12 2z" fill={color} />
  </svg>
);

const HeartIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const PlasmaIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
    <circle cx="12" cy="9" r="2.5" fill="#93c5fd" stroke="none" />
  </svg>
);

const BellIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

// ── Static fallback inventory (shown until API loads) ──
const STATIC_BLOOD = [
  { type: 'A+', units: 120 }, { type: 'A-', units: 45 },
  { type: 'B+', units: 65  }, { type: 'B-', units: 98 },
  { type: 'O+', units: 210 }, { type: 'O-', units: 60 },
  { type: 'AB+',units: 30  }, { type: 'AB-',units: 20 },
];

const STATIC_PLASMA = [
  { type: 'A',  units: 80 },
  { type: 'B',  units: 45 },
  { type: 'AB', units: 90 },
  { type: 'O',  units: 97 },
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

  // ── Navigation helper ──
  const goTo = (tab, m = null, pm = null) => {
    setActiveTab(tab);
    setMode(m);
    setPlasmaMode(pm);
    setBloodType(''); setRhFactor(''); setAmount('');
    setPlasmaBloodType(''); setPlasmaAmount('');
  };

  // ── API: load inventory (original logic preserved) ──
  const loadInventory = async () => {
    setInventoryLoading(true);
    setInventoryError(null);
    try {
      const [bloodRes, plasmaRes] = await Promise.all([
        fetch('/api/inventory/blood'),
        fetch('/api/inventory/plasma'),
      ]);
      if (!bloodRes.ok || !plasmaRes.ok) throw new Error('Failed to load inventory');
      const [bloodData, plasmaData] = await Promise.all([
        bloodRes.json(),
        plasmaRes.json(),
      ]);
      setBloodInventory(bloodData);
      setPlasmaInventory(plasmaData);
    } catch (err) {
      console.error(err);
      setInventoryError('Could not load inventory. Please try again.');
    } finally {
      setInventoryLoading(false);
    }
  };

  // ── API: blood actions ──
  const handleGo = async () => {
    const payload = { bloodType, rhFactor, amount: amount ? Number(amount) : 0 };
    const endpoint = mode === 'withdraw' ? '/api/withdraw' : '/api/deposit';
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Request failed');
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // ── API: plasma actions ──
  const handlePlasmaGo = async () => {
    const payload = { bloodType: plasmaBloodType, amount: plasmaAmount ? Number(plasmaAmount) : 0 };
    const endpoint = plasmaMode === 'withdraw' ? '/api/plasma/withdraw' : '/api/plasma/deposit';
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Request failed');
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // ── Convert API object response to array ──
  const toArray = (data) =>
    data
      ? Object.entries(data).map(([type, units]) => ({ type, units }))
      : null;

  const bloodRows  = toArray(bloodInventory)  || STATIC_BLOOD;
  const plasmaRows = toArray(plasmaInventory) || STATIC_PLASMA;

  // ── Reusable action card pair ──
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
          <div className="navbar-logo"><BloodDrop size={18} /></div>
          <span className="navbar-title">Blood Bank Management System (BMS)</span>
        </div>
        <div className="navbar-right">
          <button className="icon-btn">
            <BellIcon />
            <span className="notif-badge">3</span>
          </button>
          <button className="icon-btn"><BellIcon /></button>
          <div className="avatar">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="#8a9bc0">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4a5a7a" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <nav className="tab-bar">
        {[
          ['dashboard', 'Dashboard'],
          ['actions',   'Blood Actions'],
          ['plasma',    'Plasma'],
          ['inventory', 'Inventory'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`tab-btn ${activeTab === id ? 'tab-active' : ''}`}
            onClick={() => goTo(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Main Content ── */}
      <main className="main">

        {/* ════════════════ DASHBOARD ════════════════ */}
        {activeTab === 'dashboard' && (<>

          {/* Summary cards */}
          <div className="summary-row">
            <div className="summary-card">
              <div className="summary-card-inner">
                <BloodDrop />
                <div>
                  <div className="summary-label">Total Blood Units</div>
                  <div className="summary-value">1,245</div>
                </div>
              </div>
              <div className="summary-ghost">1,245</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-inner">
                <BloodDrop color="#93c5fd" />
                <div>
                  <div className="summary-label">Plasma Units</div>
                  <div className="summary-value">312</div>
                </div>
              </div>
              <div className="alert-pill"><BellIcon size={12} /> 3</div>
            </div>
          </div>

          {/* Blood Actions */}
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Blood Actions</span>
              <span className="dots-btn">···</span>
            </div>
            <ActionPair
              icon="blood"
              onW={() => goTo('actions', 'withdraw')}
              onD={() => goTo('actions', 'deposit')}
            />
          </div>

          {/* Plasma Actions */}
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Plasma Actions</span>
              <span className="dots-btn">···</span>
            </div>
            <ActionPair
              icon="plasma"
              onW={() => goTo('plasma', null, 'withdraw')}
              onD={() => goTo('plasma', null, 'deposit')}
              wLabel="Withdraw Plasma" dLabel="Donate Plasma"
              wSub="Used for patient treatment" dSub="Add new plasma donations."
            />
          </div>

          {/* Inventory preview */}
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Current Inventory</span>
              <button className="link-btn" onClick={() => goTo('inventory')}>View Full Inventory</button>
            </div>
            <div className="inv-two-col">
              {/* Left: tables */}
              <div className="inv-tables">
                <p className="inv-sub-label">Blood</p>
                <table className="inv-table">
                  <thead><tr><th>Blood Type</th><th>Units Available</th></tr></thead>
                  <tbody>
                    {bloodRows.map(r => <tr key={r.type}><td>{r.type}</td><td>{r.units}</td></tr>)}
                  </tbody>
                </table>

                <p className="inv-sub-label" style={{ marginTop: '1.5rem' }}>Plasma</p>
                <table className="inv-table">
                  <thead><tr><th>Blood Type</th><th>Units Available</th></tr></thead>
                  <tbody>
                    {plasmaRows.map(r => <tr key={r.type}><td>{r.type}</td><td>{r.units}</td></tr>)}
                  </tbody>
                </table>
              </div>

              {/* Right: bar charts */}
              <div className="inv-charts">
                <BarChart
                  data={bloodRows}
                  color="linear-gradient(to top, #b91c1c, #f87171)"
                  label="Blood Units by Type"
                />
                <BarChart
                  data={plasmaRows}
                  color="linear-gradient(to top, #1d4ed8, #93c5fd)"
                  label="Plasma Units by Type"
                />
              </div>
            </div>
          </div>
        </>)}

        {/* ════════════════ BLOOD ACTIONS ════════════════ */}
        {activeTab === 'actions' && (
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Blood Actions</span>
            </div>
            {mode === null
              ? (
                <ActionPair
                  icon="blood"
                  onW={() => setMode('withdraw')}
                  onD={() => setMode('deposit')}
                />
              ) : (
                <div className="form-panel">
                  <span className={`form-badge ${mode === 'withdraw' ? 'form-badge--w' : 'form-badge--d'}`}>
                    {mode === 'withdraw' ? 'Withdraw Blood' : 'Donate Blood'}
                  </span>
                  <div className="form-fields">
                    <div className="form-row">
                      <label htmlFor="blood-type">Blood type</label>
                      <select id="blood-type" value={bloodType} onChange={e => setBloodType(e.target.value)}>
                        <option value="">Select blood type</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                        <option value="O">O</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label htmlFor="rh-factor">Rh factor</label>
                      <select id="rh-factor" value={rhFactor} onChange={e => setRhFactor(e.target.value)}>
                        <option value="">Select Rh factor</option>
                        <option value="+">Rh+</option>
                        <option value="-">Rh-</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label htmlFor="amount">Amount (ml)</label>
                      <input id="amount" type="number" min="0" placeholder="e.g. 450" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn--secondary" onClick={() => setMode(null)}>Cancel</button>
                    <button
                      className={`btn ${mode === 'withdraw' ? 'btn--withdraw' : 'btn--donate'}`}
                      onClick={handleGo}
                      disabled={loading || !bloodType || !rhFactor || !amount}
                    >
                      {loading ? 'Sending…' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* ════════════════ PLASMA ════════════════ */}
        {activeTab === 'plasma' && (
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Plasma</span>
            </div>
            {plasmaMode === null
              ? (
                <ActionPair
                  icon="plasma"
                  onW={() => setPlasmaMode('withdraw')}
                  onD={() => setPlasmaMode('deposit')}
                  wLabel="Withdraw Plasma" dLabel="Donate Plasma"
                  wSub="Used for patient treatment" dSub="Add new plasma donations."
                />
              ) : (
                <div className="form-panel">
                  <span className={`form-badge ${plasmaMode === 'withdraw' ? 'form-badge--w' : 'form-badge--d'}`}>
                    {plasmaMode === 'withdraw' ? 'Withdraw Plasma' : 'Donate Plasma'}
                  </span>
                  <div className="form-fields">
                    <div className="form-row">
                      <label htmlFor="plasma-blood-type">Blood type</label>
                      <select id="plasma-blood-type" value={plasmaBloodType} onChange={e => setPlasmaBloodType(e.target.value)}>
                        <option value="">Select blood type</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                        <option value="O">O</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label htmlFor="plasma-amount">Amount (ml)</label>
                      <input id="plasma-amount" type="number" min="0" placeholder="e.g. 250" value={plasmaAmount} onChange={e => setPlasmaAmount(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn--secondary" onClick={() => setPlasmaMode(null)}>Cancel</button>
                    <button
                      className={`btn ${plasmaMode === 'withdraw' ? 'btn--withdraw' : 'btn--donate'}`}
                      onClick={handlePlasmaGo}
                      disabled={loading || !plasmaBloodType || !plasmaAmount}
                    >
                      {loading ? 'Sending…' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* ════════════════ INVENTORY ════════════════ */}
        {activeTab === 'inventory' && (
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Inventory</span>
              <button
                className="btn btn--refresh"
                onClick={loadInventory}
                disabled={inventoryLoading}
              >
                {inventoryLoading ? 'Loading…' : '↻ Refresh'}
              </button>
            </div>

            {inventoryError && <p className="error-text">{inventoryError}</p>}

            {!inventoryLoading && !inventoryError && !bloodInventory && !plasmaInventory && (
              <p className="placeholder-text">Click "Refresh" to load current balances from the server.</p>
            )}

            <div className="inv-two-col">
              <div className="inv-tables">
                <p className="inv-sub-label">Blood</p>
                <table className="inv-table inv-table--full">
                  <thead><tr><th>Type</th><th>Balance (ml)</th></tr></thead>
                  <tbody>
                    {bloodRows.map(r => <tr key={r.type}><td>{r.type}</td><td>{r.units}</td></tr>)}
                  </tbody>
                </table>

                <p className="inv-sub-label" style={{ marginTop: '1.75rem' }}>Plasma</p>
                <table className="inv-table inv-table--full">
                  <thead><tr><th>Type</th><th>Balance (ml)</th></tr></thead>
                  <tbody>
                    {plasmaRows.map(r => <tr key={r.type}><td>{r.type}</td><td>{r.units}</td></tr>)}
                  </tbody>
                </table>
              </div>

              <div className="inv-charts">
                <BarChart
                  data={bloodRows}
                  color="linear-gradient(to top, #b91c1c, #f87171)"
                  label="Blood Units by Type"
                />
                <BarChart
                  data={plasmaRows}
                  color="linear-gradient(to top, #1d4ed8, #93c5fd)"
                  label="Plasma Units by Type"
                />
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;