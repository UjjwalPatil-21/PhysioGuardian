// Add these two lines at the top of script.js
const API_KEY = "AIzaSyDZnwXiPmitrYaJe7MmNyOTrEVLwZhtQNo"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
document.addEventListener('DOMContentLoaded', () => {
    // Dynamically ensure Elara assistant script is loaded site-wide
    (function ensureElaraScript() {
        if (window.ElaraAssistant || document.querySelector('script[src*="elara-assistant.js"]')) return;
        const s = document.createElement('script');
        s.src = 'elara-assistant.js';
        s.async = true;
        document.body.appendChild(s);
    })();

    // Check if the map container exists before initializing the map
    if (document.getElementById('map')) {
        //const userIcon = L.icon({
          //  iconUrl: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Cpath%20fill%3D%22%23FF0000%22%20d%3D%22M16%200C9.37%200%204%205.37%204%2012c0%208%2012%2020%2012%2020s12-12%2012-20c0-6.63-5.37-12-12-12zm0%2018c-3.31%200-6-2.69-6-6s2.69-6%206-6%206%202.69%206%206-2.69%206-6%206z%22%2F%3E%3C%2Fsvg%3E',
            
           // className: 'user-marker',
           // iconSize: [32, 32],
           // iconAnchor: [16, 32],
           // popupAnchor: [0, -32]

            const userIcon = L.divIcon({
             className: 'user-marker',
                html: '<i class="fas fa-walking"></i>',  // wheelchair icon
                iconSize: [40, 40],
                iconAnchor: [20, 40]


        });

        

        const physioIcon = L.divIcon({
            className: 'physio-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40],
            html: '<i class="fas fa-hospital-alt"></i>'
        });

        const map = L.map('map').setView([19.0760, 72.8777], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const findBtn = document.getElementById('find-btn');
        const physioList = document.getElementById('physio-list');
        const nameFilter = document.getElementById('name-filter');
        const ratingFilter = document.getElementById('rating-filter');
        const specialtyFilter = document.getElementById('specialty-filter');
        const initialMessage = document.getElementById('initial-message');
        let markerStore = {};
        let userLat, userLng;

        renderPhysios();

        function populateSpecialtyFilter() {
            const specialties = new Set();
            physiotherapists.forEach(p => {
                p.specialties.forEach(s => specialties.add(s));
            });
            const sortedSpecialties = [...specialties].sort();
            sortedSpecialties.forEach(s => {
                const option = document.createElement('option');
                option.value = s;
                option.textContent = s;
                specialtyFilter.appendChild(option);
            });
        }
        populateSpecialtyFilter();

        findBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(showPosition, showError);
            } else {
                alert("Geolocation is not supported by this browser.");
                renderPhysios();
            }
        });

        nameFilter.addEventListener('input', renderPhysios);
        ratingFilter.addEventListener('change', renderPhysios);
        specialtyFilter.addEventListener('change', renderPhysios);

        function showPosition(position) {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            map.setView([userLat, userLng], 13);
            
            if (markerStore['user']) {
                map.removeLayer(markerStore['user']);
            }
            
            //const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map)
                //.bindPopup('Your Location')
                //.openPopup();
            //markerStore['user'] = userMarker;



            // Add user marker with walking icon
            const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map)
                .bindPopup('Your Location')
                .openPopup();
            //markerStore['user'] = userMarker;


            physiotherapists.forEach((physio, index) => {
                physio.distance = haversineDistance(userLat, userLng, physio.location.lat, physio.location.lng);
                physio.id = `physio-${index}`;
            });
            renderPhysios();
        }

        function showError(error) {
            let errorMessage = "An unknown error occurred.";
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = "Location access denied. Please enable location services for a better experience.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = "Location information is unavailable. Try again later.";
                    break;
                case error.TIMEOUT:
                    errorMessage = "The request to get user location timed out. Please check your connection.";
                    break;
            }
            alert(errorMessage);
            renderPhysios();
        }

        function renderPhysios() {
            if (initialMessage) {
                initialMessage.style.display = 'none';
            }
            
            const nameFilterValue = nameFilter.value.toLowerCase();
            const ratingFilterValue = parseFloat(ratingFilter.value);
            const specialtyFilterValue = specialtyFilter.value;

            const filteredPhysios = physiotherapists.filter(physio => {
                const nameMatch = physio.name.toLowerCase().includes(nameFilterValue);
                const ratingMatch = physio.rating >= ratingFilterValue;
                const specialtyMatch = specialtyFilterValue === 'all' || physio.specialties.includes(specialtyFilterValue);
                return nameMatch && ratingMatch && specialtyMatch;
            });

            const sortedPhysios = userLat && userLng ? filteredPhysios.sort((a, b) => a.distance - b.distance) : filteredPhysios;

            Object.values(markerStore).forEach(marker => {
                if (marker.options.className !== 'user-marker') {
                    map.removeLayer(marker);
                }
            });
            const existingUserMarker = markerStore['user'];
            const tempMarkerStore = {};
            if (existingUserMarker) {
                tempMarkerStore['user'] = existingUserMarker;
            }
            Object.assign(markerStore, tempMarkerStore);

            physioList.innerHTML = '';

            if (sortedPhysios.length === 0) {
                physioList.innerHTML = '<li class="info-message">No matching physiotherapists found.</li>';
                return;
            }

            sortedPhysios.forEach(physio => {
                const li = document.createElement('li');
                li.id = physio.id;
                const directionsUrl = (userLat && userLng) 
                    ? `https://www.google.com/maps/dir/${userLat},${userLng}/${physio.location.lat},${physio.location.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${physio.location.lat},${physio.location.lng}`;
                
                let distanceMessage = '';
                if (userLat && userLng) {
                    distanceMessage = `<p><i class="fas fa-route"></i> Distance: ${physio.distance.toFixed(2)} km</p>`;
                    if (physio.distance <= 5 && physio.distance > 0) {
                        distanceMessage = `<p class="near-you">🎯 Near you! Distance: ${physio.distance.toFixed(2)} km</p>`;
                    }
                }

                // Remove old radius if it exists
                if (markerStore['userRadius']) {
                        map.removeLayer(markerStore['userRadius']);
                    }


                
                li.innerHTML = `
                    <h3>${physio.name}</h3>
                    ${physio.hospital ? `<div class="hospital-info"><i class="fas fa-hospital"></i> ${physio.hospital}</div>` : ''}
                    <p class="address"><i class="fas fa-map-marker-alt"></i> ${physio.address}</p>
                    <div class="specialties">
                        ${physio.specialties.map(spec => `<span class="specialty-tag">${spec}</span>`).join('')}
                    </div>
                    <p><i class="fas fa-phone"></i> Contact: ${physio.contact}</p>
                    <p><i class="fas fa-star"></i> Rating: ${physio.rating} / 5</p>
                    ${distanceMessage}
                    <div class="links">
                        <a href="${directionsUrl}" target="_blank" class="btn-link"><i class="fas fa-directions"></i> Get Directions</a>
                        <a href="tel:${physio.contact}" class="btn-link call-btn"><i class="fas fa-phone-alt"></i> Call Now</a>
                    </div>
                `;
                physioList.appendChild(li);

                const marker = L.marker([physio.location.lat, physio.location.lng], { icon: physioIcon }).addTo(map)
                    .bindPopup(`<b>${physio.name}</b><br>${physio.address}`);
                markerStore[physio.id] = marker;

                li.addEventListener('mouseenter', () => marker.openPopup());
                li.addEventListener('mouseleave', () => marker.closePopup());

                marker.on('click', () => {
                    document.querySelectorAll('#physio-list li').forEach(item => item.classList.remove('highlight'));
                    li.classList.add('highlight');
                    li.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => li.classList.remove('highlight'), 2000);
                });
            });
        }

        function haversineDistance(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }
    }

    // Assistant & Emergency Chat Logic (Shared across all pages)
    const assistantBubble = document.getElementById('assistant-bubble');
    const assistantChatWindow = document.getElementById('assistant-chat-window');
    const closeAssistantChatBtn = document.getElementById('close-assistant-chat');
    const assistantUserInput = document.getElementById('assistant-user-input');
    const assistantSendBtn = document.getElementById('assistant-send-btn');
    
    // Emergency Chat
    const emergencyChatContainer = document.getElementById('emergency-chat-container');
    const openEmergencyChatBtn = document.getElementById('open-emergency-chat');
    const closeEmergencyChatBtn = document.getElementById('close-emergency-chat');
    const emergencyChatWindow = document.getElementById('emergency-chat-window');
    const emergencyUserInput = document.getElementById('emergency-user-input');
    const emergencySendBtn = document.getElementById('emergency-send-btn');

    // Welcome popup logic
    const welcomePopup = document.getElementById('welcome-popup');
    const closeWelcomeBtn = document.getElementById('close-welcome');

    if (closeWelcomeBtn) {
        closeWelcomeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            welcomePopup.style.display = 'none';
        });
    }

    // Assistant Chat
    if (assistantBubble) {
        assistantBubble.addEventListener('click', () => {
            if (assistantChatWindow) {
                 assistantChatWindow.classList.toggle('active');
            }
        });
    }
    
    if (closeAssistantChatBtn) {
        closeAssistantChatBtn.addEventListener('click', () => {
            assistantChatWindow.classList.remove('active');
        });
    }
    
    if (assistantSendBtn) {
        assistantSendBtn.addEventListener('click', sendAssistantMessage);
        assistantUserInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendAssistantMessage();
            }
        });
    }

    // Emergency Chat
    if (openEmergencyChatBtn) {
        openEmergencyChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(emergencyChatContainer) {
                emergencyChatContainer.classList.add('active');
            } else {
                 window.location.href = 'chat.html';
            }
        });
    }
    
    if (closeEmergencyChatBtn) {
        closeEmergencyChatBtn.addEventListener('click', () => {
            emergencyChatContainer.classList.remove('active');
        });
    }

    if (emergencySendBtn) {
        emergencySendBtn.addEventListener('click', sendEmergencyMessage);
        emergencyUserInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendEmergencyMessage();
            }
        });
    }

    function sendAssistantMessage() {
        const userText = assistantUserInput.value.trim();
        if (userText === '') return;
        appendMessage(document.getElementById('assistant-chat-messages'), userText, 'user-message');
        assistantUserInput.value = '';
        setTimeout(() => {
            const botResponse = getAssistantResponse(userText);
            appendMessage(document.getElementById('assistant-chat-messages'), botResponse, 'bot-message');
        }, 1000);
    }
    
    // Replace the existing sendEmergencyMessage function in script.js

    // Replace the existing sendEmergencyMessage function in script.js

    async function sendEmergencyMessage() {
        // Add these variables here to ensure they are found
        const emergencyChatWindow = document.getElementById('emergency-chat-window');
        const emergencyUserInput = document.getElementById('emergency-user-input');

        // Failsafe check
        if (!emergencyChatWindow || !emergencyUserInput) {
            console.error("Emergency chat elements not found!");
            return;
        }

        const userText = emergencyUserInput.value.trim();
        if (userText === '') return;

        appendMessage(emergencyChatWindow, userText, 'user-message');
        emergencyUserInput.value = '';

        const thinkingMessage = appendMessage(emergencyChatWindow, "Thinking...", 'bot-message');

        // Helpers
        const withTimeout = async (promise, ms = 12000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), ms);
            try {
                const res = await promise(controller.signal);
                return res;
            } finally {
                clearTimeout(id);
            }
        };

        async function fallbackDuckDuckGo(query) {
            try {
                const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&no_redirect=1`; 
                const r = await fetch(ddgUrl, { method: 'GET' });
                if (!r.ok) throw new Error('DDG HTTP ' + r.status);
                const j = await r.json();
                let text = '';
                if (j.AbstractText) {
                    text = j.AbstractText;
                } else if (j.Abstract) {
                    text = j.Abstract;
                } else if (j.Answer) {
                    text = j.Answer;
                } else if (Array.isArray(j.RelatedTopics) && j.RelatedTopics.length) {
                    const first = j.RelatedTopics.find(t => t.Text) || j.RelatedTopics[0];
                    text = (first && first.Text) || '';
                }
                return text;
            } catch (e) {
                return '';
            }
        }

        async function fallbackWikipedia(query) {
            try {
                // 1) Find best matching page title via Wikipedia Search API
                const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
                const sr = await fetch(searchUrl, { method: 'GET' });
                if (!sr.ok) throw new Error('WIKI SEARCH HTTP ' + sr.status);
                const sj = await sr.json();
                const title = (sj && sj.query && sj.query.search && sj.query.search[0] && sj.query.search[0].title) || '';
                if (!title) return '';
                // 2) Fetch concise summary via REST API
                const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
                const r = await fetch(summaryUrl, { method: 'GET' });
                if (!r.ok) throw new Error('WIKI SUMMARY HTTP ' + r.status);
                const j = await r.json();
                let text = j.extract || '';
                if (!text) return '';
                // Sanitize: remove reference markers like [1], [2]
                text = text.replace(/\[[0-9]+\]/g, '');
                // Collapse whitespace
                text = text.replace(/\s+/g, ' ').trim();
                // Limit length
                if (text.length > 900) text = text.slice(0, 900) + '…';
                return text;
            } catch (e) {
                return '';
            }
        }

        try {
            // Conversation setup and memory (limit to last 6 turns)
            window.__emergencyHistory = window.__emergencyHistory || [];

            // Stable system instruction for an emergency assistant
            const SYSTEM_INSTRUCTION = `You are an emergency assistance chatbot. Be concise, accurate, and helpful.
- Clarify the user's intent with 1 short question when necessary.
- If medical/health related, provide general guidance and strong disclaimer: you are not a doctor; suggest consulting a professional for diagnosis.
- Avoid hallucinations; if unsure, say you don't know and offer next steps.
- Prefer bullet points and short paragraphs.
- Keep responses relevant to the user's last question and conversation context.
- Never output code unless explicitly requested.`;

            // Build contents for Gemini: [system/preamble] + history + new user turn
            const history = window.__emergencyHistory.slice(-12).map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            const contents = [
                { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] },
                ...history,
                { role: 'user', parts: [{ text: userText }] }
            ];

            const generationConfig = {
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 512
            };

            const safetySettings = [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ];

            const geminiCall = async (signal) => fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents, generationConfig, safetySettings }),
                signal
            });

            let response;
            try {
                response = await withTimeout(geminiCall, 15000);
            } catch (e) {
                response = null;
            }

            if (!response || !response.ok) {
                const ddg = await fallbackDuckDuckGo(userText);
                if (ddg) {
                    thinkingMessage.innerText = ddg;
                    return;
                }
                const wiki = await fallbackWikipedia(userText);
                thinkingMessage.innerText = wiki || "I couldn't fetch an instant answer. Try rephrasing or ask something else.";
                return;
            }

            const data = await response.json();
            const botResponse = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';

            if (!botResponse) {
                const ddg = await fallbackDuckDuckGo(userText);
                if (ddg) {
                    thinkingMessage.innerText = ddg;
                    return;
                }
                const wiki = await fallbackWikipedia(userText);
                thinkingMessage.innerText = wiki || "I couldn't fetch an instant answer. Try rephrasing or ask something else.";
                return;
            }

            thinkingMessage.innerHTML = botResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            emergencyChatWindow.scrollTop = emergencyChatWindow.scrollHeight;
            // Update memory (append the actual user and model turns)
            window.__emergencyHistory.push({ role: 'user', text: userText });
            window.__emergencyHistory.push({ role: 'model', text: botResponse });
        } catch (error) {
            console.error("API Error:", error);
            const ddg = await fallbackDuckDuckGo(userText);
            if (ddg) {
                thinkingMessage.innerText = ddg;
                return;
            }
            const wiki = await fallbackWikipedia(userText);
            thinkingMessage.innerText = wiki || "Sorry, I'm having trouble connecting right now. Please try again later.";
        }
    }

    function getAssistantResponse(userText) {
        const text = userText.toLowerCase();
        if (text.includes('what is this') || text.includes('what do you do') || text.includes('about')) {
            return "I'm Elara, your guide for PhysioGuardian. This website helps you find nearby physiotherapists and estimate consultation fees. Use the navigation bar to switch between modules.";
        }
        if (text.includes('how to find a doctor') || text.includes('clinic locator')) {
            return "To find a doctor, click on the 'Clinic Locator' link. Then, click 'Find Clinics Near Me' or use the filters to search by name, rating, or specialty.";
        }
        if (text.includes('how to predict fees') || text.includes('fee predictor')) {
            return "You can predict consultation fees by clicking on the 'Fee Predictor' link. Just enter the doctor's experience, rating, and session details to get an estimate.";
        }
        if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
            return "Hello there! I'm here to help you with questions about using the PhysioGuardian website. What's on your mind?";
        }
        return "I'm sorry, I don't have information on that topic. I can only help you with questions about navigating the website. For medical advice, please use the 'Emergency Chat'.";
    }

    function getEmergencyBotResponse(userText) {
        const text = userText.toLowerCase();
        
        // Expanded logic for common conditions
        if (text.includes('shoulder')) {
             return "For shoulder pain, try gentle pendulum exercises and wall slides. **Do not perform any movements that cause sharp pain.** The key is to improve mobility without causing more irritation. **Please see a physiotherapist for a proper diagnosis.**";
        }
        if (text.includes('back pain') || text.includes('back ache') || text.includes('spine pain')) {
            return "For back pain, gentle stretches like the 'Cat-Cow' stretch can provide relief. You can also try lying on your back with your knees bent to relax your lower spine. **If the pain is severe or accompanied by numbness, stop immediately and consult a professional.**";
        }
        if (text.includes('knee')) {
            return "For knee pain, try gentle quadriceps stretches and straight leg raises to strengthen the muscles around the knee. Applying ice can help reduce swelling. **Always stop if you feel a sharp, stabbing pain.**";
        }
        if (text.includes('neck pain') || text.includes('neck stiffness')) {
            return "For neck stiffness, try slow and gentle neck rotations and side bends. Avoid making large, quick movements. Using a warm compress can also help. **If your pain is constant or very severe, a professional consultation is best.**";
        }
        if (text.includes('carpal tunnel')) {
             return "For carpal tunnel, try gentle wrist stretches and exercises to glide the median nerve. Keeping your wrist in a neutral position while working is also important. **A physiotherapist can create a full management plan for you.**";
        }
        if (text.includes('sciatica')) {
            return "For sciatica, a gentle piriformis stretch can be very effective. Try lying on your back and pulling the affected leg towards your chest. **It's vital to have a physiotherapist confirm your diagnosis and guide your treatment.**";
        }
        
        // General advice
        if (text.includes('pain') || text.includes('hurt') || text.includes('ache')) {
            return "I'm sorry to hear you're in pain. Rest, gentle stretching, and applying heat or cold packs can often help. **For a proper diagnosis and treatment plan, you must consult a physiotherapist.**";
        }
        if (text.includes('exercise') || text.includes('stretch') || text.includes('workout')) {
            return "Proper exercises are key for recovery. To strengthen your core, try planks. For flexibility, try hamstring stretches. Always perform exercises with the correct form to prevent injury. **It's essential to get a personalized plan from a professional.**";
        }
        if (text.includes('rehab') || text.includes('recovery')) {
            return "Rehabilitation is a journey. Consistency with your prescribed exercises, proper rest, and nutrition are crucial. If you're recovering from an injury or surgery, follow your doctor's advice carefully. **I can help with general tips, but a professional will guide you best.**";
        }

        // Final fallback response
        return "I'm sorry, I'm not trained to answer that specific question. Please consult a qualified physiotherapist for expert advice and a proper diagnosis. Your health is important!";
    }

    function appendMessage(windowElement, text, className) {
        const msg = document.createElement('div');
        msg.classList.add('chat-message', className);
        msg.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        windowElement.appendChild(msg);
        windowElement.scrollTop = windowElement.scrollHeight;
        return msg;  // ✅ return the new message element
    }

});