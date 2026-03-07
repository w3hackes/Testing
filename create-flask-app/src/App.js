import { useState } from "react";
import "./App.css";

function App() {
    const [withdraw, setWithdraw] = useState(0);
    const [deposit, setDeposit] = useState(0);
    const [data, setData] = useState(null);

    const withDrawBlood = async () => {
        setWithdraw(withdraw + 1);

        const res = await fetch("http://localhost:5000/api/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "withdraw" })
        });

        const json = await res.json();
        setData(json);
    };

    const depositBlood = async () => {
        setDeposit(deposit + 1);

        const res = await fetch("http://localhost:5000/api/deposit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "deposit" })
        });

        const json = await res.json();
        setData(json);
    };

    return (
        <div className="App">

            {/* Professional heading */}

            <div className="main-heading">
                <h1>Blood Bank Management System</h1>
                <h1>{data ? JSON.stringify(data) : "No data yet"}</h1>
                <p className="subtext">Manage donations, withdrawals, and blood inventory</p>
            </div>

            <header className="App-header">
                <p className="section-title">Blood Actions</p>

                <div className="button-row">
                    <button className="btn primary" onClick={withDrawBlood}>
                        Withdraw
                    </button>

                    <button className="btn secondary" onClick={depositBlood}>
                        Donate
                    </button>
                </div>
            </header>
            <p> deposit </p>
            <p> withdraw</p>
            <label for= "blood-type"> Choose the donors blood type:</label>
            <input list = "blood-types" id = "blood-type" name = "blood-type" />
            <select name = "blood-type">
                <option value ="A"></option>
                <option value ="B"></option>
                <option value ="AB"></option>
                <option value = "O"></option>
            </select>

        </div>
    );
}

export default App;