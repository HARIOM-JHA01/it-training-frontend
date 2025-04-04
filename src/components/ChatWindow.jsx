import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Message from "./Message";
import EvaluationScreen from "./EvaluationScreen";
import PromptManager from "./PromptManager";
import "./ChatWindow.css";
import API_BASE_URL from "../config/api";

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [name, setName] = useState("");
  const [chatStarted, setChatStarted] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showPromptManager, setShowPromptManager] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const chatBoxRef = useRef(null);

  // Check for conversation timeout (5 minutes of inactivity)
  useEffect(() => {
    const timeout = 5 * 60 * 1000; // 5 minutes
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > timeout && messages.length > 0) {
        setShowEvaluation(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, messages.length]);

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
      const res = await axios.post(`${API_BASE_URL}/api/chat/start`, { name });
      setMessages([{ role: "ai", content: res.data.aiResponse }]);
      setLastActivity(Date.now());
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

  const isConversationComplete = (aiMessage) => {
    const content = aiMessage.content.toLowerCase();
    return (
      // Check for explicit completion phrases
      content.includes('thank') && 
      (content.includes('appreciate') || content.includes('helpful')) ||
      // Check for implicit completion
      content.includes('conversation complete') ||
      content.includes('end of our discussion') ||
      content.includes('goodbye')
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const newMessage = { role: "user", content: input };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setLastActivity(Date.now());

    try {
      const res = await axios.post(`${API_BASE_URL}/api/chat/respond`, {
        conversationHistory: updatedMessages,
        userMessage: input,
      });
      const aiMessage = { role: "ai", content: res.data.aiResponse };
      setMessages([...updatedMessages, aiMessage]);
      
      if (isConversationComplete(aiMessage)) {
        setShowEvaluation(true);
      }
    } catch (error) {
      console.error("Error sending message:", error);
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
  };

  const handleEndConversation = () => {
    if (window.confirm("Are you sure you want to end this conversation? You will receive an evaluation of your performance.")) {
      setShowEvaluation(true);
    }
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
        <div className="header-buttons">
          <button className="prompt-manager-btn" onClick={() => setShowPromptManager(true)}>
            Manage Prompts
          </button>
          <button className="end-conversation-btn" onClick={handleEndConversation}>
            End Conversation
          </button>
        </div>
      </div>
      <div className="chat-box" ref={chatBoxRef}>
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} content={msg.content} />
        ))}
        {loading && <div className="thinking">Thinking...</div>}
      </div>
      <div className="input-container">
        <input
          type="text"
          placeholder="Type your message... (Press Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
