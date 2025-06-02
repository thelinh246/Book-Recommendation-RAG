import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Menu, 
  X, 
  User, 
  Bot, 
  Edit3, 
  Trash2, 
  Settings,
  LogOut,
  Sun,
  Moon,
  AlertCircle,
  Check,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

const ChatGPTUI = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  
  // Autocomplete states
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const titleInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const autocompleteTimeoutRef = useRef(null);

  const API_BASE_URL = 'http://127.0.0.1:8000';

  // Generate UUID function
  const generateUUID = () => {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function(c) {
      const r = Math.random() * 16 | 0;
      return r.toString(16);
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [inputValue]);

  // Focus title input when editing starts
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  // Load chat sessions on component mount
  useEffect(() => {
    loadChatSessions();
  }, []);

  // Autocomplete effect
  useEffect(() => {
    // Clear existing timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    // Only fetch autocomplete if we have a session and input
    if (inputValue.trim().length > 0 && currentSessionId) {
      autocompleteTimeoutRef.current = setTimeout(() => {
        fetchAutocomplete(inputValue.trim());
      }, 300); // Debounce for 300ms
    } else {
      setShowAutocomplete(false);
      setAutocompleteResults([]);
    }

    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, [inputValue, currentSessionId]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target) && 
          textareaRef.current && !textareaRef.current.contains(event.target)) {
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchAutocomplete = async (inputPrefix) => {
    if (!currentSessionId || inputPrefix.length < 1) return;

    try {
      setAutocompleteLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/sessions/${currentSessionId}/autocomplete?input_prefix=${encodeURIComponent(inputPrefix)}&limit=5`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAutocompleteResults(data.completions || []);
        setShowAutocomplete(data.completions && data.completions.length > 0);
        setSelectedSuggestionIndex(-1);
      } else {
        setAutocompleteResults([]);
        setShowAutocomplete(false);
      }
    } catch (error) {
      console.error('Error fetching autocomplete:', error);
      setAutocompleteResults([]);
      setShowAutocomplete(false);
    } finally {
      setAutocompleteLoading(false);
    }
  };

  const handleAutocompleteSelect = (suggestion) => {
    setInputValue(suggestion);
    setShowAutocomplete(false);
    setSelectedSuggestionIndex(-1);
    textareaRef.current?.focus();
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(''), 3000);
  };

  const loadChatSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/sessions`);
      if (response.ok) {
        const data = await response.json();
        setChatHistory(data.sessions || []);
      } else {
        showNotification('Không thể tải danh sách cuộc trò chuyện', 'error');
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      showNotification('Lỗi kết nối khi tải cuộc trò chuyện', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveChatSession = async (sessionId = null, messagesToSave = null) => {
    const messagesForSave = messagesToSave || messages;
    
    if (messagesForSave.length === 0) {
      return;
    }

    try {
      const sessionIdToUse = sessionId || currentSessionId || generateUUID();
      
      // Convert messages to API format
      const formattedMessages = messagesForSave.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionIdToUse,
          messages: formattedMessages
        }),
      });

      if (response.ok) {
        // Update current session ID if it's a new session
        if (!currentSessionId) {
          setCurrentSessionId(sessionIdToUse);
        }
        
        // Reload sessions to get updated list
        await loadChatSessions();
      } else {
        showNotification('Không thể lưu cuộc trò chuyện', 'error');
      }
    } catch (error) {
      console.error('Error saving session:', error);
      showNotification('Lỗi kết nối khi lưu cuộc trò chuyện', 'error');
    }
  };

  const updateChatTitle = async (sessionId, newTitle) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_title: newTitle
        }),
      });

      if (response.ok) {
        showNotification('Đã cập nhật tiêu đề', 'success');
        // Update the chat history locally
        setChatHistory(prev => prev.map(chat => 
          chat.id === sessionId 
            ? { ...chat, title: newTitle }
            : chat
        ));
      } else {
        showNotification('Không thể cập nhật tiêu đề', 'error');
      }
    } catch (error) {
      console.error('Error updating title:', error);
      showNotification('Lỗi kết nối khi cập nhật tiêu đề', 'error');
    }
  };

  const loadChatMessages = async (sessionId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        const formattedMessages = data.messages.map((msg, index) => ({
          id: `${sessionId}-${index}`,
          text: msg.content,
          sender: msg.role === 'user' ? 'user' : 'bot',
          timestamp: new Date().toLocaleTimeString()
        }));
        setMessages(formattedMessages);
        setActiveChat(sessionId);
        setCurrentSessionId(sessionId);
      } else {
        showNotification('Không thể tải tin nhắn', 'error');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      showNotification('Lỗi kết nối khi tải tin nhắn', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteChatSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const data = await response.json();
        showNotification(data.Noti || 'Xóa thành công', 'success');
        // Remove from chat history
        setChatHistory(prev => prev.filter(chat => chat.id !== sessionId));
        // Clear messages if this was the active chat
        if (activeChat === sessionId) {
          setMessages([]);
          setActiveChat(null);
          setCurrentSessionId(null);
        }
      } else {
        showNotification('Không thể xóa cuộc trò chuyện', 'error');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      showNotification('Lỗi kết nối khi xóa cuộc trò chuyện', 'error');
    }
  };

  const sendMessageToAPI = async (message, currentMessages) => {
    try {
      setIsTyping(true);
      const response = await fetch(`${API_BASE_URL}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
          lang: 'vi',
          session_id: currentSessionId,  // Gửi kèm session_id trong body
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage = {
          id: Date.now() + 1, // Ensure unique ID
          text: data.response,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString()
        };
        
        // Update messages with both user and bot messages
        const updatedMessages = [...currentMessages, botMessage];
        setMessages(updatedMessages);
        
        // Auto-save the conversation after bot response
        setTimeout(() => {
          saveChatSession(currentSessionId, updatedMessages);
        }, 500);
        
      } else {
        showNotification('Không thể gửi tin nhắn', 'error');
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showNotification('Lỗi kết nối khi gửi tin nhắn', 'error');
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isTyping) return;

    const newMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    // If this is the first message and no current session, generate new session ID
    if (messages.length === 0 && !currentSessionId) {
      setCurrentSessionId(generateUUID());
    }

    // Add user message immediately and store the updated messages
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    
    const messageToSend = inputValue;
    setInputValue('');
    setShowAutocomplete(false);
    setSelectedSuggestionIndex(-1);
    
    // Pass the updated messages to the API call
    await sendMessageToAPI(messageToSend, updatedMessages);
  };

  const handleKeyPress = (e) => {
    if (showAutocomplete && autocompleteResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < autocompleteResults.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : autocompleteResults.length - 1
        );
        return;
      }
      
      if (e.key === 'Tab' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleAutocompleteSelect(autocompleteResults[selectedSuggestionIndex]);
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showAutocomplete && selectedSuggestionIndex >= 0) {
        handleAutocompleteSelect(autocompleteResults[selectedSuggestionIndex]);
      } else {
        handleSendMessage();
      }
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setActiveChat(null);
    setCurrentSessionId(null);
    setShowAutocomplete(false);
    setAutocompleteResults([]);
  };

  const handleChatClick = (chat) => {
    if (editingTitle === chat.id) return; // Don't load chat if editing title
    loadChatMessages(chat.id);
  };

  const handleDeleteChat = (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) {
      deleteChatSession(sessionId);
    }
  };

  const handleEditTitle = (e, chat) => {
    e.stopPropagation();
    setEditingTitle(chat.id);
    setEditTitleValue(chat.title);
  };

  const handleSaveTitle = async (sessionId) => {
    if (editTitleValue.trim() === '') {
      showNotification('Tiêu đề không được để trống', 'warning');
      return;
    }
    
    await updateChatTitle(sessionId, editTitleValue.trim());
    setEditingTitle(null);
    setEditTitleValue('');
  };

  const handleCancelEdit = () => {
    setEditingTitle(null);
    setEditTitleValue('');
  };

  const handleTitleKeyPress = (e, sessionId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle(sessionId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const themeClass = darkMode ? 'dark bg-gray-900 text-white' : 'bg-white text-gray-900';
  const sidebarClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';

  return (
    <div className={`flex h-screen ${themeClass} transition-colors duration-200`}>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'error' ? 'bg-red-500 text-white' : 
          notification.type === 'success' ? 'bg-green-500 text-white' : 
          notification.type === 'warning' ? 'bg-yellow-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} />
            <span className="text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} ${sidebarClass} border-r transition-all duration-300 overflow-hidden flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={startNewChat}
            className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg border-2 border-dashed ${
              darkMode ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-100'
            } transition-colors`}
          >
            <Plus size={20} />
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="text-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Đang tải...</p>
            </div>
          )}
          <div className="space-y-1">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  activeChat === chat.id 
                    ? (darkMode ? 'bg-gray-700' : 'bg-gray-200') 
                    : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                }`}
                onClick={() => handleChatClick(chat)}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <MessageSquare size={16} className="text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    {editingTitle === chat.id ? (
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onKeyDown={(e) => handleTitleKeyPress(e, chat.id)}
                        onBlur={() => handleSaveTitle(chat.id)}
                        className={`w-full text-sm font-medium bg-transparent border-b-2 border-blue-500 outline-none ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{chat.title}</p>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                  {editingTitle === chat.id ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveTitle(chat.id);
                      }}
                      className="p-1 hover:bg-green-200 dark:hover:bg-green-600 rounded text-green-500 dark:text-green-400"
                    >
                      <Check size={14} />
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => handleEditTitle(e, chat)}
                      className="p-1 hover:bg-blue-200 dark:hover:bg-blue-600 rounded text-blue-500 dark:text-blue-400"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                  <button 
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="p-1 hover:bg-red-200 dark:hover:bg-red-600 rounded text-red-500 dark:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`w-full flex items-center space-x-3 p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span className="text-sm">{darkMode ? 'Chế độ sáng' : 'Chế độ tối'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-xl font-semibold">Book Recommendation System</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'}`}>
              Version 1
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto p-8">
                <Bot size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <h2 className="text-2xl font-semibold mb-2">Welcome to Book Recommendation System</h2>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                  Tôi là trợ lý AI của bạn. Hãy bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn bên dưới.
                </p>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <button 
                    onClick={() => setInputValue("I want a book about artificial intelligence")}
                    className={`p-3 rounded-lg text-left ${darkMode ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'} transition-colors`}
                  >
                    🤖 I want a book about artificial intelligence
                  </button>
                  <button 
                    onClick={() => setInputValue("Recommend me a romance novel")}
                    className={`p-3 rounded-lg text-left ${darkMode ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'} transition-colors`}
                  >
                    💕 Recommend me a romance novel
                  </button>
                  <button 
                    onClick={() => setInputValue("I need a book about personal development")}
                    className={`p-3 rounded-lg text-left ${darkMode ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'} transition-colors`}
                  >
                    📚 I need a book about personal development
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div key={message.id} className={`py-6 px-4 ${index % 2 === 1 ? (darkMode ? 'bg-gray-800' : 'bg-gray-50') : ''}`}>
                  <div className="max-w-3xl mx-auto flex space-x-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : (darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white')
                    }`}>
                      {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-sm">
                          {message.sender === 'user' ? 'You' : 'Assistant'}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {message.timestamp}
                        </span>
                      </div>
                      <div className={`prose prose-sm max-w-none ${darkMode ? 'prose-invert' : ''}`}>
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                          {message.text}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className={`py-6 px-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="max-w-3xl mx-auto flex space-x-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}`}>
                      <Bot size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-sm">Assistant</span>
                      </div>
                      <div className="flex space-x-1">
                        <div className={`w-2 h-2 ${darkMode ? 'bg-gray-400' : 'bg-gray-600'} rounded-full animate-bounce`}></div>
                        <div className={`w-2 h-2 ${darkMode ? 'bg-gray-400' : 'bg-gray-600'} rounded-full animate-bounce`} style={{animationDelay: '0.1s'}}></div>
                        <div className={`w-2 h-2 ${darkMode ? 'bg-gray-400' : 'bg-gray-600'} rounded-full animate-bounce`} style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4`}>
          <div className="max-w-4xl mx-auto relative">
            {/* Autocomplete Dropdown */}
            {showAutocomplete && autocompleteResults.length > 0 && (
              <div 
                ref={autocompleteRef}
                className={`absolute bottom-full left-0 right-0 mb-2 ${
                  darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                } border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10`}
              >
                {autocompleteLoading && (
                  <div className="p-3 text-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                )}
                {!autocompleteLoading && autocompleteResults.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`p-3 cursor-pointer flex items-center justify-between ${
                      index === selectedSuggestionIndex 
                        ? (darkMode ? 'bg-gray-700' : 'bg-gray-100')
                        : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                    } ${index === 0 ? 'rounded-t-lg' : ''} ${
                      index === autocompleteResults.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-200 dark:border-gray-600'
                    }`}
                    onClick={() => handleAutocompleteSelect(suggestion)}
                  >
                    <span className="text-sm">{suggestion}</span>
                    {index === selectedSuggestionIndex && (
                      <span className="text-xs text-gray-500">Tab to select</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={`flex space-x-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-3`}>
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Nhập tin nhắn của bạn..."
                className={`flex-1 resize-none border-0 bg-transparent outline-none text-sm ${
                  darkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
                } max-h-48`}
                rows={1}
                disabled={isTyping}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                  inputValue.trim() && !isTyping
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-400')
                }`}
              >
                <Send size={18} />
              </button>
            </div>
            
            {/* Keyboard shortcuts hint */}
            {showAutocomplete && autocompleteResults.length > 0 && (
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2 flex items-center space-x-4`}>
                <span className="flex items-center space-x-1">
                  <ChevronUp size={12} />
                  <ChevronDown size={12} />
                  <span>Navigate</span>
                </span>
                <span>Tab to select</span>
                <span>Esc to close</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatGPTUI;