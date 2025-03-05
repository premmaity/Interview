// frontend/QuizApp.jsx
// import React, { useState, useEffect } from 'react';
// import { Clock, Check, X } from 'lucide-react';

// // A simple Card component defined inline
// const Card = ({ children, className = '' }) => {
//   return <div className={`bg-white rounded-lg shadow p-4 ${className}`}>{children}</div>;
// };

// // A simple Button component defined inline
// const Button = ({ children, variant = 'default', className = '', ...props }) => {
//   let baseClasses = "px-4 py-2 rounded focus:outline-none transition-colors duration-200";
//   let variantClasses = '';

//   if (variant === 'default') {
//     variantClasses = "bg-blue-500 text-white hover:bg-blue-600";
//   } else if (variant === 'outline') {
//     variantClasses = "border border-blue-500 text-blue-500 hover:bg-blue-50";
//   }

//   return (
//     <button className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
//       {children}
//     </button>
//   );
// };

// const QuizApp = () => {
//   // States for quiz setup
//   const [subject, setSubject] = useState("");
//   const [subjectInput, setSubjectInput] = useState("");
//   const [difficulty, setDifficulty] = useState("");
//   const [proficiency, setProficiency] = useState("");

//   // States for quiz data
//   const [questions, setQuestions] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);

//   // Quiz navigation & answer states
//   const [currentQuestion, setCurrentQuestion] = useState(0);
//   const [answers, setAnswers] = useState({});

//   // Timer state (in seconds – here 15 minutes)
//   const [timeRemaining, setTimeRemaining] = useState(15 * 60);
  
//   // Submission, scoring, and feedback state
//   const [quizSubmitted, setQuizSubmitted] = useState(false);
//   const [score, setScore] = useState(0);
//   const [dynamicScore, setDynamicScore] = useState(0);
//   const [feedback, setFeedback] = useState("");

//   // Format seconds to MM:SS format
//   const formatTime = (seconds) => {
//     const minutes = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   };

//   // Countdown timer effect
//   useEffect(() => {
//     if (quizSubmitted) return; // Stop timer if quiz is submitted
//     if (timeRemaining <= 0) {
//       handleSubmit(); // Auto-submit when time is up
//       return;
//     }
//     const interval = setInterval(() => {
//       setTimeRemaining(prev => prev - 1);
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [timeRemaining, quizSubmitted]);

//   // Recalculate dynamic score as answers change
//   useEffect(() => {
//     let currentScore = 0;
//     questions.forEach(q => {
//       if (answers[q.id] && answers[q.id] === q.correctAnswer) {
//         currentScore++;
//       }
//     });
//     setDynamicScore(currentScore);
//   }, [answers, questions]);

//   // Fetch questions from backend API
//   const fetchQuestionsForSubject = async (subject, difficulty, proficiency) => {
//     setIsLoading(true);
//     try {
//       const response = await fetch("http://127.0.0.1:8000/generate-quiz", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ subject, difficulty, proficiency })
//       });
//       const data = await response.json();
//       setQuestions(data.quiz);
//     } catch (error) {
//       console.error("Error fetching quiz:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Handle submission of the quiz details form
//   const handleQuizDetailsSubmit = (e) => {
//     e.preventDefault();
//     if (!subjectInput.trim() || !difficulty || !proficiency) return;
//     setSubject(subjectInput);
//     fetchQuestionsForSubject(subjectInput, difficulty, proficiency);
//   };

//   // Handle answer selection – lock in answer after first selection
//   const handleAnswerSelect = (optionId) => {
//     const qId = questions[currentQuestion].id;
//     // Do not allow changes if an answer is already set for this question
//     if (answers[qId] !== undefined) return;
//     setAnswers({ ...answers, [qId]: optionId });
//   };

//   // Navigation functions for quiz
//   const handleNext = () => {
//     if (currentQuestion < questions.length - 1) {
//       setCurrentQuestion(prev => prev + 1);
//     }
//   };

//   const handlePrev = () => {
//     if (currentQuestion > 0) {
//       setCurrentQuestion(prev => prev - 1);
//     }
//   };

//   const handlePageSelect = (pageNum) => {
//     setCurrentQuestion(pageNum - 1);
//   };

//   // Call backend endpoint to get detailed feedback for incorrect questions
//   const fetchFeedback = async (incorrectQuestions) => {
//     try {
//       const response = await fetch("http://127.0.0.1:8000/generate-feedback", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ incorrectQuestions })
//       });
//       const data = await response.json();
//       setFeedback(data.feedback);
//     } catch (error) {
//       console.error("Error fetching feedback:", error);
//     }
//   };

//   // Evaluate quiz answers, compute score, and fetch detailed feedback
//   const handleSubmit = () => {
//     let calculatedScore = 0;
//     const incorrectQuestions = [];
//     questions.forEach(question => {
//       const userAns = answers[question.id];
//       if (userAns === question.correctAnswer) {
//         calculatedScore++;
//       } else {
//         // Include the concept if available
//         incorrectQuestions.push({
//           id: question.id,
//           question: question.question,
//           concept: question.concept || "",
//           userAnswer: userAns || -1,
//           correctAnswer: question.correctAnswer
//         });
//       }
//     });
//     setScore(calculatedScore);
//     setQuizSubmitted(true);
//     // Fetch detailed feedback based on incorrect questions
//     if (incorrectQuestions.length > 0) {
//       fetchFeedback(incorrectQuestions);
//     }
//   };

//   // ---- Render Screens ----

//   // If the quiz has been submitted, show the results screen with detailed feedback.
//   if (quizSubmitted) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-green-400 to-teal-600 p-8 flex flex-col items-center justify-center">
//         <Card className="max-w-2xl mx-auto mb-4">
//           <h2 className="text-xl font-bold mb-4">Quiz Results</h2>
//           <p className="mb-4">Your score: {score} out of {questions.length}</p>
//           {feedback && (
//             <div className="mb-4">
//               <h3 className="font-semibold">Areas to Improve:</h3>
//               <p className="whitespace-pre-line">{feedback}</p>
//             </div>
//           )}
//           <Button variant="default" onClick={() => window.location.reload()}>
//             Restart Quiz
//           </Button>
//         </Card>
//       </div>
//     );
//   }

//   // If no subject has been chosen, display the quiz details input form.
//   if (!subject) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-green-400 to-teal-600 p-8 flex items-center justify-center">
//         <Card className="max-w-md mx-auto">
//           <h2 className="text-xl font-bold mb-4">Enter Quiz Details</h2>
//           <p className="mb-4 text-sm text-gray-700">
//             Provide the subject/topic, desired difficulty level, and your current proficiency (e.g., Beginner, Intermediate, Advanced) so that the AI can generate a personalized quiz for you.
//           </p>
//           <form onSubmit={handleQuizDetailsSubmit}>
//             <input 
//               type="text"
//               value={subjectInput}
//               onChange={(e) => setSubjectInput(e.target.value)}
//               placeholder="Subject or Topic (e.g., DSA, Computer Science)"
//               className="w-full p-2 border border-gray-300 rounded-lg mb-4"
//             />
//             <select 
//               value={difficulty} 
//               onChange={(e) => setDifficulty(e.target.value)}
//               className="w-full p-2 border border-gray-300 rounded-lg mb-4"
//             >
//               <option value="">Select Difficulty</option>
//               <option value="Easy">Easy</option>
//               <option value="Medium">Medium</option>
//               <option value="Hard">Hard</option>
//             </select>
//             <select 
//               value={proficiency} 
//               onChange={(e) => setProficiency(e.target.value)}
//               className="w-full p-2 border border-gray-300 rounded-lg mb-4"
//             >
//               <option value="">Select Proficiency</option>
//               <option value="Beginner">Beginner</option>
//               <option value="Intermediate">Intermediate</option>
//               <option value="Advanced">Advanced</option>
//             </select>
//             <Button type="submit" variant="default" className="w-full">
//               {isLoading ? 'Loading...' : 'Start Quiz'}
//             </Button>
//           </form>
//         </Card>
//       </div>
//     );
//   }

//   // Show a loading message while questions are being fetched.
//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-green-400 to-teal-600 p-8 flex items-center justify-center">
//         <p className="text-xl text-white">Fetching questions for {subject}...</p>
//       </div>
//     );
//   }

//   // Check if questions exist
//   if (!questions || questions.length === 0) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-green-400 to-teal-600 p-8 flex items-center justify-center">
//         <p className="text-xl text-white">No questions available for {subject}. Please try again later.</p>
//       </div>
//     );
//   }

//   // Main quiz interface.
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-green-400 to-teal-600 p-8">
//       <Card className="max-w-2xl mx-auto mb-6">
//         <div className="flex flex-row justify-between items-center">
//           <div className="flex items-center text-sm text-gray-600">
//             <Clock className="w-4 h-4 mr-2" />
//             <span>Time remaining</span>
//             <span className="ml-2 font-mono">{formatTime(timeRemaining)}</span>
//           </div>
//           <Button variant="default" className="bg-gray-800 text-white" onClick={handleSubmit}>
//             Submit
//           </Button>
//         </div>
        
//         <div className="mt-4">
//           <p className="text-sm text-gray-600 mb-4">
//             Question {currentQuestion + 1} of {questions.length}
//           </p>
//           <p className="text-lg font-medium mb-6">
//             {questions[currentQuestion].question}
//           </p>
          
//           <div className="space-y-3">
//             {questions[currentQuestion].options.map((option) => (
//               <div
//                 key={option.id}
//                 onClick={() => handleAnswerSelect(option.id)}
//                 className={`p-4 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer ${
//                   answers[questions[currentQuestion].id] === option.id ? "bg-blue-100" : ""
//                 }`}
//               >
//                 <span className="font-medium mr-2">{option.id}.</span>
//                 {option.text}
//               </div>
//             ))}
//           </div>
//         </div>
        
//         <div className="flex items-center justify-between mt-8">
//           <div className="flex space-x-2">
//             <Button
//               variant="outline"
//               onClick={handlePrev}
//               disabled={currentQuestion === 0}
//             >
//               Prev
//             </Button>
//             {[...Array(questions.length)].map((_, idx) => {
//               const q = questions[idx];
//               const userAnswer = answers[q.id];
//               const isCorrect = userAnswer === q.correctAnswer;
//               return (
//                 <Button
//                   key={idx}
//                   variant={currentQuestion === idx ? "default" : "outline"}
//                   className={`flex items-center ${currentQuestion === idx ? "bg-gray-800 text-white" : ""}`}
//                   onClick={() => handlePageSelect(idx + 1)}
//                 >
//                   {idx + 1}
//                   {userAnswer && (
//                     <span className="ml-1">
//                       {isCorrect ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />}
//                     </span>
//                   )}
//                 </Button>
//               );
//             })}
//             <Button
//               variant="outline"
//               onClick={handleNext}
//               disabled={currentQuestion === questions.length - 1}
//             >
//               Next
//             </Button>
//           </div>
//         </div>
//       </Card>

//       {/* Dynamic score/progress meter */}
//       <Card className="max-w-2xl mx-auto mt-6">
//         <div className="flex items-center justify-center p-6">
//           <div className="relative">
//             <svg className="w-24 h-24">
//               <circle
//                 className="text-gray-200"
//                 strokeWidth="5"
//                 stroke="currentColor"
//                 fill="transparent"
//                 r="45"
//                 cx="50"
//                 cy="50"
//               />
//               <circle
//                 className="text-gray-800"
//                 strokeWidth="5"
//                 strokeDasharray={`${(quizSubmitted ? score : dynamicScore) / questions.length * 283 || 0} 283`}
//                 strokeLinecap="round"
//                 stroke="currentColor"
//                 fill="transparent"
//                 r="45"
//                 cx="50"
//                 cy="50"
//               />
//             </svg>
//             <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold">
//               {quizSubmitted ? score : dynamicScore}/{questions.length}
//             </span>
//           </div>
//         </div>
//       </Card>
//     </div>
//   );
// };

// export default QuizApp;


// frontend/QuizApp.jsx
import React, { useState, useEffect } from 'react';
import { Clock, Check, X } from 'lucide-react';

// A simple Card component defined inline
const Card = ({ children, className = '' }) => {
  return <div className={`bg-white rounded-lg shadow p-8 ${className}`}>{children}</div>;
};

// A simple Button component defined inline
const Button = ({ children, variant = 'default', className = '', ...props }) => {
  let baseClasses = "px-4 py-2 rounded focus:outline-none transition-colors duration-200";
  let variantClasses = '';

  if (variant === 'default') {
    variantClasses = "bg-blue-500 text-white hover:bg-blue-600";
  } else if (variant === 'outline') {
    variantClasses = "border border-blue-500 text-blue-500 hover:bg-blue-50";
  }

  return (
    <button className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
};

const QuizApp = () => {
  // States for quiz setup
  const [subject, setSubject] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [proficiency, setProficiency] = useState("");

  // States for quiz data
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Quiz navigation & answer states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  // Timer state (in seconds – here 15 minutes)
  const [timeRemaining, setTimeRemaining] = useState(15 * 60);
  
  // Submission, scoring, and feedback state
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [dynamicScore, setDynamicScore] = useState(0);
  const [feedback, setFeedback] = useState("");

  // Format seconds to MM:SS format
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Countdown timer effect
  useEffect(() => {
    if (quizSubmitted) return; // Stop timer if quiz is submitted
    if (timeRemaining <= 0) {
      handleSubmit(); // Auto-submit when time is up
      return;
    }
    const interval = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, quizSubmitted]);

  // Recalculate dynamic score as answers change
  useEffect(() => {
    let currentScore = 0;
    questions.forEach(q => {
      if (answers[q.id] && answers[q.id] === q.correctAnswer) {
        currentScore++;
      }
    });
    setDynamicScore(currentScore);
  }, [answers, questions]);

  // Fetch questions from backend API
  const fetchQuestionsForSubject = async (subject, difficulty, proficiency) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, difficulty, proficiency })
      });
      const data = await response.json();
      setQuestions(data.quiz);
    } catch (error) {
      console.error("Error fetching quiz:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle submission of the quiz details form
  const handleQuizDetailsSubmit = (e) => {
    e.preventDefault();
    if (!subjectInput.trim() || !difficulty || !proficiency) return;
    setSubject(subjectInput);
    fetchQuestionsForSubject(subjectInput, difficulty, proficiency);
  };

  // Handle answer selection – lock in answer after first selection
  const handleAnswerSelect = (optionId) => {
    const qId = questions[currentQuestion].id;
    if (answers[qId] !== undefined) return; // Lock answer if already selected
    setAnswers({ ...answers, [qId]: optionId });
  };

  // Navigation functions for quiz
  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handlePageSelect = (pageNum) => {
    setCurrentQuestion(pageNum - 1);
  };

  // Call backend endpoint to get detailed feedback for incorrect questions
  const fetchFeedback = async (incorrectQuestions) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incorrectQuestions })
      });
      const data = await response.json();
      setFeedback(data.feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    }
  };

  // Evaluate quiz answers, compute score, and fetch detailed feedback
  const handleSubmit = () => {
    let calculatedScore = 0;
    const incorrectQuestions = [];
    questions.forEach(question => {
      const userAns = answers[question.id];
      if (userAns === question.correctAnswer) {
        calculatedScore++;
      } else {
        incorrectQuestions.push({
          id: question.id,
          question: question.question,
          concept: question.concept || "",
          userAnswer: userAns || -1,
          correctAnswer: question.correctAnswer
        });
      }
    });
    setScore(calculatedScore);
    setQuizSubmitted(true);
    if (incorrectQuestions.length > 0) {
      fetchFeedback(incorrectQuestions);
    }
  };

  // ---- Render Screens ----

  // Results screen: wait for feedback if not yet available.
  if (quizSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-teal-600 p-8 flex flex-col items-center justify-center">
        <Card className="w-full max-w-3xl mx-auto mb-4">
          <h2 className="text-2xl font-bold mb-4">Quiz Results</h2>
          <p className="text-lg mb-4">Your score: {score} out of {questions.length}</p>
          {feedback ? (
            <>
              <div className="mb-4">
                <h3 className="font-semibold text-xl">Areas to Improve:</h3>
                <p className="whitespace-pre-line text-lg">{feedback}</p>
              </div>
              <Button variant="default" onClick={() => window.location.reload()}>
                Restart Quiz
              </Button>
            </>
          ) : (
            <div className="mb-4">
              <p className="text-lg">Please wait while we generate your detailed feedback...</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Quiz details input form
  if (!subject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-teal-600 p-8 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4">Enter Quiz Details</h2>
          <p className="mb-4 text-sm text-gray-700">
            Provide the subject/topic, desired difficulty level, and your current proficiency (e.g., Beginner, Intermediate, Advanced)
          </p>
          <form onSubmit={handleQuizDetailsSubmit}>
            <input 
              type="text"
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              placeholder="Subject or Topic (e.g., DSA, Computer Science)"
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            />
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            >
              <option value="">Select Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <select 
              value={proficiency} 
              onChange={(e) => setProficiency(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            >
              <option value="">Select Proficiency</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <Button type="submit" variant="default" className="w-full">
              {isLoading ? 'Loading...' : 'Start Quiz'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Loading screen while fetching questions
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-teal-600 p-8 flex items-center justify-center">
        <p className="text-xl text-white">Fetching questions for {subject}...</p>
      </div>
    );
  }

  // Error screen if no questions available
  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-teal-600 p-8 flex items-center justify-center">
        <p className="text-xl text-white">No questions available for {subject}. Please try again later.</p>
      </div>
    );
  }

  // Main quiz interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-teal-600 p-8">
      <Card className="max-w-2xl mx-auto mb-6">
        <div className="flex flex-row justify-between items-center">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>Time remaining</span>
            <span className="ml-2 font-mono">{formatTime(timeRemaining)}</span>
          </div>
          <Button variant="default" className="bg-gray-800 text-white" onClick={handleSubmit}>
            Submit
          </Button>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-4">
            Question {currentQuestion + 1} of {questions.length}
          </p>
          <p className="text-lg font-medium mb-6">
            {questions[currentQuestion].question}
          </p>
          
          <div className="space-y-3">
            {questions[currentQuestion].options.map((option) => (
              <div
                key={option.id}
                onClick={() => handleAnswerSelect(option.id)}
                className={`p-4 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer ${
                  answers[questions[currentQuestion].id] === option.id ? "bg-blue-100" : ""
                }`}
              >
                <span className="font-medium mr-2">{option.id}.</span>
                {option.text}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-8">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentQuestion === 0}
            >
              Prev
            </Button>
            {[...Array(questions.length)].map((_, idx) => {
              const q = questions[idx];
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <Button
                  key={idx}
                  variant={currentQuestion === idx ? "default" : "outline"}
                  className={`flex items-center ${currentQuestion === idx ? "bg-gray-800 text-white" : ""}`}
                  onClick={() => handlePageSelect(idx + 1)}
                >
                  {idx + 1}
                  {userAnswer && (
                    <span className="ml-1">
                      {isCorrect ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />}
                    </span>
                  )}
                </Button>
              );
            })}
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentQuestion === questions.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Dynamic score/progress meter */}
      <Card className="max-w-2xl mx-auto mt-6">
        <div className="flex items-center justify-center p-6">
          <div className="relative">
            <svg className="w-24 h-24">
              <circle
                className="text-gray-200"
                strokeWidth="5"
                stroke="currentColor"
                fill="transparent"
                r="45"
                cx="50"
                cy="50"
              />
              <circle
                className="text-gray-800"
                strokeWidth="5"
                strokeDasharray={`${(quizSubmitted ? score : dynamicScore) / questions.length * 283 || 0} 283`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="45"
                cx="50"
                cy="50"
              />
            </svg>
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold">
              {quizSubmitted ? score : dynamicScore}/{questions.length}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default QuizApp;
