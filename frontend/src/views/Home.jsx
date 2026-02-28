import { useEffect, useState } from 'react';
import api from '../services/api';
import './Home.css';

function Home() {
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    api
      .getHealth()
      .then((data) => setSystemStatus(data))
      .catch(() => setSystemStatus({ status: 'error' }))
      .finally(() => {});
  }, []);

  return (
    <div className="home">
      <section className="home-hero">
        <h1 className="home-hero-title">Digital Government, Transparent Accountability</h1>
        <p className="home-hero-lead">
          NDGSAMS connects citizens and government through digital services while ensuring clear
          accountability and measurable outcomes at every level.
        </p>
      </section>

      <section className="home-intro">
        <p>
          The <strong>National Digital Government Service and Accountability Management System</strong>{' '}
          supports the delivery of public services online and tracks performance and responsibility
          so that government remains answerable to the people it serves.
        </p>
      </section>

      <section className="home-pillars" aria-label="Key pillars of the system">
        <h2 className="home-section-title">What We Enable</h2>
        <ul className="home-pillars-list">
          <li className="home-pillar">
            <span className="home-pillar-icon" aria-hidden>◇</span>
            <h3>Digital Services</h3>
            <p>Unified access to government services online—faster, clearer, and more accessible for everyone.</p>
          </li>
          <li className="home-pillar">
            <span className="home-pillar-icon" aria-hidden>◇</span>
            <h3>Accountability</h3>
            <p>Track commitments, deadlines, and outcomes so agencies and officials can be held to account.</p>
          </li>
          <li className="home-pillar">
            <span className="home-pillar-icon" aria-hidden>◇</span>
            <h3>Transparency</h3>
            <p>Visibility into how services are delivered and how performance is measured and reported.</p>
          </li>
          <li className="home-pillar">
            <span className="home-pillar-icon" aria-hidden>◇</span>
            <h3>Citizen-Centric</h3>
            <p>Designed around the needs of citizens and businesses, with feedback and improvement built in.</p>
          </li>
        </ul>
      </section>

      <section className="home-cta">
        <p className="home-cta-text">Access services and accountability dashboards will be available as you explore the system.</p>
      </section>

      {systemStatus && (
        <aside className="home-status" aria-label="System status">
          <span className="home-status-label">System status:</span>
          <span className={`home-status-value ${systemStatus.status === 'ok' ? 'home-status-ok' : 'home-status-error'}`}>
            {systemStatus.status === 'ok' ? 'Operational' : 'Checking…'}
          </span>
        </aside>
      )}
    </div>
  );
}

export default Home;
