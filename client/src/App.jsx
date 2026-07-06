import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

function Home() {
  return (
    <div>
      <h1>QuickPick
      </h1>
      <p>Pre-order your favorite food from nearby shops and pick it up when it's ready—no queues, no waiting.</p>

      <Link to="/menu">
        <button>View Menu</button>
      </Link>

      <Link to="/login">
        <button>Login</button>
      </Link>
    </div>
  );
}

function Menu() {
  return (
    <div>
      <h2>Today's Menu</h2>
      <p>Items will come here.</p>
    </div>
  );
}

function Login() {
  return (
    <div>
      <h2>Login</h2>
      <input placeholder="Mobile Number" />
      <br />
      <input placeholder="Password" type="password" />
      <br />
      <button>Login</button>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link> | <Link to="/menu">Menu</Link> |{" "}
        <Link to="/login">Login</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;