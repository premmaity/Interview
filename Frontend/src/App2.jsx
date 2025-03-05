import React, { useState, useRef, useEffect } from "react";
import "./index.css";

// -----------------------
// Authentication Form Component
// -----------------------
const AuthForm = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // Only for registration
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (isRegister) {
      // Registration
      try {
        const res = await fetch("http://127.0.0.1:8000/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Registration failed");
          return;
        }
        setMessage("Registration successful. Please log in.");
        // Switch to login mode.
        setIsRegister(false);
        setUsername("");
        setEmail("");
        setPassword("");
      } catch (err) {
        setError("Registration error");
      }
    } else {
      // Login
      try {
        const res = await fetch("http://127.0.0.1:8000/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username, password }),
        });
        const data = await res.json();
        if (data.access_token) {
          onLoginSuccess(data.access_token, data.username);
          localStorage.setItem("token", data.access_token);
          localStorage.setItem("username", data.username);
        } else {
          setError(data.detail || "Login failed");
        }
      } catch (err) {
        setError("Login error");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <form className="bg-white p-6 rounded shadow-md w-80" onSubmit={handleSubmit}>
        <h2 className="text-2xl mb-4 text-center">{isRegister ? "Register" : "Login"}</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        {message && <p className="text-green-500 mb-2">{message}</p>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-2 mb-2 w-full"
          required
        />
        {isRegister && (
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 mb-2 w-full"
            required
          />
        )}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 mb-4 w-full"
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
          {isRegister ? "Register" : "Login"}
        </button>
        <div className="mt-2 text-center text-sm">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setMessage("");
            }}
          >
            {isRegister ? "Login" : "Register"}
          </span>
        </div>
      </form>
    </div>
  );
};

// -----------------------
// Helper: Wait for Audio File Availability
// -----------------------
const waitForAudioFile = async (url, timeout = 10000, interval = 500) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return;
    } catch (e) {}
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Audio file not found within timeout");
};

// -----------------------
// Message Component
// -----------------------
const Message = ({ msg, index, speakingMessageId }) => (
  <div className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mb-4`}>
    <div className={`flex items-end ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-300">
        {msg.sender === "user" ? "👤" : "🤖"}
      </div>
      <div className="mx-2 max-w-md">
        <div className={`rounded-lg p-3 shadow-md relative transition-all duration-500 ${msg.sender === "user" ? "bg-[#7886C7] text-white" : "bg-[#2D336B] text-white"}`}>
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

// -----------------------
// Welcome Message Component
// -----------------------
const WelcomeMessage = () => (
  <div className="text-center p-4">
    <h2 className="text-2xl font-bold text-gray-800">Welcome to your Technical Interview Practice Session</h2>
    <p className="text-gray-600 mt-2">
      Click the microphone button below to start speaking. I'll listen and respond after you stop.
    </p>
  </div>
);

// -----------------------
// Interview Chat Component
// -----------------------
const InterviewChat = ({ token, username, onLogout }) => {
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef(null);
  const chatboxRef = useRef(null);
  const audioRef = useRef(null);
  const tempTranscript = useRef("");

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  const stopAudioPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    fetch("http://127.0.0.1:8000/stop_audio", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((response) => response.json())
      .then((data) => console.log("Audio stopped:", data))
      .catch((error) => console.error("Error stopping audio:", error));
  };

  const handleSpeechResult = async (finalText) => {
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: finalText, timestamp: new Date().toLocaleTimeString() },
    ]);
    try {
      const res = await fetch("http://127.0.0.1:8000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ text: finalText }),
      });
      const data = await res.json();
      const newMsg = { sender: "assistant", text: data.response, timestamp: new Date().toLocaleTimeString() };
      setMessages((prev) => [...prev, newMsg]);

      const audioUrl = "http://127.0.0.1:8000/response.mp3";
      try {
        await waitForAudioFile(audioUrl);
      } catch (err) {
        console.error("Audio file unavailable:", err);
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      const msgIndex = messages.length + 1;
      audio.onplay = () => setSpeakingMessageId(msgIndex);
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
      console.error("Query error:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "assistant", text: "Sorry, encountered an error.", timestamp: new Date().toLocaleTimeString() },
      ]);
    }
  };

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      console.error("Speech recognition not supported. Use Chrome.");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          tempTranscript.current += event.results[i][0].transcript.trim() + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setLiveTranscript(interim || tempTranscript.current);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event);
      setListening(false);
    };

    recognition.onend = () => {};
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleMicClick = () => {
    if (!listening) {
      stopAudioPlayback();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setListening(true);
      tempTranscript.current = "";
      setLiveTranscript("");
      startListening();
    } else {
      setListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      const finalTranscript = tempTranscript.current.trim();
      if (finalTranscript.length > 0) {
        handleSpeechResult(finalTranscript);
      }
      setLiveTranscript("");
    }
  };

  return (
    <div className="min-h-screen bg-[#A9B5DF] flex flex-col">
      <header className="bg-white shadow-xl rounded-lg p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800"> Interview Mentor</h1>
        <div className="flex items-center space-x-4">
          <div className="text-lg font-medium text-gray-800">Welcome, {username}</div>
          <button
            onClick={onLogout}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </header>
      <div className="w-1/2 h-screen mx-auto p-4">
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
        <button className={`w-full py-3 rounded-full font-bold text-white ${listening ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} transition`} onClick={handleMicClick}>
          {listening ? "Stop Listening" : "Start Listening"}
        </button>
      </div>
    </div>
  );

  
};

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");

  const handleLoginSuccess = (token, username) => {
    setToken(token);
    setUsername(username);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken("");
    setUsername("");
  };

  if (!token) {
    return <AuthForm onLoginSuccess={handleLoginSuccess} />;
  }

  return <InterviewChat token={token} username={username} onLogout={handleLogout} />;
};

export default App;
