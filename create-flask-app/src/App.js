import './App.css';
import { useState } from 'react';

function App() {
    const [mode, setMode] = useState(null); // null | 'withdraw' | 'deposit'
    const [bloodType, setBloodType] = useState('');
    const [rhFactor, setRhFactor] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const withDrawBlood = () => setMode('withdraw');
    const depositBlood = () => setMode('deposit');
    const goBack = () => {
        setMode(null);
        setBloodType('');
        setRhFactor('');
        setAmount('');
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
            // optional: show success, reset form, go back
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
                    <h1>Blood Bank Management System</h1>
                    <p className="subtext">Manage donations, withdrawals, and blood inventory</p>
                </div>

                <header className="App-header">
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
                                <select id="blood-type" value={bloodType} onChange={e => setBloodType(e.target.value)}>
                                    <option value="">Select blood type</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="AB">AB</option>
                                    <option value="O">O</option>
                                </select>
                            </div>

                            <div className="form-row">
                                <label htmlFor="rh-factor">Rh factor:</label>
                                <select id="rh-factor" value={rhFactor} onChange={e => setRhFactor(e.target.value)}>
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
                </header>
            </div>
        </div>
    );
}

export default App;