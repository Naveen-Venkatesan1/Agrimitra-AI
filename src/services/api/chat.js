import { db, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from '../../config/firebase';

export const chatApi = {

  async sendMessage(prompt, language = 'English', uid = null, contextObj = null, options = {}) {
    try {
      const { onChunk, onSentence, sessionId } = options || {};
      let responseText = '';
      const stateName = contextObj?.state || 'Tamil Nadu';
      const districtName = contextObj?.district || 'Thanjavur';
      const cropName = contextObj?.crop || 'Unknown';

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const currentSessionId = sessionId || window.currentChatSessionId || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      if (!sessionId && !window.currentChatSessionId) {
        window.currentChatSessionId = currentSessionId;
      }
      
      const endpoint = `${API_BASE_URL}/api/assistant/chat`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: prompt,
          language: language,
          session_id: currentSessionId,
          context: {
            state: stateName,
            district: districtName,
            cropName: cropName
          }
        })
      });

      if (response.ok) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let currentText = "";
        let spokenTextIndex = 0;
        let buffer = "";
        
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            buffer += decoder.decode(value, { stream: !done });
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.substring(6);
                if (dataStr.trim() === '[DONE]') continue;
                try {
                  const dataObj = JSON.parse(dataStr);
                  if (dataObj.error) {
                    console.warn("Server streaming error:", dataObj.error);
                  } else if (dataObj.text) {
                    currentText += dataObj.text;
                    if (onChunk) {
                      onChunk(currentText);
                    } else if (window.onChatChunk) {
                      window.onChatChunk(currentText);
                    }
                    
                    const match = currentText.substring(spokenTextIndex).match(/[^.!?।\n]+[.!?।\n]+/g);
                    if (match) {
                      for (const sentence of match) {
                        const trimmed = sentence.trim();
                        if (trimmed) {
                          if (onSentence) {
                            onSentence(trimmed);
                          } else if (window.onChatSentence) {
                            window.onChatSentence(trimmed);
                          }
                        }
                        spokenTextIndex += sentence.length;
                      }
                    }
                  }
                } catch (e) {}
              }
            }
          }
        }
        
        if (spokenTextIndex < currentText.length) {
          const finalSentence = currentText.substring(spokenTextIndex).trim();
          if (finalSentence) {
            if (onSentence) {
              onSentence(finalSentence);
            } else if (window.onChatSentence) {
              window.onChatSentence(finalSentence);
            }
          }
        }
        
        responseText = currentText || '';
      }

      if (!responseText) {
         throw new Error("Empty response from backend");
      }

      // Save user message and assistant reply to Firestore `ai_chat_history`
      if (uid) {
        try {
          await addDoc(collection(db, 'ai_chat_history'), {
            userId: uid,
            userPrompt: prompt,
            aiResponse: responseText,
            language,
            location: `${districtName}, ${stateName}`,
            createdAt: serverTimestamp()
          });
        } catch (e) {
          console.warn('Firestore chat save warning:', e);
        }
      }

      return { success: true, text: responseText };
    } catch (err) {
      console.error("Chat API Error:", err);
      return { 
        success: false, 
        text: "I couldn't verify that information right now. Please try again.",
        isError: true
      };
    }
  },

  // Web Speech API - Text to Speech Synthesis Controls
  speakText(text, langCode = 'en-IN', onEnd = null) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel any existing speech
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      
      // Attempt to find a native voice that matches the language
      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
      if (targetVoice) {
         utterance.voice = targetVoice;
      }
      
      utterance.rate = 0.95;
      
      if (onEnd) {
        utterance.onend = onEnd;
        utterance.onerror = onEnd;
      }
      
      window.speechSynthesis.speak(utterance);
    } else if (onEnd) {
      // If TTS unavailable, immediately trigger onEnd to free up the state
      onEnd();
    }
  },

  pauseSpeech() {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  },

  resumeSpeech() {
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  },

  stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
};
