import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [jobTitles, setJobTitles] = useState('');
  const [locations, setLocations] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Convert comma-separated strings to arrays
    const data = {
      preferredJobTitles: jobTitles.split(',').map(title => title.trim()).filter(Boolean),
      locations: locations.split(',').map(loc => loc.trim()).filter(Boolean)
    };

    try {
      // Make a POST request to your FastAPI endpoint
      const response = await axios.post('http://127.0.0.1:8000/api/generate-jobs', data);
      setJobs(response.data.results);
    } catch (err) {
      console.error(err);
      setError('Error fetching job listings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Job Finder</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <label>
            Preferred Job Titles (comma separated):
            <input
              type="text"
              value={jobTitles}
              onChange={(e) => setJobTitles(e.target.value)}
              style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <label>
            Locations (comma separated):
            <input
              type="text"
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
            />
          </label>
        </div>
        <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem' }}>
          {loading ? 'Loading...' : 'Generate Jobs'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>Job Listings</h2>
      {jobs.length ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {jobs.map((job, index) => (
            <li key={index} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
              <h3>{job.title}</h3>
              <p>{job.location}</p>
              <a href={job.link} target="_blank" rel="noopener noreferrer">
                View Job
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No job listings found.</p>
      )}
    </div>
  );
};

export default App;
