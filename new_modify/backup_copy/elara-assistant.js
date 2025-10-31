// ========================================
// INTELLIGENT ELARA ASSISTANT - FINAL VERSION
// With Visual Glow Effects & Voice Activation
// ========================================

class ElaraAssistant {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.synth = window.speechSynthesis;
        this.voice = null;
        this.currentPage = this.getCurrentPage();
        this.wakeWordRecognition = null;
        this.audioEnabled = false;
        this.speechReady = false;
        // Microphone permission state (persisted)
        this.micPermissionStatus = localStorage.getItem('elara-mic-permission') || 'unknown'; // 'unknown' | 'granted' | 'denied'
        this.hasShownMicDenied = false;
        this.isStartingListening = false;
        this._wakeWordStarted = false;
        this._secureOK = this.isSecureContextAllowed();
        
        this.initializeSpeechRecognition();
        this.loadVoice();
        this.setupEventListeners();
        this.setupWakeWordDetection();
        this.enableAudioOnInteraction();
        this.checkPermissionsStatus();
        if (!this._secureOK) {
            this.addMessageToChat('Voice features need a secure context. Please open via http://localhost or https to use the microphone.', 'bot');
        }
    }

    // ===== ENABLE AUDIO ON FIRST INTERACTION =====
    enableAudioOnInteraction() {
        const enableAudio = () => {
            if (!this.audioEnabled) {
                this.audioEnabled = true;
                const testUtterance = new SpeechSynthesisUtterance('');
                this.synth.speak(testUtterance);
                console.log('✅ Audio enabled');
            }
            // Start wake-word only if previously granted; never trigger permission here
            if (this.micPermissionStatus === 'granted' && this.wakeWordRecognition && !this._wakeWordStarted) {
                try { this.wakeWordRecognition.start(); this._wakeWordStarted = true; } catch(e) {}
            }
        };
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
    }

    async requestMicrophonePermission() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                // Fallback: we'll rely on recognition.start prompting once
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Immediately stop tracks; we only needed permission
            stream.getTracks().forEach(t => t.stop());
            this.micPermissionStatus = 'granted';
            console.log('✅ Microphone permission granted');
        } catch (e) {
            this.micPermissionStatus = 'denied';
            console.warn('🚫 Microphone permission denied');
            if (!this.hasShownMicDenied) {
                this.hasShownMicDenied = true;
                this.addMessageToChat('Microphone permission is blocked. Enable mic access in your browser settings to use voice commands.', 'bot');
            }
        }
    }

    // ===== SPEECH RECOGNITION SETUP =====
    initializeSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('❌ Speech recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            console.log('🎤 Listening started');
            // If we got here, browser allowed use of mic for recognition
            if (this.micPermissionStatus !== 'granted') {
                this.micPermissionStatus = 'granted';
                localStorage.setItem('elara-mic-permission', 'granted');
            }
            this.showListeningGlow();
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            console.log('📝 Heard:', transcript);
            this.processCommand(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('❌ Speech recognition error:', event.error);
            this.hideListeningGlow();
            if (event.error === 'no-speech') {
                this.speak("I didn't hear anything. Try again.");
            }
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                this.micPermissionStatus = 'denied';
                localStorage.setItem('elara-mic-permission', 'denied');
                if (!this.hasShownMicDenied) {
                    this.hasShownMicDenied = true;
                    this.addMessageToChat('Microphone access denied. Enable mic permission in site settings to use voice commands.', 'bot');
                }
            }
        };

        this.recognition.onend = () => {
            console.log('🎤 Listening ended');
            this.isListening = false;
            this.isStartingListening = false;
            this.hideListeningGlow();
            // After first successful start, start wake-word if granted and not started
            if (this.micPermissionStatus === 'granted' && this.wakeWordRecognition && !this._wakeWordStarted) {
                try { this.wakeWordRecognition.start(); this._wakeWordStarted = true; } catch(e) {}
            }
        };
    }

    // ===== VOICE SETUP =====
    loadVoice() {
        const loadVoicesCallback = () => {
            const voices = this.synth.getVoices();
            console.log('🔊 Available voices:', voices.length);
            
            // Prefer female English voices
            this.voice = voices.find(v => 
                v.lang.startsWith('en') && 
                (v.name.includes('Female') || v.name.includes('female'))
            ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
            
            if (this.voice) {
                this.speechReady = true;
                console.log('✅ Using voice:', this.voice.name);
            }
        };

        loadVoicesCallback();
        
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoicesCallback;
        }
    }

    // ===== VISUAL EFFECTS =====
    showListeningGlow() {
        const bubble = document.getElementById('assistant-bubble');
        if (bubble) {
            bubble.classList.add('listening', 'glow-effect');
        }
        
        // Show visual indicator
        let indicator = document.getElementById('elara-listening-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'elara-listening-indicator';
            indicator.className = 'elara-listening-indicator';
            indicator.innerHTML = '<i class="fas fa-microphone"></i> Listening...';
            document.body.appendChild(indicator);
        }
        indicator.classList.add('active');
    }

    hideListeningGlow() {
        const bubble = document.getElementById('assistant-bubble');
        if (bubble) {
            bubble.classList.remove('listening', 'glow-effect');
        }
        
        const indicator = document.getElementById('elara-listening-indicator');
        if (indicator) {
            indicator.classList.remove('active');
        }
    }

    showSpeakingGlow() {
        const bubble = document.getElementById('assistant-bubble');
        if (bubble) {
            bubble.classList.add('speaking', 'pulse-effect');
        }
    }

    hideSpeakingGlow() {
        const bubble = document.getElementById('assistant-bubble');
        if (bubble) {
            bubble.classList.remove('speaking', 'pulse-effect');
        }
    }

    speak(text, callback) {
        if (!this.audioEnabled || !this.speechReady || !text) {
            console.warn('⚠️ Cannot speak:', { audioEnabled: this.audioEnabled, speechReady: this.speechReady });
            this.addMessageToChat(text, 'bot');
            if (callback) callback();
            return;
        }

        this.synth.cancel();
        this.showSpeakingGlow();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.voice;
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 1;
        
        utterance.onend = () => {
            this.hideSpeakingGlow();
            if (callback) callback();
        };

        utterance.onerror = () => {
            this.hideSpeakingGlow();
        };
        
        this.synth.speak(utterance);
        this.addMessageToChat(text, 'bot');
    }

    // ===== COMMAND PROCESSING =====
    processCommand(command) {
        console.log('🎯 Processing command:', command);
        this.addMessageToChat(command, 'user');

        // Navigation commands
        if (this.isNavigationCommand(command)) {
            this.handleNavigation(command);
        }
        // Exercise commands
        else if (this.isExerciseCommand(command)) {
            this.handleExerciseCommand(command);
        }
        // Help/Guide commands
        else if (this.isHelpCommand(command)) {
            this.handleHelpCommand(command);
        }
        // General questions
        else {
            this.handleGeneralQuery(command);
        }
    }

    // ===== NAVIGATION HANDLERS =====
    isNavigationCommand(command) {
        const navigationKeywords = [
            'go to', 'take me to', 'open', 'navigate to', 'show me',
            'redirect to', 'visit', 'load', 'switch to', 'bring me to'
        ];
        const modulePhrases = [
            'clinic locator', 'fee predictor', 'emergency chat', 'about us',
            'exercise', 'exercise routine', 'routine', 'chat', 'home'
        ];
        // If phrase contains a known navigation verb or a known module phrase, treat as navigation
        return navigationKeywords.some(keyword => command.includes(keyword)) ||
               modulePhrases.some(phrase => command.includes(phrase));
    }

    handleNavigation(command) {
        // Normalize known phrases to keys
        const routes = [
            { key: 'home', phrases: ['home'], url: 'home.html', name: 'home page', selector: '#home-section' },
            { key: 'clinic', phrases: ['clinic', 'doctor', 'physiotherapist', 'locator', 'clinic locator'], url: 'clinic-locator.html', name: 'clinic locator', selector: '#clinic-section' },
            { key: 'fee', phrases: ['fee', 'price', 'cost', 'predictor', 'fee predictor'], url: 'fee-predictor.html', name: 'fee predictor', selector: '#fee-section' },
            { key: 'chat', phrases: ['chat', 'emergency', 'help', 'emergency chat'], url: 'chat.html', name: 'emergency chat', selector: '#chat-section' },
            { key: 'routine', phrases: ['routine', 'exercise routine', 'exercise', 'recommendation'], url: 'ai-routine.html', name: 'exercise routine generator', selector: '.generator-container' },
            { key: 'about', phrases: ['about us', 'about'], url: 'home.html#about-us', name: 'about us section', selector: '#about-us' }
        ];

        const lower = command.toLowerCase();
        let targetRoute = null;
        // Prefer the route with the longest matching phrase (best match)
        let bestMatchLength = 0;
        for (const route of routes) {
            for (const phrase of route.phrases) {
                if (lower.includes(phrase) && phrase.length > bestMatchLength) {
                    targetRoute = route;
                    bestMatchLength = phrase.length;
                }
            }
        }

        if (targetRoute) {
            const url = new URL(targetRoute.url, window.location.href);
            if (targetRoute.selector) {
                url.searchParams.set('elaraTarget', targetRoute.selector);
                url.searchParams.set('elaraLabel', targetRoute.name);
            }
            // Navigate immediately; do not block on speech
            try { this.synth.cancel(); } catch(e) {}
            window.location.href = url.toString();
        } else {
            this.speak("I'm not sure where you want to go. Try saying 'go to clinic locator' or 'open fee predictor'.");
        }
    }

    // ===== EXERCISE COMMANDS =====
    isExerciseCommand(command) {
        const exerciseKeywords = [
            'start exercise', 'next exercise', 'skip', 'pause', 
            'resume', 'stop exercise', 'repeat', 'show demo', 'watch demo'
        ];
        return exerciseKeywords.some(keyword => command.includes(keyword));
    }

    handleExerciseCommand(command) {
        if (this.currentPage !== 'exercise' && !command.includes('start')) {
            this.speak("You need to be on the exercise page for this command. Would you like me to take you there?");
            return;
        }

        if (command.includes('next')) {
            this.speak("Moving to the next exercise for you.");
            setTimeout(() => {
                const nextBtn = document.getElementById('next-exercise-btn');
                if (nextBtn) nextBtn.click();
            }, 500);
        } else if (command.includes('demo')) {
            this.speak("Opening the exercise demonstration video.");
            setTimeout(() => {
                const demoBtn = document.getElementById('demo-btn');
                if (demoBtn) demoBtn.click();
            }, 500);
        } else if (command.includes('start')) {
            if (this.currentPage === 'home' || this.currentPage === 'routine') {
                this.speak("Taking you to the exercise routine generator.");
                setTimeout(() => window.location.href = 'ai-routine.html', 1000);
            } else {
                this.speak("Starting the exercise routine.");
            }
        }
    }

    // ===== HELP COMMANDS =====
    isHelpCommand(command) {
        const helpKeywords = [
            'help', 'what can you do', 'how to', 'guide me',
            'explain', 'tell me about', 'what is', 'capabilities'
        ];
        return helpKeywords.some(keyword => command.includes(keyword));
    }

    handleHelpCommand(command) {
        if (command.includes('what can you do') || command.includes('help') || command.includes('capabilities')) {
            this.speak(`I'm Elara, your intelligent assistant. I can navigate you around the website with voice commands like "go to clinic locator" or "open fee predictor". I can also help with exercises by saying "next exercise" or "show demo". For finding doctors or predicting fees, I'll guide you to the right page where you can do it manually. What would you like to do?`);
        } else if (command.includes('find') && (command.includes('doctor') || command.includes('physiotherapist'))) {
            this.speak("To find a physiotherapist, I'll take you to the clinic locator. Once there, you'll need to manually click the 'Find Clinics Near Me' button and use the filters. I can navigate you there now. Just say 'yes' or 'take me there'.");
        } else if (command.includes('predict') && (command.includes('fee') || command.includes('cost'))) {
            this.speak("To predict consultation fees, I'll take you to the fee predictor page. You'll need to manually enter the doctor's experience, rating, and session details. Should I navigate you there? Say 'yes' or 'go to fee predictor'.");
        } else if (command.includes('how to find')) {
            this.speak("You can find doctors using the clinic locator, predict fees with the fee predictor, or get personalized exercise routines. Which would you like to explore?");
        } else {
            this.handleGeneralQuery(command);
        }
    }

    // ===== GENERAL QUERY HANDLER =====
    handleGeneralQuery(command) {
        const responses = {
            'hello': "Hello! I'm Elara. How can I help you today?",
            'hi': "Hi there! What would you like me to help you with?",
            'hey': "Hey! I'm here to help. What do you need?",
            'thank': "You're welcome! Happy to help anytime.",
            'thanks': "You're welcome! Happy to help anytime.",
            'goodbye': "Goodbye! Feel free to call me anytime you need assistance.",
            'bye': "Take care! I'm here whenever you need me.",
            'yes': "Great! I'm ready to help.",
            'okay': "Alright! What would you like to do?"
        };

        for (const [keyword, response] of Object.entries(responses)) {
            if (command.includes(keyword)) {
                this.speak(response);
                return;
            }
        }

        // Default response
        this.speak("I'm not quite sure what you mean. Try asking me to navigate somewhere, like 'go to clinic locator', or ask 'what can you do' to learn about my capabilities.");
    }

    // ===== UTILITY METHODS =====
    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('exercise.html')) return 'exercise';
        if (path.includes('clinic-locator.html')) return 'clinic';
        if (path.includes('fee-predictor.html')) return 'fee';
        if (path.includes('chat.html')) return 'chat';
        if (path.includes('ai-routine.html')) return 'routine';
        return 'home';
    }

    showNavArrow(targetSelector, labelText = "This section") {
        // Remove any existing arrow
        const oldArrow = document.getElementById('elara-nav-arrow');
        if (oldArrow) oldArrow.remove();
        const target = document.querySelector(targetSelector);
        if (!target) return;
        // Get target's position
        const rect = target.getBoundingClientRect();
        // Create arrow element
        const arrow = document.createElement('div');
        arrow.id = 'elara-nav-arrow';
        arrow.className = 'elara-nav-arrow';
        arrow.innerHTML = `
          <div class='arrow-pointer'>➔</div>
          <div class='arrow-label'>${labelText}</div>
        `;
        // Position arrow above/left of section
        arrow.style.top = (window.scrollY + rect.top - 60) + 'px';
        arrow.style.left = (window.scrollX + rect.left + 20) + 'px';
        document.body.appendChild(arrow);
        // Remove after 3 seconds
        setTimeout(() => { if (arrow.parentNode) arrow.classList.add('fade-out'); setTimeout(()=>arrow.remove(), 500); }, 3000);
        // Scroll into view
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    isSecureContextAllowed() {
        if (window.isSecureContext) return true;
        const host = (location.hostname || '').toLowerCase();
        // Allow localhost over http for development
        if (host === 'localhost' || host === '127.0.0.1') return true;
        return false; // file:// or non-secure remote origins not allowed for mic in Chrome
    }

    async checkPermissionsStatus() {
        try {
            if (!navigator.permissions || !navigator.permissions.query) return;
            const status = await navigator.permissions.query({ name: 'microphone' });
            if (status.state === 'granted') {
                this.micPermissionStatus = 'granted';
                localStorage.setItem('elara-mic-permission', 'granted');
                // Safe to start wake word if secure and not started
                if (this._secureOK && this.wakeWordRecognition && !this._wakeWordStarted) {
                    try { this.wakeWordRecognition.start(); this._wakeWordStarted = true; } catch(e) {}
                }
            } else if (status.state === 'denied') {
                this.micPermissionStatus = 'denied';
                localStorage.setItem('elara-mic-permission', 'denied');
            } else {
                this.micPermissionStatus = 'unknown';
            }
            status.onchange = () => {
                // Update if user changes site permission from browser UI
                if (status.state === 'granted') {
                    this.micPermissionStatus = 'granted';
                    localStorage.setItem('elara-mic-permission', 'granted');
                    if (this._secureOK && this.wakeWordRecognition && !this._wakeWordStarted) {
                        try { this.wakeWordRecognition.start(); this._wakeWordStarted = true; } catch(e) {}
                    }
                } else if (status.state === 'denied') {
                    this.micPermissionStatus = 'denied';
                    localStorage.setItem('elara-mic-permission', 'denied');
                } else {
                    this.micPermissionStatus = 'unknown';
                }
            };
        } catch (e) {
            // Permissions API may not be available or blocked; ignore
        }
    }

    // Robustly always enable audio when user tries to speak
    startListening() {
        if (!this.recognition) {
            alert('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }
        if (!this._secureOK) {
            this.addMessageToChat('Microphone requires a secure context. Please open this site via http://localhost or https:// to use voice.', 'bot');
            return;
        }
        if (this.micPermissionStatus === 'denied') {
            if (!this.hasShownMicDenied) {
                this.hasShownMicDenied = true;
                this.addMessageToChat('Microphone permission is blocked. Enable it in your browser to use voice commands.', 'bot');
            }
            return;
        }
        if (this.isListening || this.isStartingListening) {
            return;
        }
        this.isStartingListening = true;
        if (!this.audioEnabled) {
            this.audioEnabled = true;
            const testUtterance = new SpeechSynthesisUtterance('');
            this.synth.speak(testUtterance);
        }
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            this.isStartingListening = false;
            this.isListening = false;
            this.hideListeningGlow();
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            this.hideListeningGlow();
        }
    }

    addMessageToChat(message, type) {
        const chatWindow = document.getElementById('assistant-chat-messages');
        if (!chatWindow) return;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', type === 'user' ? 'user-message' : 'bot-message');
        messageDiv.textContent = message;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Assistant bubble - Click to open chat
        const assistantBubble = document.getElementById('assistant-bubble');
        if (assistantBubble) {
            assistantBubble.addEventListener('click', () => {
                const chatWindow = document.getElementById('assistant-chat-window');
                if (chatWindow) {
                    // Inject contextual welcome when opening
                    this.showContextualWelcome();
                    chatWindow.classList.toggle('active');
                }
            });

            // Double-click for voice command
            assistantBubble.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.startListening();
                const chatWindow = document.getElementById('assistant-chat-window');
                if (chatWindow && !chatWindow.classList.contains('active')) {
                    this.showContextualWelcome();
                    chatWindow.classList.add('active');
                }
            });
        }

        // Voice button in chat
        const voiceBtn = document.getElementById('voice-command-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                if (this.isListening) {
                    this.stopListening();
                } else {
                    this.startListening();
                }
            });
        }

        // Text input send button
        const assistantSendBtn = document.getElementById('assistant-send-btn');
        const assistantInput = document.getElementById('assistant-user-input');
        
        if (assistantSendBtn && assistantInput) {
            const sendMessage = () => {
                const text = assistantInput.value.trim();
                if (text) {
                    this.processCommand(text.toLowerCase());
                    assistantInput.value = '';
                }
            };

            assistantSendBtn.addEventListener('click', sendMessage);
            assistantInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }

        // Close assistant chat
        const closeAssistantChatBtn = document.getElementById('close-assistant-chat');
        if (closeAssistantChatBtn) {
            closeAssistantChatBtn.addEventListener('click', () => {
                const chatWindow = document.getElementById('assistant-chat-window');
                if (chatWindow) {
                    chatWindow.classList.remove('active');
                }
            });
        }
    }

    showContextualWelcome() {
        // Ensure we only add once per page load
        const flagKey = `elara-welcome-${this.currentPage}`;
        if (sessionStorage.getItem(flagKey)) return;
        const chatWindow = document.getElementById('assistant-chat-messages');
        if (!chatWindow) return;
        let message = '';
        if (this.currentPage === 'clinic') {
            message = "👋 Hi! I'm Elara, your intelligent assistant.\n\n• Ask me to filter or guide you in the Clinic Locator.\n• Try: 'Find clinics near me' or 'Filter by rating 4+'.\n• Say 'Hey Elara' for voice, or use the mic below.";
        } else if (this.currentPage === 'fee') {
            message = "👋 Hi! I'm Elara, your intelligent assistant.\n\n• I can guide you through the Fee Predictor.\n• Try: 'Explain required fields' or 'How to estimate fees?'.\n• Say 'Hey Elara' for voice, or use the mic below.";
        } else {
            message = "👋 Hi! I'm Elara, your intelligent assistant.\n\n• I can navigate pages and answer questions.\n• Try: 'Go to clinic locator' or 'Open fee predictor'.";
        }
        // Add styled message similar to emergency chat greeting
        const msg = document.createElement('div');
        msg.classList.add('chat-message', 'bot-message');
        msg.innerHTML = message.replace(/\n/g, '<br>');
        chatWindow.appendChild(msg);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        sessionStorage.setItem(flagKey, '1');
    }

    // ===== WAKE WORD DETECTION =====
    setupWakeWordDetection() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        this.wakeWordRecognition = new SpeechRecognition();
        this.wakeWordRecognition.continuous = true;
        this.wakeWordRecognition.interimResults = true;
        this.wakeWordRecognition.lang = 'en-US';

        this.wakeWordRecognition.onresult = (event) => {
            if (!this._secureOK || this.micPermissionStatus !== 'granted') return;
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript.toLowerCase();
            
            if (transcript.includes('hey elara') || 
                transcript.includes('hi elara') || 
                transcript.includes('hello elara') ||
                transcript.includes('ok elara')) {
                console.log('👋 Wake word detected!');
                try { this.wakeWordRecognition.stop(); } catch(e) {}
                this.showListeningGlow();
                setTimeout(() => {
                    this.startListening();
                }, 200);
            }
        };

        this.wakeWordRecognition.onerror = (e) => {
            console.warn('Wake word error:', e && e.error);
            if (e && (e.error === 'not-allowed' || e.error === 'service-not-allowed')) {
                this.micPermissionStatus = 'denied';
                localStorage.setItem('elara-mic-permission', 'denied');
            }
        };

        this.wakeWordRecognition.onend = () => {
            if (this._secureOK && this.micPermissionStatus === 'granted' && !this.isListening) {
                setTimeout(() => { try { this.wakeWordRecognition.start(); } catch (e) {} }, 1000);
            }
        };
        // Do NOT auto-start here; we start after first successful permission flow
        if (this._secureOK && this.micPermissionStatus === 'granted') {
            try { this.wakeWordRecognition.start(); this._wakeWordStarted = true; } catch(e) {}
        }
    }
}

// ===== INITIALIZE ELARA =====
let elaraInstance = null;

function initializeElara() {
    if (elaraInstance) return;
    
    // Ensure assistant UI exists on the page
    ensureAssistantUI();
    
    // Wait for voices to load
    const initWithVoices = () => {
        elaraInstance = new ElaraAssistant();
        window.elara = elaraInstance;
        console.log('✅ Elara initialized successfully');
        
        // Add voice button to chat
        addVoiceButtonToChat();
        
        // If navigation requested an arrow highlight, show it now
        try {
            const params = new URLSearchParams(window.location.search);
            const sel = params.get('elaraTarget');
            const label = params.get('elaraLabel') || 'This section';
            if (sel) {
                setTimeout(() => {
                    window.elara.showNavArrow(sel, label);
                }, 800);
            }
        } catch(e) {}
    };

    if (window.speechSynthesis.getVoices().length > 0) {
        initWithVoices();
    } else {
        window.speechSynthesis.onvoiceschanged = initWithVoices;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeElara);
} else {
    initializeElara();
}

// ===== HELPER: ADD VOICE BUTTON TO CHAT =====
function addVoiceButtonToChat() {
    const chatInput = document.querySelector('.chat-input');
    if (chatInput && !document.getElementById('voice-command-btn')) {
        const voiceBtn = document.createElement('button');
        voiceBtn.id = 'voice-command-btn';
        voiceBtn.className = 'voice-btn';
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtn.title = 'Voice Command (or double-click Elara)';
        chatInput.appendChild(voiceBtn);
    }
}

// Ensure assistant UI is present on all pages
function ensureAssistantUI() {
    if (document.getElementById('assistant-container')) return;
    const container = document.createElement('div');
    container.id = 'assistant-container';
    container.className = 'assistant-container';
    container.innerHTML = `
        <button id="assistant-bubble" class="assistant-bubble" title="Say 'Hey Elara' or double-click me!" aria-label="Elara AI Assistant">
            <img src="asistant2.png" alt="Elara Assistant" class="assistant-icon">
            <span class="assistant-text">Elara</span>
        </button>
        <div id="assistant-chat-window" class="assistant-chat-window">
            <div class="assistant-chat-header">
                <h3>🤖 Elara - Your AI Guide</h3>
                <button id="close-assistant-chat" class="close-btn" aria-label="Close chat">×</button>
            </div>
            <div id="assistant-chat-messages" class="chat-window">
                <div class="chat-message bot-message">
                    <strong>👋 Hi! I'm Elara, your intelligent assistant!</strong>
                </div>
            </div>
            <div class="chat-input">
                <input type="text" id="assistant-user-input" placeholder="Type a message or click 🎤..." aria-label="Chat with Elara">
                <button id="voice-command-btn" class="voice-btn" title="Voice Command" aria-label="Use voice command">
                    <i class="fas fa-microphone"></i>
                </button>
                <button id="assistant-send-btn" class="send-btn" aria-label="Send message">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(container);
    // After first interaction, ensure wake word starts (autoplay policies)
    const startWakeWordOnInteract = () => {
        if (window.elara && window.elara.wakeWordRecognition) return;
        if (window.elara && typeof window.elara.setupWakeWordDetection === 'function') {
            try { window.elara.setupWakeWordDetection(); } catch(e) {}
        }
        document.removeEventListener('click', startWakeWordOnInteract);
        document.removeEventListener('touchstart', startWakeWordOnInteract);
    };
    document.addEventListener('click', startWakeWordOnInteract, { once: true });
    document.addEventListener('touchstart', startWakeWordOnInteract, { once: true });
}
// In elara-assistant.js, add to constructor:
if (!localStorage.getItem('elara-welcomed')) {
    setTimeout(() => {
        this.speak("Hi! I'm Elara, your new assistant. Say 'Hey Elara' anytime you need help!");
        localStorage.setItem('elara-welcomed', 'true');
    }, 2000);
}
// ===== EXPORT FOR GLOBAL ACCESS =====
window.ElaraAssistant = ElaraAssistant;