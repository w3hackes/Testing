import './App.css';
import { useState } from 'react';

function App() {
    const [activeTab, setActiveTab] = useState('actions'); // 'actions' | 'plasma' | 'inventory'
    const [mode, setMode] = useState(null); // null | 'withdraw' | 'deposit'
    const [bloodType, setBloodType] = useState('');
    const [rhFactor, setRhFactor] = useState('');
    const [amount, setAmount] = useState('');
    const [plasmaMode, setPlasmaMode] = useState(null);
    const [plasmaBloodType, setPlasmaBloodType] = useState('');
    const [plasmaAmount, setPlasmaAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const withDrawBlood = () => setMode('withdraw');
    const depositBlood = () => setMode('deposit');
    const goBack = () => {
        setMode(null);
        setBloodType('');
        setRhFactor('');
        setAmount('');
    };

    const withDrawPlasma = () => setPlasmaMode('withdraw');
    const depositPlasma = () => setPlasmaMode('deposit');
    const goBackPlasma = () => {
        setPlasmaMode(null);
        setPlasmaBloodType('');
        setPlasmaAmount('');
    };

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
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App">
            <div className="app-center">
                <div className="main-heading">
                    <h1>Blood Bank Management System(BMS)</h1>
                    <p className="subtext">Manage donations, withdrawals, and blood inventory</p>
                </div>

                <nav className="tabs">
                    <button
                        className={`tab ${activeTab === 'actions' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('actions')}
                    >
                        Blood Actions
                    </button>
                    <button
                        className={`tab ${activeTab === 'plasma' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('plasma')}
                    >
                        Plasma
                    </button>
                    <button
                        className={`tab ${activeTab === 'inventory' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('inventory')}
                    >
                        Inventory
                    </button>
                </nav>

                <header className="App-header">
                    {activeTab === 'actions' && (
                        <>
                    <p className="section-title">Blood Actions</p>

                    <div className="button-row">
                        {mode === null && (
                            <>
                                <button className="btn left" onClick={withDrawBlood}>Withdraw</button>
                                <button className="btn right" onClick={depositBlood}>Donate</button>
                            </>
                        )}
                        {mode === 'withdraw' && (
                            <>
                                <button className="btn left" onClick={withDrawBlood}>Withdraw</button>
                                <button className="btn secondary" onClick={goBack}>Back</button>
                            </>
                        )}
                        {mode === 'deposit' && (
                            <>
                                <button className="btn right" onClick={depositBlood}>Donate</button>
                                <button className="btn secondary" onClick={goBack}>Back</button>
                            </>
                        )}
                    </div>

                    {mode !== null && (
                        <div className="form-container">
                            <div className="form-row">
                                <label htmlFor="blood-type">Blood type:</label>
                                <select id="blood-type" className={bloodType ? 'has-value' : ''} value={bloodType} onChange={e => setBloodType(e.target.value)}>
                                    <option value="">Select blood type</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="AB">AB</option>
                                    <option value="O">O</option>
                                </select>
                            </div>

                            <div className="form-row">
                                <label htmlFor="rh-factor">Rh factor:</label>
                                <select id="rh-factor" className={rhFactor ? 'has-value' : ''} value={rhFactor} onChange={e => setRhFactor(e.target.value)}>
                                    <option value="">Select Rh factor</option>
                                    <option value="+">Rh+</option>
                                    <option value="-">Rh-</option>
                                </select>
                            </div>

                            <div className="form-row">
                                <label htmlFor="amount">Amount (ml):</label>
                                <input id="amount" type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
                            </div>

                            <div className="form-row">
                                <button
                                    className="btn go"
                                    onClick={handleGo}
                                    disabled={loading || !bloodType || !rhFactor || !amount}
                                >
                                    {loading ? 'Sending…' : 'Go'}
                                </button>
                            </div>
                        </div>
                    )}
                        </>
                    )}
                    {activeTab === 'plasma' && (
                        <>
                            <p className="section-title">Plasma</p>

                            <div className="button-row">
                                {plasmaMode === null && (
                                    <>
                                        <button className="btn left" onClick={withDrawPlasma}>Withdraw</button>
                                        <button className="btn right" onClick={depositPlasma}>Donate</button>
                                    </>
                                )}
                                {plasmaMode === 'withdraw' && (
                                    <>
                                        <button className="btn left" onClick={withDrawPlasma}>Withdraw</button>
                                        <button className="btn secondary" onClick={goBackPlasma}>Back</button>
                                    </>
                                )}
                                {plasmaMode === 'deposit' && (
                                    <>
                                        <button className="btn right" onClick={depositPlasma}>Donate</button>
                                        <button className="btn secondary" onClick={goBackPlasma}>Back</button>
                                    </>
                                )}
                            </div>

                            {plasmaMode !== null && (
                                <div className="form-container">
                                    <div className="form-row">
                                        <label htmlFor="plasma-blood-type">Blood type:</label>
                                        <select id="plasma-blood-type" className={plasmaBloodType ? 'has-value' : ''} value={plasmaBloodType} onChange={e => setPlasmaBloodType(e.target.value)}>
                                            <option value="">Select blood type</option>
                                            <option value="A">A</option>
                                            <option value="B">B</option>
                                            <option value="AB">AB</option>
                                            <option value="O">O</option>
                                        </select>
                                    </div>

                                    <div className="form-row">
                                        <label htmlFor="plasma-amount">Amount (ml):</label>
                                        <input id="plasma-amount" type="number" min="0" value={plasmaAmount} onChange={e => setPlasmaAmount(e.target.value)} />
                                    </div>

                                    <div className="form-row">
                                        <button
                                            className="btn go"
                                            onClick={handlePlasmaGo}
                                            disabled={loading || !plasmaBloodType || !plasmaAmount}
                                        >
                                            {loading ? 'Sending…' : 'Go'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {activeTab === 'inventory' && (
                        <div className="tab-panel">
                            <p className="section-title">Inventory</p>
                            <p className="tab-placeholder">View and manage blood inventory by type and Rh factor.</p>
                        </div>
                    )}
                </header>
            </div>
        </div>
    );
}

export default App;