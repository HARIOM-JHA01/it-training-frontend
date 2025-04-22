import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './EvaluationScreen.css';
import API_BASE_URL from '../config/api';
import PromptManager from './PromptManager';
import featureFlags from '../config/featureFlags';

const EvaluationScreen = ({ conversationHistory, onRestart }) => {
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePrompt, setActivePrompt] = useState(null);
  const [showPromptManager, setShowPromptManager] = useState(false);
  const [activeTab, setActiveTab] = useState('category'); // 'category' or 'interaction'
  const [modelAnswers, setModelAnswers] = useState(null);
  const [modelAnswersLoading, setModelAnswersLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchScores = async () => {
      setLoading(true);
      setError(null);
      setModelAnswers(null);
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/chat/evaluate-scores`,
          { conversationHistory }
        );
        if (isMounted) setEvaluation(response.data);
        // Fetch prompt if needed
        if (featureFlags.showEvaluationCriteria) {
          const promptResponse = await axios.get(`${API_BASE_URL}/api/prompts/active/evaluation`);
          if (isMounted) setActivePrompt(promptResponse.data);
        }
        // Start fetching model answers in background
        setModelAnswersLoading(true);
        axios.post(`${API_BASE_URL}/api/chat/model-answers`, { conversationHistory })
          .then(res => {
            if (isMounted) setModelAnswers(res.data.modelAnswers);
          })
          .catch(() => {
            if (isMounted) setModelAnswers([]);
          })
          .finally(() => {
            if (isMounted) setModelAnswersLoading(false);
          });
      } catch (err) {
        if (isMounted) setError(err.response?.data?.error || 'Failed to fetch evaluation');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchScores();
    return () => { isMounted = false; };
  }, [conversationHistory]);

  // Group conversation history by interaction
  const getInteractionMessages = () => {
    if (!conversationHistory) return [];
    
    // Create an array of interactions, each containing client and PM messages
    const interactions = [];
    
    // Add the greeting as the first interaction
    if (conversationHistory.length > 0) {
      const firstClientMessage = conversationHistory[0];
      if (firstClientMessage.role === 'ai') {
        interactions.push({
          step: 1,
          client: firstClientMessage.content,
          pm: conversationHistory[1]?.role === 'user' ? conversationHistory[1].content : null,
          modelAnswer: evaluation?.modelAnswers?.find(ma => ma.interactionStep === 1)?.example || null
        });
      }
    }
    
    // Process the rest of the messages
    for (let i = 2; i < conversationHistory.length; i += 2) {
      const clientMessage = conversationHistory[i]?.role === 'ai' ? conversationHistory[i] : null;
      const pmMessage = conversationHistory[i+1]?.role === 'user' ? conversationHistory[i+1] : null;
      
      if (clientMessage) {
        interactions.push({
          step: interactions.length + 1,
          client: clientMessage.content,
          pm: pmMessage?.content || null,
          modelAnswer: evaluation?.modelAnswers?.find(ma => ma.interactionStep === interactions.length + 1)?.example || null
        });
      }
    }
    
    // If we have fewer than 6 interactions, fill in the missing ones
    while (interactions.length < 6) {
      interactions.push({
        step: interactions.length + 1,
        client: null,
        pm: null,
        modelAnswer: evaluation?.modelAnswers?.find(ma => ma.interactionStep === interactions.length + 1)?.example || null
      });
    }
    
    return interactions;
  };

  if (showPromptManager && featureFlags.showPromptManager) {
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

  const interactionMessages = getInteractionMessages();

  return (
    <div className="evaluation-container">
      <div className="evaluation-header">
        <h1>Performance Evaluation</h1>
        <p>Here's a detailed analysis of your project management skills based on the conversation.</p>
      </div>
      
      <div className="evaluation-tabs">
        <button 
          className={`tab-button ${activeTab === 'category' ? 'active' : ''}`}
          onClick={() => setActiveTab('category')}
        >
          Category Evaluation
        </button>
        <button 
          className={`tab-button ${activeTab === 'interaction' ? 'active' : ''}`}
          onClick={() => setActiveTab('interaction')}
        >
          Interaction Model Answers
        </button>
      </div>
      
      {activeTab === 'category' ? (
        <>
          {evaluation.interactionMetrics && (
            <div className="interaction-metrics">
              <h2>Conversation Progress</h2>
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(evaluation.interactionMetrics.completedInteractions / evaluation.interactionMetrics.totalInteractions) * 100}%` }}
                  ></div>
                </div>
                <div className="progress-labels">
                  <span>Interactions Completed: {evaluation.interactionMetrics.completedInteractions} of {evaluation.interactionMetrics.totalInteractions}</span>
                  <span>Completion: {Math.round((evaluation.interactionMetrics.completedInteractions / evaluation.interactionMetrics.totalInteractions) * 100)}%</span>
                </div>
              </div>
            </div>
          )}

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
                
                {value.modelAnswer && (
                  <div className="model-answer">
                    <h4>Model Response Example</h4>
                    <p>{value.modelAnswer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="overall-feedback">
            <h2>Overall Assessment</h2>
            
            {evaluation.overallAssessment && (
              <div className="overall-assessment">
                <div className="assessment-content">
                  {evaluation.overallAssessment.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}
            
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
        </>
      ) : (
        <div className="interaction-model-answers">
          <h2>Step-by-Step Model Responses</h2>
          <p className="model-answers-intro">
            Below are examples of model responses for each interaction in the conversation. 
            Compare these with your own responses to see how you might improve your communication approach.
          </p>
          {modelAnswersLoading && (
            <div style={{textAlign: 'center', margin: '2rem 0'}}>
              <span>Loading model answers...</span>
            </div>
          )}
          {!modelAnswersLoading && modelAnswers && interactionMessages.map((interaction) => {
            const model = modelAnswers.find(ma => ma.interactionStep === interaction.step)?.example || 'No model answer available';
            return (
              <div key={interaction.step} className="interaction-comparison">
                <div className="interaction-header">
                  <h3>Interaction {interaction.step}</h3>
                </div>
                <div className="messages-container">
                  <div className="client-message">
                    <h4>Internal Client</h4>
                    <div className="message-content">
                      {interaction.client || 'No message in this interaction'}
                    </div>
                  </div>
                  <div className="pm-messages">
                    <div className="your-response">
                      <h4>Your Response</h4>
                      <div className="message-content">
                        {interaction.pm || 'No response in this interaction'}
                      </div>
                    </div>
                    <div className="model-response">
                      <h4>Model Response Example</h4>
                      <div className="message-content model">
                        {model}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {!modelAnswersLoading && !modelAnswers && (
            <div style={{textAlign: 'center', margin: '2rem 0'}}>
              <span>No model answers available.</span>
            </div>
          )}
        </div>
      )}

      {featureFlags.showEvaluationCriteria && activePrompt && (
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
        {featureFlags.showPromptManager && (
          <button className="manage-prompts-button" onClick={() => setShowPromptManager(true)}>
            Manage Prompts
          </button>
        )}
      </div>
    </div>
  );
};

export default EvaluationScreen;
