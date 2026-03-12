import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '20px',
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      color: '#333',
      padding: '40px',
      borderRadius: '15px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
      maxWidth: '600px',
      width: '100%',
      textAlign: 'center',
    },
    title: {
      fontSize: '2.5rem',
      marginBottom: '20px',
      color: '#667eea',
    },
    subtitle: {
      fontSize: '1.2rem',
      marginBottom: '30px',
      color: '#666',
    },
    button: {
      backgroundColor: '#667eea',
      color: 'white',
      border: 'none',
      padding: '15px 30px',
      fontSize: '1.1rem',
      borderRadius: '8px',
      cursor: 'pointer',
      margin: '10px',
      transition: 'all 0.3s ease',
      textDecoration: 'none',
      display: 'inline-block',
    },
    badge: {
      display: 'inline-block',
      backgroundColor: '#764ba2',
      color: 'white',
      padding: '8px 20px',
      borderRadius: '20px',
      fontSize: '0.9rem',
      marginBottom: '20px',
    },
    nav: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    info: {
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      padding: '15px',
      borderRadius: '8px',
      marginTop: '20px',
      fontSize: '0.9rem',
    },
  };

  const HomePage = () => (
    <div style={styles.card}>
      <div style={styles.badge}>Environment: Web 1 (Blue)</div>
      <h1 style={styles.title}>Welcome to Web 1!</h1>
      <p style={styles.subtitle}>
        This is the Web 1 React application with hash-based routing
      </p>
      <div style={styles.nav}>
        <Link to="/second" style={styles.button}>
          Go to Second Page
        </Link>
        <Link to="/about" style={styles.button}>
          About
        </Link>
        <Link to="/dashboard" style={styles.button}>
          Dashboard
        </Link>
      </div>
      <div style={styles.info}>
        <strong>Routing:</strong> Hash-based (/#/route)<br/>
        <strong>Framework:</strong> React + Vite<br/>
        <strong>Deployment:</strong> Blue/Green
      </div>
    </div>
  );

  const SecondPage = () => (
    <div style={styles.card}>
      <div style={styles.badge}>Environment: Web 1 (Blue)</div>
      <h1 style={styles.title}>Welcome to 2nd Page in Web 1!</h1>
      <p style={styles.subtitle}>
        This is the second page of Web 1 application
      </p>
      <div style={styles.nav}>
        <Link to="/" style={styles.button}>
          Back to Home
        </Link>
        <Link to="/about" style={styles.button}>
          About
        </Link>
      </div>
    </div>
  );

  const AboutPage = () => (
    <div style={styles.card}>
      <div style={styles.badge}>Environment: Web 1 (Blue)</div>
      <h1 style={styles.title}>About Web 1</h1>
      <p style={styles.subtitle}>
        Blue/Green Deployment Demo Application
      </p>
      <div style={styles.info}>
        <h3 style={{color: '#667eea', marginTop: 0}}>Features:</h3>
        <ul style={{textAlign: 'left', lineHeight: '1.8'}}>
          <li>✅ Hash-based routing</li>
          <li>✅ Zero downtime deployment</li>
          <li>✅ Instant rollback capability</li>
          <li>✅ Separate blue/green buckets</li>
          <li>✅ Stage variable control</li>
        </ul>
      </div>
      <div style={styles.nav}>
        <Link to="/" style={styles.button}>
          Home
        </Link>
        <Link to="/dashboard" style={styles.button}>
          Dashboard
        </Link>
      </div>
    </div>
  );

  const DashboardPage = () => {
    const [count, setCount] = useState(0);
    
    return (
      <div style={styles.card}>
        <div style={styles.badge}>Environment: Web 1 (Blue)</div>
        <h1 style={styles.title}>Dashboard</h1>
        <p style={styles.subtitle}>
          Interactive dashboard with state management
        </p>
        <div style={{margin: '30px 0'}}>
          <button 
            style={styles.button}
            onClick={() => setCount(count + 1)}
          >
            Count: {count}
          </button>
        </div>
        <div style={styles.info}>
          <strong>Current Count:</strong> {count}<br/>
          <strong>Status:</strong> Active<br/>
          <strong>Environment:</strong> Blue Bucket
        </div>
        <div style={styles.nav}>
          <Link to="/" style={styles.button}>
            Home
          </Link>
          <Link to="/about" style={styles.button}>
            About
          </Link>
        </div>
      </div>
    );
  };

  return (
    <HashRouter>
      <div style={styles.container}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/second" element={<SecondPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
