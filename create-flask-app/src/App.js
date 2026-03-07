import './App.css';

function App() {
    let withdraw = 0;
    let deposit = 0;

    const withDrawBlood = () => {
        withdraw++;
    }
    const depositBlood = () => {
        deposit++;
    }

    return (
        <div className="App">

            {/* Professional heading */}

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
            </header>
            <p> deposit </p>
            <p> withdraw</p>
            <label for= "Blood type"> Choose the donors blood type:</label>
            <input list = "Blood types" id = "Blood type" name = "blood Type" />
            <datalist id = "Blood type">
                <option value ="A"></option>
                <option value ="B"></option>
                <option value ="AB"></option>
                <option value = "O"></option>
            </datalist>

        </div>
    );
}

export default App;