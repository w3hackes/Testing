import './App.css';
import { useState } from 'react';

function App() {
    const [showDepositForm, setShowDepositForm] = useState(false);
    let withdraw = 0;
    let deposit = 0;

    const withDrawBlood = () => {
        withdraw++;
        setShowDepositForm(true);  // show form for withdraw too
    }
    const depositBlood = () => {
        deposit++;
        setShowDepositForm(true);
    }

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
                        <button className="btn primary" onClick = {withDrawBlood}>Withdraw</button>
                        <button className="btn secondary" onClick = {depositBlood}> Donate</button>
                    </div>

                    {showDepositForm && (
                        <div className="form-container">
                            <div className="form-row">
                                <label htmlFor="blood-type">Choose the donor's blood type:</label>
                                <select id="blood-type" name="blood-type">
                                    <option value="">Select blood type</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="AB">AB</option>
                                    <option value="O">O</option>
                                </select>
                            </div>

                            <div className="form-row">
                                <label htmlFor="rh-factor">Choose the donor's Rh factor:</label>
                                <select id="rh-factor" name="rh-factor">
                                    <option value="">Select Rh factor</option>
                                    <option value="+">Rh+</option>
                                    <option value="-">Rh-</option>
                                </select>
                            </div>

                            <div className="form-row">
                                <label htmlFor="amount">Amount (ml):</label>
                                <input id="amount" name="amount" type="number" min="0" />
                            </div>
                        </div>
                    )}
                </header>
            </div>
        </div>
    );
}

export default App;