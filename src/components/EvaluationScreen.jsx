import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './EvaluationScreen.css';
import API_BASE_URL from '../config/api';
import PromptManager from './PromptManager';

const EvaluationScreen = ({ conversationHistory, onRestart }) => {
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePrompt, setActivePrompt] = useState(null);
  const [showPromptManager, setShowPromptManager] = useState(false);

  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/chat/evaluate`,
          { conversationHistory }
        );
        setEvaluation(response.data);
        
        // Fetch the active evaluation prompt
        const promptResponse = await axios.get(`${API_BASE_URL}/api/prompts/active/evaluation`);
        setActivePrompt(promptResponse.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch evaluation');
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluation();
  }, [conversationHistory]);

  if (showPromptManager) {
    return (
      <>
        <div className="evaluation-container">
          <div className="evaluation-header">
            <h1>Performance Evaluation</h1>
          </div>
        </div>
        <PromptManager onClose={() => setShowPromptManager(false)} />
      </>
    );
  }

  if (loading) {
    return (
      <div className="evaluation-container">
        <div className="evaluation-header">
          <h1>Evaluating Your Performance</h1>
          <p>Please wait while we analyze your conversation...</p>
        </div>
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="evaluation-container">
        <div className="evaluation-header">
          <h1>Evaluation Error</h1>
          <p>We encountered an issue while evaluating your performance.</p>
        </div>
        <div className="error-message">{error}</div>
        <button className="restart-button" onClick={onRestart}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="evaluation-container">
      <div className="evaluation-header">
        <h1>Performance Evaluation</h1>
        <p>Here's a detailed analysis of your project management skills based on the conversation.</p>
      </div>

      <div className="evaluation-grid">
        {Object.entries(evaluation.evaluation).map(([key, value]) => (
          <div key={key} className="evaluation-card">
            <h3>{key.charAt(0).toUpperCase() + key.slice(1)}</h3>
            <div 
              className="score-circle"
              style={{ "--percentage": `${value.percentage}%` }}
            >
              <div className="score-value">{value.score}/10</div>
            </div>
            <div className="score-label">Score</div>
            <ul className="feedback-list">
              {value.feedback.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="overall-feedback">
        <h2>Overall Assessment</h2>
        
        <div className="strengths">
          <h3>Key Strengths</h3>
          <ul>
            {evaluation.overallFeedback.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>

        <div className="improvements">
          <h3>Areas for Improvement</h3>
          <ul>
            {evaluation.overallFeedback.areasForImprovement.map((area, index) => (
              <li key={index}>{area}</li>
            ))}
          </ul>
        </div>
      </div>

      {activePrompt && (
        <div className="evaluation-prompt">
          <h2>Evaluation Criteria</h2>
          <div className="prompt-content">
            <p>This evaluation was conducted using the following criteria:</p>
            <pre>{activePrompt.content}</pre>
          </div>
        </div>
      )}

      <div className="conversation-history">
        <h2>Conversation History</h2>
        <div className="conversation-messages">
          {conversationHistory.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <strong>{message.role === 'ai' ? 'Internal Client' : 'PM'}:</strong>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="evaluation-actions">
        <button className="restart-button" onClick={onRestart}>
          Start New Conversation
        </button>
        <button className="manage-prompts-button" onClick={() => setShowPromptManager(true)}>
          Manage Prompts
        </button>
      </div>
    </div>
  );
};

export default EvaluationScreen;