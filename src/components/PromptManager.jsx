import { useState, useEffect } from 'react';
import axios from 'axios';
import './PromptManager.css';
import API_BASE_URL from '../config/api';

const PromptManager = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('greeting');
  const [prompts, setPrompts] = useState([]);
  const [activePrompt, setActivePrompt] = useState(null);
  const [newPromptContent, setNewPromptContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const promptTypes = [
    { id: 'greeting', label: 'Greeting Prompts' },
    { id: 'conversation', label: 'Conversation Prompts' },
    { id: 'evaluation', label: 'Evaluation Prompts' }
  ];

  // Fetch prompts when tab changes
  useEffect(() => {
    fetchPrompts();
  }, [activeTab]);

  const fetchPrompts = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all prompts of the selected type
      const promptsResponse = await axios.get(`${API_BASE_URL}/api/prompts/types/${activeTab}`);
      setPrompts(promptsResponse.data);

      // Fetch the active prompt
      const activePromptResponse = await axios.get(`${API_BASE_URL}/api/prompts/active/${activeTab}`);
      setActivePrompt(activePromptResponse.data);
      
      // Initialize new prompt content with the active prompt's content
      if (activePromptResponse.data && activePromptResponse.data.content) {
        setNewPromptContent(activePromptResponse.data.content);
      } else {
        setNewPromptContent('');
      }
    } catch (err) {
      console.error('Error fetching prompts:', err);
      setError('Failed to load prompts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrompt = async () => {
    if (!newPromptContent.trim()) {
      setError('Prompt content cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/prompts`, {
        type: activeTab,
        content: newPromptContent
      });
      
      // Add the new prompt to the list
      setPrompts([...prompts, response.data]);
      setSuccess('Prompt created successfully!');
      
      // Clear the form
      setNewPromptContent('');
      
      // Refresh prompts
      fetchPrompts();
    } catch (err) {
      console.error('Error creating prompt:', err);
      setError('Failed to create prompt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePrompt = async (id) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await axios.put(`${API_BASE_URL}/api/prompts/activate/${id}`);
      setSuccess('Prompt activated successfully!');
      
      // Refresh prompts
      fetchPrompts();
    } catch (err) {
      console.error('Error activating prompt:', err);
      setError('Failed to activate prompt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholderText = () => {
    switch (activeTab) {
      case 'greeting':
        return 'Use ${name} as a placeholder for the user\'s name';
      case 'conversation':
        return 'Use ${conversationHistory} for the conversation history and ${userInput} for the user\'s message';
      case 'evaluation':
        return 'Use ${conversationHistory} for the conversation history';
      default:
        return '';
    }
  };

  return (
    <div className="prompt-manager-overlay">
      <div className="prompt-manager-container">
        <div className="prompt-manager-header">
          <h2>Prompt Manager</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="prompt-tabs">
          {promptTypes.map(type => (
            <button
              key={type.id}
              className={`tab-button ${activeTab === type.id ? 'active' : ''}`}
              onClick={() => setActiveTab(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <div className="prompt-content">
          <h3>Create New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Prompt</h3>
          <div className="prompt-form">
            <textarea
              placeholder={getPlaceholderText()}
              value={newPromptContent}
              onChange={(e) => setNewPromptContent(e.target.value)}
              rows={8}
            />
            <button 
              onClick={handleCreatePrompt} 
              disabled={loading}
              className="create-button"
            >
              {loading ? 'Creating...' : 'Create Prompt'}
            </button>
          </div>
          
          <h3>Existing Prompts</h3>
          {loading && <div className="loading">Loading prompts...</div>}
          
          {!loading && prompts.length === 0 && (
            <div className="no-prompts">No custom prompts available.</div>
          )}
          
          <div className="prompts-list">
            {prompts.map(prompt => (
              <div key={prompt.id} className={`prompt-item ${activePrompt && activePrompt.id === prompt.id ? 'active' : ''}`}>
                <div className="prompt-preview">{prompt.content.substring(0, 100)}...</div>
                <div className="prompt-actions">
                  {activePrompt && activePrompt.id === prompt.id ? (
                    <span className="active-badge">Active</span>
                  ) : (
                    <button 
                      onClick={() => handleActivatePrompt(prompt.id)}
                      disabled={loading}
                      className="activate-button"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptManager;