// frontend/EnhancedJobProfileForm.jsx
import React, { useState } from 'react';

const EnhancedJobProfileForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    experience: '',
    education: '',
    skills: '',
    certifications: '',
    preferredJobTitles: '',
    industries: '',
    locations: '',
    salaryExpectations: '',
    languages: '',
    linkedIn: '',
    summary: '',
  });

  const [jobResults, setJobResults] = useState([]);
  const [generatedQuery, setGeneratedQuery] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Send formData to the backend job recommendation endpoint
    try {
        const response = await fetch('http://localhost:8000/api/generate-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          
      const data = await response.json();
      console.log('Submitted Form Data:', formData);
      setGeneratedQuery(data.query);
      setJobResults(data.results);
    } catch (error) {
      console.error('Error generating job query', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          Complete Your Job Profile
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
              />
            </div>
            <div>
              <label htmlFor="age" className="block text-gray-700 dark:text-gray-300">
                Age
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="experience" className="block text-gray-700 dark:text-gray-300">
                Years of Experience
              </label>
              <input
                type="number"
                id="experience"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
              />
            </div>
            <div>
              <label htmlFor="education" className="block text-gray-700 dark:text-gray-300">
                Highest Education
              </label>
              <input
                type="text"
                id="education"
                name="education"
                value={formData.education}
                onChange={handleChange}
                required
                placeholder="e.g. B.Tech, MSc, etc."
                className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <label htmlFor="skills" className="block text-gray-700 dark:text-gray-300">
              Skills
            </label>
            <input
              type="text"
              id="skills"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="e.g. JavaScript, Python, React"
              className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <label htmlFor="certifications" className="block text-gray-700 dark:text-gray-300">
              Certifications
            </label>
            <input
              type="text"
              id="certifications"
              name="certifications"
              value={formData.certifications}
              onChange={handleChange}
              placeholder="e.g. AWS, PMP"
              className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <label htmlFor="preferredJobTitles" className="block text-gray-700 dark:text-gray-300">
              Preferred Job Titles
            </label>
            <input
              type="text"
              id="preferredJobTitles"
              name="preferredJobTitles"
              value={formData.preferredJobTitles}
              onChange={handleChange}
              placeholder="e.g. Software Engineer, Data Analyst"
              className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <label htmlFor="industries" className="block text-gray-700 dark:text-gray-300">
              Industry Interests
            </label>
            <input
              type="text"
              id="industries"
              name="industries"
              value={formData.industries}
              onChange={handleChange}
              placeholder="e.g. Finance, Healthcare, Tech"
              className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <label htmlFor="locations" className="block text-gray-700 dark:text-gray-300">
              Preferred Locations
            </label>
            <input
              type="text"
              id="locations"
              name="locations"
              value={formData.locations}
              onChange={handleChange}
              placeholder="e.g. New York, San Francisco"
              className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <label htmlFor="salaryExpectations" className="block text-gray-700 dark:text-gray-300">
              Salary Expectations
            </label>
            <input
              type="text"
              id="salaryExpectations"
              name="salaryExpectations"
              value={formData.salaryExpectations}
              onChange={handleChange}
              placeholder="e.g. $80k - $120k"
              className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <label htmlFor="languages" className="block text-gray-700 dark:text-gray-300">
              Languages Known
            </label>
            <input
              type="text"
              id="languages"
              name="languages"
              value={formData.languages}
              onChange={handleChange}
              placeholder="e.g. English, Spanish"
              className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <label htmlFor="linkedIn" className="block text-gray-700 dark:text-gray-300">
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              id="linkedIn"
              name="linkedIn"
              value={formData.linkedIn}
              onChange={handleChange}
              placeholder="https://www.linkedin.com/in/yourprofile"
              className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <label htmlFor="summary" className="block text-gray-700 dark:text-gray-300">
              Professional Summary
            </label>
            <textarea
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              rows="4"
              placeholder="Write a brief summary about your professional background and career goals"
              className="mt-1 block w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-200"
            ></textarea>
          </div>
          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition duration-200"
            >
              Submit Profile
            </button>
          </div>
        </form>

        {/* Display the generated query and job results */}
        {generatedQuery && (
          <div className="mt-8">
            <h3 className="text-xl font-bold">Generated Search Query</h3>
            <p className="text-gray-700 dark:text-gray-300">{generatedQuery}</p>
          </div>
        )}
        {jobResults.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold">Job Listings</h3>
            <ul>
              {jobResults.map((url, index) => (
                <li key={index}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedJobProfileForm;
