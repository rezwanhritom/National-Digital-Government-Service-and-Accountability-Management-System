import { useEffect, useState } from 'react';
import api from '../services/api';
import './Home.css';

function Home() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getHealth()
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'error', message: 'API unreachable' }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home">
      <h2>Welcome</h2>
      <p>This is the frontend for the National Digital Government Service and Accountability Management System.</p>
      <section className="home-api-status">
        <h3>API Status</h3>
        {loading ? (
          <p>Checking...</p>
        ) : (
          <p className={health?.status === 'ok' ? 'status-ok' : 'status-error'}>
            {health?.message || 'Unknown'}
          </p>
        )}
      </section>
    </div>
  );
}

export default Home;
