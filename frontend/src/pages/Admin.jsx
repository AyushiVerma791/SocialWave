import React, { useState, useEffect } from 'react';
import { controllerAPI } from '../api';
import { Server, Power, Activity } from 'lucide-react';

export default function Admin() {
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
    const interval = setInterval(loadServices, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadServices = async () => {
    try {
      const res = await controllerAPI.getServices();
      setServices(res.data.data);
    } catch (e) {
      console.error("Failed to load services");
    }
    setLoading(false);
  };

  const toggleService = async (service, currentStatus) => {
    try {
      await controllerAPI.toggleService(service, !currentStatus);
      setServices({ ...services, [service]: !currentStatus });
    } catch (e) {
      alert("Failed to toggle service");
    }
  };

  const activeCount = Object.values(services).filter(s => s).length;
  const totalCount = Object.keys(services).length;

  return (
    <div className="admin-container">
      <div className="page-header">
        <h2>Service Management</h2>
        <p>Monitor and control microservice availability via API Gateway.</p>
        <div className="admin-warning">
          <strong>Note:</strong> Toggling a service here changes the routing registry in the API Gateway. It does NOT stop the underlying Docker container. The gateway will simulate a service failure by returning a 503 response.
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <Server size={32} />
          <div className="stat-info">
            <h3>{totalCount}</h3>
            <p>Total Services</p>
          </div>
        </div>
        <div className="stat-card success">
          <Activity size={32} />
          <div className="stat-info">
            <h3>{activeCount}</h3>
            <p>Active</p>
          </div>
        </div>
        <div className="stat-card danger">
          <Power size={32} />
          <div className="stat-info">
            <h3>{totalCount - activeCount}</h3>
            <p>Inactive</p>
          </div>
        </div>
      </div>

      <div className="services-grid">
        <div className="service-card gateway-card">
          <div className="service-info">
            <Server size={24} color="#2196f3" />
            <div>
              <h3>API Gateway</h3>
              <p>localhost:4008 - all traffic routed here</p>
            </div>
          </div>
          <div className="service-status running">RUNNING</div>
        </div>

        {Object.entries(services).map(([name, status]) => (
          <div key={name} className={`service-card ${status ? 'running' : 'stopped'}`}>
            <div className="service-info">
              <Server size={24} />
              <div>
                <h3>{name.charAt(0).toUpperCase() + name.slice(1)} Service</h3>
                <p>Status: {status ? 'Online' : 'Disabled'}</p>
              </div>
            </div>
            <button 
              className={`btn-toggle ${status ? 'stop' : 'start'}`}
              onClick={() => toggleService(name, status)}
            >
              {status ? 'Disable Route' : 'Enable Route'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
