// import React, { useState, useRef, useEffect } from "react";
// import "./index.css"; // Ensure this file contains Tailwind's directives

// // Helper function to poll for the audio file availability.
// const waitForAudioFile = async (url, timeout = 10000, interval = 500) => {
//   const startTime = Date.now();
//   while (Date.now() - startTime < timeout) {
//     try {
//       const res = await fetch(url, { method: "HEAD" });
//       if (res.ok) {
//         return;
//       }
//     } catch (e) {
//       // ignore errors and try again
//     }
//     await new Promise((resolve) => setTimeout(resolve, interval));
//   }
//   throw new Error("Audio file not found within timeout");
// };

// // Message component with professional styling
// const Message = ({ msg, index, speakingMessageId }) => (
//   <div className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mb-4`}>
//     <div className={`flex items-end ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
//       <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-300">
//         {msg.sender === "user" ? "👤" : "🤖"}
//       </div>
//       <div className="mx-2 max-w-md">
//         <div
//           className={`rounded-lg p-3 shadow-md relative transition-all duration-500 ${
//             msg.sender === "user" ? "bg-[#7886C7] text-white" : "bg-[#2D336B] text-white"
//           }`}
//         >
//           {msg.text}
//           {speakingMessageId === index && (
//             <div className="absolute bottom-0 right-0 flex space-x-1 p-1">
//               <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
//               <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
//               <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300"></span>
//               <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-450"></span>
//             </div>
//           )}
//         </div>
//         <div className="text-xs text-gray-500 mt-1">{msg.timestamp}</div>
//       </div>
//     </div>
//   </div>
// );

// // Welcome message displayed when there are no messages yet
// const WelcomeMessage = () => (
//   <div className="text-center p-4">
//     <h2 className="text-2xl font-bold text-gray-800">Welcome to your AI Interview Practice Session</h2>
//     <p className="text-gray-600 mt-2">
//       Click the microphone button below to start speaking. I'll listen and respond after you stop.
//     </p>
//   </div>
// );

// const App = () => {
//   const [listening, setListening] = useState(false);
//   const [messages, setMessages] = useState([]);
//   const [speakingMessageId, setSpeakingMessageId] = useState(null);
//   const [liveTranscript, setLiveTranscript] = useState("");
//   const recognitionRef = useRef(null);
//   const chatboxRef = useRef(null);
//   const audioRef = useRef(null);
//   const tempTranscript = useRef(""); // To store interim and final transcript

//   useEffect(() => {
//     // Cleanup on unmount
//     return () => {
//       if (recognitionRef.current) {
//         recognitionRef.current.stop();
//         recognitionRef.current = null;
//       }
//       if (audioRef.current) {
//         audioRef.current.pause();
//         audioRef.current.currentTime = 0;
//         audioRef.current = null;
//       }
//     };
//   }, []);

//   useEffect(() => {
//     // Auto-scroll chat box when new messages arrive
//     if (chatboxRef.current) {
//       chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
//     }
//   }, [messages]);

//   // Stop any ongoing audio playback and notify backend (if needed)
//   const stopAudioPlayback = () => {
//     if (audioRef.current) {
//       audioRef.current.pause();
//       audioRef.current.currentTime = 0;
//       audioRef.current = null;
//     }
//     fetch("http://127.0.0.1:8000/stop_audio")
//       .then((response) => response.json())
//       .then((data) => console.log("Backend audio stop:", data))
//       .catch((error) => {
//         console.error("Error stopping audio on backend:", error);
//       });
//   };

//   // Process speech result, update messages, and play the assistant's response
//   const handleSpeechResult = async (finalText) => {
//     setMessages((prev) => [
//       ...prev,
//       { sender: "user", text: finalText, timestamp: new Date().toLocaleTimeString() },
//     ]);

//     try {
//       const response = await fetch("http://127.0.0.1:8000/query", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ text: finalText }),
//       });

//       const data = await response.json();
//       const newMessage = {
//         sender: "assistant",
//         text: data.response,
//         timestamp: new Date().toLocaleTimeString(),
//       };

//       setMessages((prev) => [...prev, newMessage]);

//       // Wait for the audio file to be generated before playing it.
//       const audioUrl = "http://127.0.0.1:8000/response.mp3";
//       try {
//         await waitForAudioFile(audioUrl);
//       } catch (err) {
//         console.error("Audio file did not become available:", err);
//       }

//       const audio = new Audio(audioUrl);
//       audioRef.current = audio;

//       const newMsgIndex = messages.length + 1;
//       audio.onplay = () => setSpeakingMessageId(newMsgIndex);
//       audio.onended = () => {
//         setSpeakingMessageId(null);
//         audioRef.current = null;
//       };

//       try {
//         await audio.play();
//       } catch (audioError) {
//         console.error("Audio playback error:", audioError);
//       }
//     } catch (error) {
//       console.error("Error:", error);
//       setMessages((prev) => [
//         ...prev,
//         {
//           sender: "assistant",
//           text: "Sorry, I encountered an error.",
//           timestamp: new Date().toLocaleTimeString(),
//         },
//       ]);
//     }
//   };

//   // Start speech recognition
//   const startListening = () => {
//     if (!("webkitSpeechRecognition" in window)) {
//       console.error("Speech recognition is not supported in this browser. Use Chrome.");
//       return;
//     }

//     const recognition = new window.webkitSpeechRecognition();
//     recognition.lang = "en-US";
//     recognition.continuous = false; // single utterance mode simplifies capturing final transcript
//     recognition.interimResults = true;

//     recognition.onresult = (event) => {
//       let interimText = "";
//       for (let i = event.resultIndex; i < event.results.length; ++i) {
//         if (event.results[i].isFinal) {
//           tempTranscript.current += event.results[i][0].transcript.trim() + " ";
//         } else {
//           interimText += event.results[i][0].transcript;
//         }
//       }
//       setLiveTranscript(interimText || tempTranscript.current);
//     };

//     recognition.onerror = (event) => {
//       console.error("Speech recognition error:", event);
//       setListening(false);
//     };

//     recognition.onend = () => {
//       // Do not restart automatically once stopped
//     };

//     recognitionRef.current = recognition;
//     recognition.start();
//   };

//   // Toggle microphone on/off
//   const handleMicClick = () => {
//     if (!listening) {
//       // Start listening
//       stopAudioPlayback();
//       if (recognitionRef.current) {
//         recognitionRef.current.stop();
//         recognitionRef.current = null;
//       }
//       setListening(true);
//       tempTranscript.current = "";
//       setLiveTranscript("");
//       startListening();
//     } else {
//       // Stop listening
//       setListening(false);
//       if (recognitionRef.current) {
//         recognitionRef.current.stop();
//         recognitionRef.current = null;
//       }
//       const finalTranscript = tempTranscript.current.trim();
//       if (finalTranscript.length > 0) {
//         handleSpeechResult(finalTranscript);
//       } else {
//         console.log("No valid speech detected.");
//       }
//       setLiveTranscript("");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#A9B5DF] flex flex-col items-center p-4">
//       <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg p-6 mb-4">
//         <div className="flex justify-between items-center mb-4">
//           <h1 className="text-3xl font-bold text-gray-800">AI Interview Mentor</h1>
//           <div className={`px-3 py-1 rounded-full text-sm font-medium ${listening ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-800"}`}>
//             {listening ? "Listening..." : "Ready"}
//           </div>
//         </div>
//         <div ref={chatboxRef} className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-96 overflow-y-auto mb-4">
//           {messages.length === 0 ? (
//             <WelcomeMessage />
//           ) : (
//             messages.map((msg, index) => (
//               <Message key={index} msg={msg} index={index} speakingMessageId={speakingMessageId} />
//             ))
//           )}
//           {listening && liveTranscript && (
//             <div className="flex justify-end mb-4">
//               <div className="flex items-end flex-row-reverse">
//                 <div className="w-10 h-10 rounded-full bg-[#7886C7] flex items-center justify-center">👤</div>
//                 <div className="mx-2 max-w-md">
//                   <div className="bg-[#7886C7] text-white rounded-lg p-3">{liveTranscript}</div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//         <button
//           className={`w-full py-3 rounded-full font-bold text-white ${listening ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} transition`}
//           onClick={handleMicClick}
//         >
//           {listening ? "Stop Listening" : "Start Listening"}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default App;

import React, { useState, useRef, useEffect } from "react";
import "./index.css"; // Ensure this file contains Tailwind's directives

// Helper function to poll for the audio file availability.
const waitForAudioFile = async (url, timeout = 10000, interval = 500) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        return;
      }
    } catch (e) {
      // ignore errors and try again
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Audio file not found within timeout");
};

// Message component with professional styling
const Message = ({ msg, index, speakingMessageId }) => (
  <div className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mb-4`}>
    <div className={`flex items-end ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-300">
        {msg.sender === "user" ? "👤" : "🤖"}
      </div>
      <div className="mx-2 max-w-md">
        <div
          className={`rounded-lg p-3 shadow-md relative transition-all duration-500 ${
            msg.sender === "user" ? "bg-[#7886C7] text-white" : "bg-[#2D336B] text-white"
          }`}
        >
          {msg.text}
          {speakingMessageId === index && (
            <div className="absolute bottom-0 right-0 flex space-x-1 p-1">
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300"></span>
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-450"></span>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">{msg.timestamp}</div>
      </div>
    </div>
  </div>
);

// Welcome message displayed when there are no messages yet
const WelcomeMessage = () => (
  <div className="text-center p-4">
    <h2 className="text-2xl font-bold text-gray-800">Welcome to your AI Interview Practice Session</h2>
    <p className="text-gray-600 mt-2">
      Click the microphone button below to start speaking. I'll listen and respond after you stop.
    </p>
  </div>
);

const App = () => {
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef(null);
  const chatboxRef = useRef(null);
  const audioRef = useRef(null);
  const tempTranscript = useRef(""); // To store interim and final transcript
  const listeningRef = useRef(false); // New ref to reliably track listening state

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Auto-scroll chat box when new messages arrive
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  // Stop any ongoing audio playback and notify backend (if needed)
  const stopAudioPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    fetch("http://127.0.0.1:8000/stop_audio")
      .then((response) => response.json())
      .then((data) => console.log("Backend audio stop:", data))
      .catch((error) => {
        console.error("Error stopping audio on backend:", error);
      });
  };

  // Process speech result, update messages, and play the assistant's response
  const handleSpeechResult = async (finalText) => {
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: finalText, timestamp: new Date().toLocaleTimeString() },
    ]);

    try {
      const response = await fetch("http://127.0.0.1:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: finalText }),
      });

      const data = await response.json();
      const newMessage = {
        sender: "assistant",
        text: data.response,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, newMessage]);

      // Wait for the audio file to be generated before playing it.
      const audioUrl = "http://127.0.0.1:8000/response.mp3";
      try {
        await waitForAudioFile(audioUrl);
      } catch (err) {
        console.error("Audio file did not become available:", err);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      const newMsgIndex = messages.length + 1;
      audio.onplay = () => setSpeakingMessageId(newMsgIndex);
      audio.onended = () => {
        setSpeakingMessageId(null);
        audioRef.current = null;
      };

      try {
        await audio.play();
      } catch (audioError) {
        console.error("Audio playback error:", audioError);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: "Sorry, I encountered an error.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  };

  // Updated startListening function with continuous mode and auto-restart logic
  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      console.error("Speech recognition is not supported in this browser. Use Chrome.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true; // Keep capturing until explicitly stopped
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          tempTranscript.current += event.results[i][0].transcript.trim() + " ";
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      setLiveTranscript(interimText || tempTranscript.current);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event);
      setListening(false);
      listeningRef.current = false;
    };

    // When recognition ends (e.g., due to silence), restart it if still listening
    recognition.onend = () => {
      if (listeningRef.current) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Updated microphone toggle handler to sync state with listeningRef
  const handleMicClick = () => {
    if (!listening) {
      // Start listening
      stopAudioPlayback();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setListening(true);
      listeningRef.current = true; // update ref
      tempTranscript.current = "";
      setLiveTranscript("");
      startListening();
    } else {
      // Stop listening
      setListening(false);
      listeningRef.current = false; // update ref
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      const finalTranscript = tempTranscript.current.trim();
      if (finalTranscript.length > 0) {
        handleSpeechResult(finalTranscript);
      } else {
        console.log("No valid speech detected.");
      }
      setLiveTranscript("");
    }
  };

  return (
    <div className="min-h-screen bg-[#A9B5DF] flex flex-col items-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">AI Interview Mentor</h1>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${listening ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-800"}`}>
            {listening ? "Listening..." : "Ready"}
          </div>
        </div>
        <div ref={chatboxRef} className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-96 overflow-y-auto mb-4">
          {messages.length === 0 ? (
            <WelcomeMessage />
          ) : (
            messages.map((msg, index) => (
              <Message key={index} msg={msg} index={index} speakingMessageId={speakingMessageId} />
            ))
          )}
          {listening && liveTranscript && (
            <div className="flex justify-end mb-4">
              <div className="flex items-end flex-row-reverse">
                <div className="w-10 h-10 rounded-full bg-[#7886C7] flex items-center justify-center">👤</div>
                <div className="mx-2 max-w-md">
                  <div className="bg-[#7886C7] text-white rounded-lg p-3">{liveTranscript}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          className={`w-full py-3 rounded-full font-bold text-white ${listening ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} transition`}
          onClick={handleMicClick}
        >
          {listening ? "Stop Listening" : "Start Listening"}
        </button>
      </div>
    </div>
  );
};

export default App;
