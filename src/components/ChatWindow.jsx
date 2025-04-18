import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Message from "./Message";
import EvaluationScreen from "./EvaluationScreen";
import PromptManager from "./PromptManager";
import "./ChatWindow.css";
import API_BASE_URL from "../config/api";
import featureFlags from "../config/featureFlags";

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [name, setName] = useState("");
  const [clientName] = useState("Joe"); // Fixed client name as Joe
  const [chatStarted, setChatStarted] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showPromptManager, setShowPromptManager] = useState(true); // Add state for PromptManager visibility
  const [showDebugPanel, setShowDebugPanel] = useState(featureFlags.showDebugPanel);
  const [requestPayload, setRequestPayload] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const [currentInteraction, setCurrentInteraction] = useState(1);
  const [totalInteractions, setTotalInteractions] = useState(6); // Default to 6 interactions
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatStarted) {
      startChat();
    }
  }, [chatStarted]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const startChat = async () => {
    try {
      const payload = { name, clientName };
      setRequestPayload(payload);
      const res = await axios.post(`${API_BASE_URL}/api/chat/start`, payload);
      setResponseData(res.data);
      setMessages([{ role: "ai", content: res.data.aiResponse }]);

      // Set interaction information from response
      if (res.data.promptInfo) {
        setCurrentInteraction(res.data.promptInfo.interactionStep || 1);
        setTotalInteractions(res.data.promptInfo.totalInteractions || 6);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      alert("Failed to start chat. Please try again.");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleStartChat = (e) => {
    e.preventDefault();
    if (name.trim()) {
      setChatStarted(true);
    }
  };

  const sendMessage = async () => {
    // Prevent sending if input is empty, loading, or max interactions already completed
    if (!input.trim() || loading || currentInteraction > totalInteractions) return;

    const newMessage = { role: "user", content: input };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    // --- NEW: Immediately update interaction state if this is the last message ---
    const isLastUserMessage = currentInteraction === totalInteractions;
    if (isLastUserMessage) {
      // Increment interaction count locally to disable input immediately
      setCurrentInteraction(currentInteraction + 1);
    }
    // --- END NEW ---

    try {
      const payload = {
        conversationHistory: updatedMessages,
        userMessage: newMessage.content, // Use content from newMessage
      };
      setRequestPayload(payload);
      const res = await axios.post(`${API_BASE_URL}/api/chat/respond`, payload);
      setResponseData(res.data);
      const aiMessage = { role: "ai", content: res.data.aiResponse };
      setMessages([...updatedMessages, aiMessage]);

      // Update interaction step from response (will sync with backend)
      if (res.data.promptInfo) {
        const backendStep = res.data.promptInfo.interactionStep;
        // Only update if backend step is different, otherwise keep local immediate update
        if (backendStep !== currentInteraction) {
           setCurrentInteraction(backendStep);
        }

        // Scroll logic (can remain as is or be adjusted based on preference)
        if (backendStep > totalInteractions) {
          setTimeout(() => {
            chatBoxRef.current?.scrollTo({
              top: chatBoxRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }, 300);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally revert interaction state if API call fails?
      // if (isLastUserMessage) setCurrentInteraction(totalInteractions);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRestart = () => {
    setMessages([]);
    setInput("");
    setLoading(false);
    setInitialLoading(true);
    setName("");
    setChatStarted(false);
    setShowEvaluation(false);
    setCurrentInteraction(1);
  };

  const handleEndConversation = () => {
    if (window.confirm("Are you sure you want to end this conversation? You will receive an evaluation of your performance.")) {
      setShowEvaluation(true);
    }
  };

  const toggleDebugPanel = () => {
    setShowDebugPanel(!showDebugPanel);
  };

  if (showEvaluation) {
    return <EvaluationScreen conversationHistory={messages} onRestart={handleRestart} />;
  }

  if (showPromptManager) {
    return (
      <>
        <div className="chat-container">
          <div className="chat-header">
            <span>IT Training Chat</span>
          </div>
        </div>
        <PromptManager onClose={() => setShowPromptManager(false)} />
      </>
    );
  }

  if (initialLoading && !chatStarted) {
    return (
      <div className="chat-container">
        <div className="chat-header">IT Training Chat</div>
        <div className="welcome-container">
          <h1 className="welcome-title">Welcome to IT Training Chat</h1>
          <p className="welcome-subtitle">Please enter your name to begin</p>
          <form onSubmit={handleStartChat} className="name-form">
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="name-input"
              required
            />
            <button type="submit" className="start-button">
              Start Chat
            </button>
          </form>
          {featureFlags.showPromptManager && (
            <button className="prompt-manager-btn welcome-prompt-btn" onClick={() => setShowPromptManager(true)}>
              Manage Prompts
            </button>
          )}
        </div>
      </div>
    );
  }

  if (initialLoading && chatStarted) {
    return (
      <div className="chat-container">
        <div className="chat-header">IT Training Chat</div>
        <div className="welcome-container">
          <h1 className="welcome-title">Welcome, {name}!</h1>
          <p className="welcome-subtitle">Your AI assistant is getting ready to help you</p>
          <div className="welcome-dots">
            <div className="welcome-dot"></div>
            <div className="welcome-dot"></div>
            <div className="welcome-dot"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <span>IT Training Chat</span>
        <div className="interaction-indicator">
          <div className="interaction-progress">
            <div className="interaction-label">Interaction {Math.min(currentInteraction, totalInteractions)} of {totalInteractions}</div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(Math.min(currentInteraction, totalInteractions) / totalInteractions) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="header-buttons">
          {featureFlags.showDebugPanel && (
            <button className="debug-panel-btn" onClick={toggleDebugPanel}>
              {showDebugPanel ? "Hide Request Panel" : "Show Request Panel"}
            </button>
          )}
          {featureFlags.showPromptManager && (
            <button className="prompt-manager-btn" onClick={() => setShowPromptManager(true)}>
              Manage Prompts
            </button>
          )}
          <button
            className="end-conversation-btn"
            onClick={handleEndConversation}
            disabled={currentInteraction >= totalInteractions}
          >
            {currentInteraction > totalInteractions ? "View Evaluation" : "End Conversation"}
          </button>
        </div>
      </div>
      <div className="dashboard-container">
        <div className="chat-panel">
          <div className="chat-box" ref={chatBoxRef}>
            {messages.map((msg, index) => (
              <Message key={index} role={msg.role} content={msg.content} />
            ))}
            {loading && <div className="thinking">Thinking...</div>}
            {currentInteraction > totalInteractions && !loading && (
              <div className="conversation-complete-message">
                <div className="complete-icon">✓</div>
                <h2>Conversation Complete!</h2>
                <p>Great job! You've completed all {totalInteractions} interactions of this exercise.</p>
                <p>Click the button below to view your performance evaluation.</p>
                <button onClick={() => setShowEvaluation(true)} className="view-evaluation-button">
                  View Evaluation
                </button>
              </div>
            )}
          </div>
        </div>
        {showDebugPanel && (
          <div className="debug-panel">
            <div className="debug-panel-header">
              <h3>Complete Request & Prompt Data</h3>
            </div>
            <div className="debug-panel-content">
              <h4>Current Interaction: {currentInteraction} of {totalInteractions}</h4>

              <h4>Request Payload:</h4>
              <pre>{requestPayload ? JSON.stringify(requestPayload, null, 2) : "No request data available"}</pre>

              <h4>Prompt Information:</h4>
              <pre>{responseData && responseData.promptInfo ? JSON.stringify(responseData.promptInfo, null, 2) : "No prompt data available"}</pre>

              <h4>Response Data:</h4>
              <pre>{responseData ? JSON.stringify(responseData, null, 2) : "No response data available"}</pre>
            </div>
          </div>
        )}
      </div>
      <div className="input-container">
        {(currentInteraction > totalInteractions) ? (
          <button
            onClick={() => setShowEvaluation(true)}
            className="show-results-button"
          >
            Show Results
          </button>
        ) : (
          <>
            <input
              type="text"
              placeholder="Type your message... (Press Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading || currentInteraction > totalInteractions}
            />
            <button onClick={sendMessage} disabled={loading || currentInteraction > totalInteractions}>
              {loading ? "Sending..." : "Send"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
