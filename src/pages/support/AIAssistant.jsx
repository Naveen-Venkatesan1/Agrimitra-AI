import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, User, Mic, Headphones, ArrowRight, Sparkles, AlertCircle, Volume2, Pause, Play, Square, WifiOff, ArrowDown } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { chatApi } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';

const BCP47_MAP = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  bn: 'bn-IN',
  or: 'or-IN',
  as: 'as-IN',
  ur: 'ur-IN',
  kok: 'hi-IN'
};

export const AIAssistant = () => {
  const navigate = useNavigate();
  const { t, currentLang } = useTranslation();
  const { user, getSmartContext } = useAppStore();

  // Scroll & Focus Refs
  const chatContainerRef = useRef(null);
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Namaste ${user?.name || ''}! I am Agrimitra AI, your 24/7 smart farming assistant for ${user?.district || 'Thanjavur'}, ${user?.state || 'Tamil Nadu'}. Ask me anything about crop diseases, organic fertilizers, weather forecasts, or government subsidy schemes in your region.`,
      time: '10:00 AM'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);

  // Auto-scroll state & threshold detection
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const isUserNearBottomRef = useRef(true);
  const SCROLL_THRESHOLD = 140;

  // Voice AI States
  const [isListening, setIsListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('');
  const [activeSpeakingId, setActiveSpeakingId] = useState(null);
  const [speechPaused, setSpeechPaused] = useState(false);

  const activeLangCode = currentLang || user?.languageCode || 'en';
  const bcp47Lang = BCP47_MAP[activeLangCode] || 'en-IN';

  // Reliable scroll helper targeting the independent message container exclusively
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior
      });
    }
    isUserNearBottomRef.current = true;
    setShowJumpToLatest(false);
  }, []);

  // Detect user scroll position
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceToBottom <= SCROLL_THRESHOLD;

    isUserNearBottomRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom);
  }, []);

  // Initial mount: scroll to bottom
  useEffect(() => {
    scrollToBottom('auto');
  }, [scrollToBottom]);

  // Auto-scroll when new messages arrive or typing status changes (only if user is near bottom)
  useEffect(() => {
    if (isUserNearBottomRef.current) {
      scrollToBottom('smooth');
    } else {
      setShowJumpToLatest(true);
    }
  }, [messages, isTyping, scrollToBottom]);

  const toggleMic = () => {
    if (typeof window === 'undefined') return;

    if (!navigator.onLine) {
      setSpeechStatus('Offline: Speech recognition requires internet connection');
      setTimeout(() => setSpeechStatus(''), 3500);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatus('Speech recognition not supported in this browser');
      setTimeout(() => setSpeechStatus(''), 3500);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = bcp47Lang;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechStatus('Listening... Speak now');
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
        if (event.results[0].isFinal) {
          setIsListening(false);
          setSpeechStatus('Voice captured!');
          setTimeout(() => setSpeechStatus(''), 2000);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setSpeechStatus('Could not hear clearly, please try speaking again.');
        setTimeout(() => setSpeechStatus(''), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  // Alt + V keyboard shortcut for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.altKey && e.key.toLowerCase() === 'v') || (e.ctrlKey && e.key.toLowerCase() === 'm')) {
        e.preventDefault();
        toggleMic();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening]);

  // Audio Playback Controls
  const handlePlaySpeech = (msgId, text) => {
    setActiveSpeakingId(msgId);
    setSpeechPaused(false);
    chatApi.speakText(text, bcp47Lang, () => {
      setActiveSpeakingId(null);
      setSpeechPaused(false);
    });
  };

  const handlePauseSpeech = () => {
    chatApi.pauseSpeech();
    setSpeechPaused(true);
  };

  const handleResumeSpeech = () => {
    chatApi.resumeSpeech();
    setSpeechPaused(false);
  };

  const handleStopSpeech = () => {
    chatApi.stopSpeech();
    setActiveSpeakingId(null);
    setSpeechPaused(false);
  };

  const samplePrompts = [
    "How do I prevent Paddy Leaf Blast biologically?",
    "What is the current soil moisture level for my field?",
    "Which government subsidy is available for drip irrigation?",
    "When is the best time to sow Wheat in Kharif season?"
  ];

  const handleSend = async (textToSend = input) => {
    if (!textToSend.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Force user near bottom & scroll immediately on send
    isUserNearBottomRef.current = true;
    setShowJumpToLatest(false);
    setTimeout(() => scrollToBottom('smooth'), 40);

    if (inputRef.current) {
      inputRef.current.focus();
    }

    try {
      const smartContext = getSmartContext ? getSmartContext() : null;
      const res = await chatApi.sendMessage(textToSend, user?.language || 'English', user?.id, smartContext);

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: res.text || 'Sorry, I could not process your query at this moment.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: '⚠️ Unable to connect to assistant service. Please check your internet connection and try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      setShowEscalation(true);
      if (isUserNearBottomRef.current) {
        setTimeout(() => scrollToBottom('smooth'), 40);
      }
    }
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">AI Multilingual Voice & Chat Assistant</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{t('ai_assistant_title')}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('ai_assistant_subtitle')}</p>
        </div>

        <Button 
          onClick={() => navigate('/support/state-problem-solving')} 
          variant="outline" 
          size="sm" 
          icon={Headphones}
        >
          {t('state_agri_officers')}
        </Button>
      </div>

      {/* Main Chat Container */}
      <Card hover={false} className="p-0 border border-gray-200 overflow-hidden shadow-card flex flex-col h-[560px] relative">
        {/* Chat Header */}
        <div className="p-4 bg-gradient-to-r from-[#0B3D2E] to-[#0F4D3A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-[#8BC34A] border border-white/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Agrimitra Multilingual Voice Bot</h3>
              <p className="text-[11px] text-emerald-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#8BC34A] animate-pulse" /> {t('online')} • Voice & Text ({bcp47Lang})
              </p>
            </div>
          </div>

          <span className="text-[10px] bg-white/10 px-2.5 py-1 rounded-full text-emerald-100 font-medium">
            Alt + V to speak
          </span>
        </div>

        {/* Message Feed - Independent Scroll Container */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gray-50/50 relative"
        >
          {messages.map((msg) => {
            const isSpeakingThis = activeSpeakingId === msg.id;
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 max-w-xl ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  msg.sender === 'user' ? 'bg-agri-primary text-white' : 'bg-emerald-100 text-agri-primary'
                }`}>
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-agri-primary text-white rounded-tr-none shadow-xs'
                    : msg.isError
                    ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-none shadow-subtle'
                    : 'bg-white text-agri-text border border-gray-100 rounded-tl-none shadow-subtle'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <p>{msg.text}</p>
                    {msg.sender === 'ai' && !msg.isError && (
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {!isSpeakingThis ? (
                          <button 
                            onClick={() => handlePlaySpeech(msg.id, msg.text)}
                            className="p-1 rounded text-gray-400 hover:text-agri-primary transition hover:bg-gray-100"
                            title="Speak out loud"
                          >
                            <Volume2 className="w-4 h-4 text-emerald-600" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            {speechPaused ? (
                              <button 
                                onClick={handleResumeSpeech}
                                className="text-emerald-700 hover:text-emerald-900"
                                title="Resume Voice"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button 
                                onClick={handlePauseSpeech}
                                className="text-emerald-700 hover:text-emerald-900"
                                title="Pause Voice"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button 
                              onClick={handleStopSpeech}
                              className="text-red-500 hover:text-red-700 ml-1"
                              title="Stop Voice"
                            >
                              <Square className="w-3.5 h-3.5 fill-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] block mt-1.5 ${msg.sender === 'user' ? 'text-emerald-200 text-right' : 'text-gray-400'}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium p-2 bg-white rounded-xl w-fit border border-gray-100">
              <Sparkles className="w-4 h-4 text-agri-light animate-spin" />
              <span>Agrimitra AI is analyzing query...</span>
            </div>
          )}

          {/* Dedicated Chat Bottom Scroll Reference */}
          <div ref={chatBottomRef} className="h-0 w-0" />
        </div>

        {/* Floating Jump to Latest Button (only visible when user manually scrolls up) */}
        {showJumpToLatest && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-28 right-6 z-20 px-3.5 py-1.5 bg-[#0B4D2F] text-white text-xs font-bold rounded-full shadow-lg hover:bg-emerald-800 transition-all flex items-center gap-1.5 animate-bounce cursor-pointer border border-emerald-300/30"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Jump to latest</span>
          </button>
        )}

        {/* Speech Status Feedback Banner */}
        {speechStatus && (
          <div className="px-4 py-2 bg-emerald-100 border-t border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              {speechStatus}
            </span>
          </div>
        )}

        {/* Quick Suggestion Prompts */}
        <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Suggested:</span>
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-agri-primary border border-emerald-100 rounded-full text-[11px] font-semibold whitespace-nowrap transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-white border-t border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={isListening ? "Listening to your voice..." : t('ask_question_placeholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => {
                if (isUserNearBottomRef.current) {
                  setTimeout(() => scrollToBottom('smooth'), 200);
                }
              }}
              className={`flex-1 px-4 py-2.5 border rounded-xl text-xs sm:text-sm focus:outline-none transition ${
                isListening 
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300' 
                  : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-agri-primary'
              }`}
            />
            <button
              type="button"
              onClick={toggleMic}
              className={`p-2.5 rounded-xl border transition relative ${
                isListening
                  ? 'bg-red-500 text-white border-red-600 animate-pulse shadow-md'
                  : 'border-gray-200 text-agri-primary hover:bg-emerald-50'
              }`}
              title="Toggle Voice Input (Alt + V)"
            >
              <Mic className="w-5 h-5" />
            </button>
            <Button type="submit" variant="primary" icon={Send}>
              {t('send')}
            </Button>
          </form>
        </div>
      </Card>

      {/* Escalation Banner if query unresolved */}
      {showEscalation && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-900">Still need help or custom diagnostic?</h4>
              <p className="text-xs text-amber-700">Escalate your question directly to state-wise Krishi Vigyan Kendra (KVK) Agri Officers.</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/support/state-problem-solving')} 
            variant="primary" 
            size="sm" 
            icon={ArrowRight}
          >
            Escalate to State Officer
          </Button>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
