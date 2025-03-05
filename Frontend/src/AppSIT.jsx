// import React, { useState } from 'react';
// import { Search, Moon, Sun } from 'lucide-react';
// import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// const getDomain = (url) => {
//   try {
//     const { hostname } = new URL(url);
//     return hostname.replace(/^www\./, '');
//   } catch (err) {
//     return url;
//   }
// };

// const PreparationGuide = () => {
//   const [query, setQuery] = useState('');
//   const [isDarkMode, setIsDarkMode] = useState(false);
//   const [results, setResults] = useState({
//     groq_response: '',
//     videos: [],
//     playlists: [],
//     learning_resources: []
//   });
//   const [loading, setLoading] = useState(false);

//   const handleSearch = async () => {
//     if (!query) return;
//     setLoading(true);
//     try {
//       const response = await fetch('http://127.0.0.1:8000/get_resources', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ query })
//       });
//       const data = await response.json();
//       setResults(data);
//     } catch (error) {
//       console.error('Error fetching resources:', error);
//     }
//     setLoading(false);
//   };

//   const formatText = (text) => {
//     return text.split('\n').map((line, index, arr) => (
//       <React.Fragment key={index}>
//         {line}
//         {index !== arr.length - 1 && <br />}
//       </React.Fragment>
//     ));
//   };

//   const toggleTheme = () => {
//     setIsDarkMode(!isDarkMode);
//   };

//   return (
//     <div className={`relative min-h-screen ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'} font-sans transition-colors duration-300`}>
//       {/* Full-width Header */}
//       <header className={`w-full ${isDarkMode ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-gradient-to-r from-blue-500 to-cyan-500'} p-8 relative`}>
//         <div className="max-w-5xl mx-auto flex justify-between items-center">
//           <div>
//             <h1 className="text-4xl font-bold text-white">Preparation Guide</h1>
//             <p className={`mt-2 text-lg ${isDarkMode ? 'text-indigo-100' : 'text-blue-50'}`}>
//               Get curated resources to help you prepare
//             </p>
//           </div>
//           <button
//             onClick={toggleTheme}
//             className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
//           >
//             {isDarkMode ? (
//               <Sun size={24} className="text-yellow-300" />
//             ) : (
//               <Moon size={24} className="text-blue-100" />
//             )}
//           </button>
//         </div>
//       </header>

//       <div className="relative">
//         {/* Fixed Left Column for Lottie Animation (hidden on small screens) */}
//         <div className="hidden md:block md:fixed md:top-32 md:left-0 md:h-[calc(100vh-8rem)] md:w-1/4 overflow-hidden">
//           <div className="absolute inset-0 flex items-center justify-center scale-125">
//             <div className="w-full h-full absolute top-0 left-0 flex items-center justify-center">
//               <DotLottieReact
//                 src="https://lottie.host/e230966e-636a-4b44-af95-16d565fd2a65/rl5m8Y3ytl.lottie"
//                 loop
//                 autoplay
//                 className="w-full h-full object-cover"
//               />
//             </div>
//             <div className={`absolute inset-0 ${isDarkMode ? 'bg-slate-950/30' : 'bg-white/30'}`} />
//           </div>
//         </div>

//         {/* Main Content */}
//         <div className="md:ml-[25%]">
//           {/* Search Section */}
//           <div className="max-w-3xl mx-auto p-6">
//             <div className="relative">
//               <input
//                 type="text"
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 placeholder="Enter topic to prepare..."
//                 className={`w-full p-4 rounded-full ${
//                   isDarkMode 
//                     ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-400' 
//                     : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
//                 } border focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg shadow-lg transition-colors`}
//                 onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
//               />
//               <button
//                 onClick={handleSearch}
//                 disabled={loading}
//                 className={`absolute right-2 top-2 flex items-center ${
//                   isDarkMode
//                     ? 'bg-violet-600 hover:bg-violet-700'
//                     : 'bg-blue-500 hover:bg-blue-600'
//                 } px-6 py-2 rounded-full transition-colors text-white shadow-lg`}
//               >
//                 <Search size={20} />
//                 <span className="ml-2">{loading ? 'Searching...' : 'Search'}</span>
//               </button>
//             </div>
//           </div>

//           {/* Content Container */}
//           <div className="max-w-3xl mx-auto space-y-8 px-6 pb-12">
//             {/* Groq AI Response */}
//             {results.groq_response && (
//               <div className={`rounded-2xl shadow-lg p-6 ${
//                 isDarkMode 
//                   ? 'bg-slate-900 border-slate-800 text-slate-300' 
//                   : 'bg-white border-gray-200 text-gray-700'
//                 } border transition-colors`}>
//                 <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
//                   Preparation Hint
//                 </h2>
//                 <div>
//                   {formatText(results.groq_response)}
//                 </div>
//               </div>
//             )}

//             {/* Videos Section */}
//             {results.videos.length > 0 && (
//               <div>
//                 <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
//                   Videos
//                 </h2>
//                 <div className="space-y-4">
//                   {results.videos.map((video, idx) => (
//                     <a
//                       key={idx}
//                       href={video.link}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className={`block rounded-2xl overflow-hidden hover:shadow-xl transition transform hover:-translate-y-1 border ${
//                         isDarkMode 
//                           ? 'bg-slate-900 border-slate-800' 
//                           : 'bg-white border-gray-200'
//                       }`}
//                     >
//                       <div className="flex flex-col sm:flex-row">
//                         {video.thumbnail && (
//                           <div className="sm:w-64 h-48 flex-shrink-0">
//                             <img
//                               src={video.thumbnail}
//                               alt={video.title}
//                               className="w-full h-full object-cover"
//                             />
//                           </div>
//                         )}
//                         <div className="p-6">
//                           <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
//                             {video.title}
//                           </h3>
//                         </div>
//                       </div>
//                     </a>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Playlists Section */}
//             {results.playlists.length > 0 && (
//               <div>
//                 <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
//                   Playlists
//                 </h2>
//                 <div className="space-y-4">
//                   {results.playlists.map((playlist, idx) => (
//                     <a
//                       key={idx}
//                       href={playlist.link}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className={`block rounded-2xl overflow-hidden hover:shadow-xl transition transform hover:-translate-y-1 border ${
//                         isDarkMode 
//                           ? 'bg-slate-900 border-slate-800' 
//                           : 'bg-white border-gray-200'
//                       }`}
//                     >
//                       <div className="flex flex-col sm:flex-row">
//                         {playlist.thumbnail && (
//                           <div className="sm:w-64 h-48 flex-shrink-0">
//                             <img
//                               src={playlist.thumbnail}
//                               alt={playlist.title}
//                               className="w-full h-full object-cover"
//                             />
//                           </div>
//                         )}
//                         <div className="p-6">
//                           <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
//                             {playlist.title}
//                           </h3>
//                         </div>
//                       </div>
//                     </a>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Learning Resources Section */}
//             {results.learning_resources.length > 0 && (
//               <div>
//                 <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
//                   Learning Resources
//                 </h2>
//                 <div className="space-y-4">
//                   {results.learning_resources.map((resource, idx) => {
//                     const domain = getDomain(resource);
//                     const logoUrl = `https://logo.clearbit.com/${domain}`;
//                     return (
//                       <a
//                         key={idx}
//                         href={resource}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className={`block rounded-2xl p-4 hover:shadow-xl transition transform hover:-translate-y-1 border ${
//                           isDarkMode 
//                             ? 'bg-slate-900 border-slate-800' 
//                             : 'bg-white border-gray-200'
//                         }`}
//                       >
//                         <div className="flex items-center">
//                           <img
//                             src={logoUrl}
//                             alt={domain}
//                             className={`w-12 h-12 mr-4 object-contain rounded-lg p-2 ${
//                               isDarkMode ? 'bg-white/10' : 'bg-gray-100'
//                             }`}
//                             onError={(e) => {
//                               e.target.style.display = 'none';
//                             }}
//                           />
//                           <p className={`text-xl font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
//                             {domain}
//                           </p>
//                         </div>
//                       </a>
//                     );
//                   })}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PreparationGuide;

import React, { useState } from 'react';
import { Search, Moon, Sun } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import ReactMarkdown from 'react-markdown'
import Markdown from 'react-markdown';
const getDomain = (url) => {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch (err) {
    return url;
  }
};

const PreparationGuide = () => {
  const [query, setQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [results, setResults] = useState({
    groq_response: '',
    videos: [],
    playlists: [],
    learning_resources: []
  });
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/get_resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
    setLoading(false);
  };

  const formatText = (text) => {
    // Remove all instances of "**" from the text
    const sanitizedText = text.replace(/\*\*/g, '');
    return sanitizedText.split('\n').map((line, index, arr) => (
      <React.Fragment key={index}>
        {line}
        {index !== arr.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`relative min-h-screen ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'} font-sans transition-colors duration-300`}>
      {/* Full-width Header */}
      <header className={`w-full ${isDarkMode ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-gradient-to-r from-blue-500 to-cyan-500'} p-8 relative`}>
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">Preparation Guide</h1>
            <p className={`mt-2 text-lg ${isDarkMode ? 'text-indigo-100' : 'text-blue-50'}`}>
              Get curated resources to help you prepare
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isDarkMode ? (
              <Sun size={24} className="text-yellow-300" />
            ) : (
              <Moon size={24} className="text-blue-100" />
            )}
          </button>
        </div>
      </header>

      <div className="relative">
        {/* Fixed Left Column for Lottie Animation (hidden on small screens) */}
        <div className="hidden md:block md:fixed md:top-32 md:left-0 md:h-[calc(100vh-8rem)] md:w-1/4 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center scale-125">
            <div className="w-full h-full absolute top-0 left-0 flex items-center justify-center">
              <DotLottieReact
                src="https://lottie.host/e230966e-636a-4b44-af95-16d565fd2a65/rl5m8Y3ytl.lottie"
                loop
                autoplay
                className="w-full h-full object-cover"
              />
            </div>
            <div className={`absolute inset-0 ${isDarkMode ? 'bg-slate-950/30' : 'bg-white/30'}`} />
          </div>
        </div>

        {/* Main Content */}
        <div className="md:ml-[25%]">
          {/* Search Section */}
          <div className="max-w-3xl mx-auto p-6">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter topic to prepare..."
                className={`w-full p-4 rounded-full ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-400' 
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg shadow-lg transition-colors`}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className={`absolute right-2 top-2 flex items-center ${
                  isDarkMode
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : 'bg-blue-500 hover:bg-blue-600'
                } px-6 py-2 rounded-full transition-colors text-white shadow-lg`}
              >
                <Search size={20} />
                <span className="ml-2">{loading ? 'Searching...' : 'Search'}</span>
              </button>
            </div>
          </div>

          {/* Content Container */}
          <div className="max-w-3xl mx-auto space-y-8 px-6 pb-12">
            {/* Groq AI Response */}
            {results.groq_response && (
              <div className={`rounded-2xl shadow-lg p-6 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-300' 
                  : 'bg-white border-gray-200 text-gray-700'
                } border transition-colors`}>
                <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Preparation Hint
                </h2>
                <div>
                  <ReactMarkdown>

                    {results.groq_response}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Videos Section */}
            {results.videos.length > 0 && (
              <div>
                <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Videos
                </h2>
                <div className="space-y-4">
                  {results.videos.map((video, idx) => (
                    <a
                      key={idx}
                      href={video.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block rounded-2xl overflow-hidden hover:shadow-xl transition transform hover:-translate-y-1 border ${
                        isDarkMode 
                          ? 'bg-slate-900 border-slate-800' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row">
                        {video.thumbnail && (
                          <div className="sm:w-64 h-48 flex-shrink-0">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-6">
                          <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {video.title}
                          </h3>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Playlists Section */}
            {results.playlists.length > 0 && (
              <div>
                <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Playlists
                </h2>
                <div className="space-y-4">
                  {results.playlists.map((playlist, idx) => (
                    <a
                      key={idx}
                      href={playlist.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block rounded-2xl overflow-hidden hover:shadow-xl transition transform hover:-translate-y-1 border ${
                        isDarkMode 
                          ? 'bg-slate-900 border-slate-800' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row">
                        {playlist.thumbnail && (
                          <div className="sm:w-64 h-48 flex-shrink-0">
                            <img
                              src={playlist.thumbnail}
                              alt={playlist.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-6">
                          <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {playlist.title}
                          </h3>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Resources Section */}
            {results.learning_resources.length > 0 && (
              <div>
                <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Learning Resources
                </h2>
                <div className="space-y-4">
                  {results.learning_resources.map((resource, idx) => {
                    const domain = getDomain(resource);
                    const logoUrl = `https://logo.clearbit.com/${domain}`;
                    return (
                      <a
                        key={idx}
                        href={resource}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block rounded-2xl p-4 hover:shadow-xl transition transform hover:-translate-y-1 border ${
                          isDarkMode 
                            ? 'bg-slate-900 border-slate-800' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <img
                            src={logoUrl}
                            alt={domain}
                            className={`w-12 h-12 mr-4 object-contain rounded-lg p-2 ${
                              isDarkMode ? 'bg-white/10' : 'bg-gray-100'
                            }`}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <p className={`text-xl font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {domain}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreparationGuide;
