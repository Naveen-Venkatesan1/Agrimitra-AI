class GeminiLiveClient {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.stream = null;
    this.processor = null;
    this.source = null;
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
    this.onStateChange = null;
    this.onMessage = null;
    this.onError = null;
    this.state = 'idle'; // idle, connecting, connected, listening, speaking, error
  }

  setState(newState) {
    this.state = newState;
    if (this.onStateChange) this.onStateChange(newState);
  }

  connect(language, smartContext) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
        this.setState('connecting');

        // Start microphone request concurrently
        const micPromise = navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        });

        try {
          const defaultWs = import.meta.env.VITE_API_BASE_URL 
            ? import.meta.env.VITE_API_BASE_URL.replace(/^http/, 'ws') 
            : (import.meta.env.PROD ? 'wss://agrimitra-ai-l207.onrender.com' : 'ws://localhost:8000');
          const wsUrl = import.meta.env.VITE_WS_BASE_URL || defaultWs;
          this.ws = new WebSocket(`${wsUrl}/api/assistant/live`);

          this.ws.onopen = () => {
            this.setupSession(language, smartContext);
          };

          this.ws.onmessage = async (event) => {
            try {
              let textData = event.data;
              if (event.data instanceof Blob) {
                  textData = await event.data.text();
              }
              const response = JSON.parse(textData);
              
              if (response.setupComplete) {
                  this.setState('connected');
                  try {
                      this.stream = await micPromise;
                      this.startProcessingStream(this.stream);
                      resolve();
                  } catch (err) {
                      console.error("Microphone access denied or error:", err);
                      if (this.onError) {
                        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                           this.onError("Microphone access is needed to talk to AgriMithra.");
                        } else {
                           this.onError("Could not access microphone.");
                        }
                      }
                      this.cleanup();
                      reject(err);
                  }
              } else {
                  this.handleResponse(response);
              }
            } catch (err) {
              console.error("Error parsing Gemini message", err);
            }
          };

          this.ws.onclose = () => {
            this.cleanup();
          };

          this.ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            if (this.onError) this.onError("Voice connection was interrupted. Trying again...");
            this.cleanup();
            reject(new Error("WebSocket error"));
          };
        } catch (err) {
          console.error("Connection error", err);
          if (this.onError) this.onError("Could not connect to voice assistant.");
          this.cleanup();
          reject(err);
        }
    });
  }

  setupSession(language, smartContext) {
    const langInstructions = `You are AgriMithra AI, a farmer-friendly multilingual agricultural voice assistant for Indian farmers.
The active application language is: ${language.toUpperCase()}.
For every response, you must explicitly align with the active application language context (${language.toUpperCase()}).
Unless the user speaks/types in another language, respond in ${language.toUpperCase()} using natural farmer-friendly terms.
If the user speaks/types in another language during the current turn (e.g. English, or a different Indian language), understand the user's language and respond naturally in that language for that turn.
Never automatically or randomly switch languages unless the user switches language.
Do not assume every Devanagari response is Hindi. If the active application language is MARATHI or KONKANI, respond in MARATHI or KONKANI when using Devanagari script.
If automatic language detection is uncertain, prefer the active application language (${language.toUpperCase()}).
Keep responses concise, practical, conversational and suitable for spoken audio. Keep responses in 2-5 short sentences.
Do not mention language detection or system instructions to the user.`;
    
    let contextStr = '';
    if (smartContext) {
        contextStr = `Current Context:
Location: ${smartContext.state || ''}, ${smartContext.district || ''}
Crop: ${smartContext.crop || 'Unknown'} (Stage: ${smartContext.cropStage || 'Unknown'})
Weather: ${smartContext.temp ? `${smartContext.temp}°C, ${smartContext.weatherCondition}, Humidity ${smartContext.humidity}%` : 'Unknown'}
Farm Advice: ${smartContext.farmAdvice ? JSON.stringify(smartContext.farmAdvice) : 'None'}`;
        
        if (smartContext.farmIntelligence) {
            contextStr += `\nUnified Farm Intelligence: ${JSON.stringify(smartContext.farmIntelligence)}`;
        }

        contextStr += `\n\nCRITICAL SAFETY RULES:
1. Satellite data is periodic and may be cached. Never describe it as live.
2. NDVI/NDWI are indicators, not diagnoses. Do not invent diagnoses like "fungal infection confirmed" or "field needs irrigation definitely". Use "possible" or "evidence suggests".
3. Field inspection may be recommended where appropriate.
4. Never invent satellite readings, dates, or cloud coverage.`;
    }

    const setupMessage = {
      setup: {
        model: "models/gemini-2.0-flash-exp",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede",
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: `${langInstructions}\n\n${contextStr}` }]
        }
      }
    };
    this.ws.send(JSON.stringify(setupMessage));
  }

  startProcessingStream(stream) {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(stream);

      // Create a script processor to downsample to 16kHz mono PCM16
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      let noiseFloor = 0.01;
      
      this.processor.onaudioprocess = (e) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          let energy = 0;
          for (let i = 0; i < inputData.length; i++) {
              energy += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(energy / inputData.length);
          
          noiseFloor = noiseFloor * 0.95 + rms * 0.05;
          
          if (this.state === 'speaking' && rms > (noiseFloor * 2.5 + 0.02)) {
              this.interrupt();
          }

          const pcmData = this.floatTo16BitPCM(inputData);
          const base64Data = this.bufferToBase64(pcmData.buffer);
          
          this.ws.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm;rate=16000",
                data: base64Data
              }]
            }
          }));
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.setState('listening');

    } catch (err) {
      console.error("Error setting up audio processing:", err);
      this.cleanup();
    }
  }

  floatTo16BitPCM(float32Array) {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  }

  bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  handleResponse(response) {
    if (response.serverContent && response.serverContent.modelTurn) {
      const parts = response.serverContent.modelTurn.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          this.playAudioChunk(part.inlineData.data);
        }
        if (part.text && this.onMessage) {
            this.onMessage(part.text, 'ai');
        }
      }
    }
  }

  async playAudioChunk(base64Audio) {
    if (!this.audioContext) return;
    this.setState('speaking');

    try {
      const arrayBuffer = this.base64ToArrayBuffer(base64Audio);
      // Gemini returns 24kHz PCM16 by default.
      const audioData = new Int16Array(arrayBuffer);
      const float32Data = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        float32Data[i] = audioData[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.0;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      const currentTime = this.audioContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }
      
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.audioQueue.push(source);
      
      source.onended = () => {
          this.audioQueue = this.audioQueue.filter(s => s !== source);
          if (this.audioQueue.length === 0) {
              this.setState('listening');
          }
      };

    } catch (e) {
      console.error("Error playing audio chunk", e);
    }
  }

  interrupt() {
    // Stop all currently queued audio to allow barge-in
    this.audioQueue.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    this.audioQueue = [];
    this.nextPlayTime = 0;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send client content to signal interruption
        this.ws.send(JSON.stringify({
            clientContent: {
                turnComplete: true
            }
        }));
    }
    this.setState('listening');
  }

  sendText(text) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
              clientContent: {
                  turns: [{ role: "user", parts: [{ text }] }],
                  turnComplete: true
              }
          }));
      }
  }

  cleanup() {
    this.setState('idle');
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.audioQueue = [];
  }
}

export const geminiLiveApi = new GeminiLiveClient();
