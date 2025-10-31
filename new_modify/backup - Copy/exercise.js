document.addEventListener('DOMContentLoaded', () => {
    // ===== DOM ELEMENTS =====
    const videoElement = document.getElementById('webcam');
    const canvasElement = document.getElementById('output_canvas');
    const canvasCtx = canvasElement.getContext('2d');
    const routineTitleEl = document.getElementById('routine-title');
    const exerciseTitleEl = document.getElementById('exercise-title');
    const repCounterEl = document.getElementById('rep-counter');
    const stageEl = document.getElementById('stage');
    const feedbackEl = document.getElementById('feedback');
    const instructionsEl = document.getElementById('instructions');
    const nextExerciseBtn = document.getElementById('next-exercise-btn');
    const loadingMessageEl = document.getElementById('loading-message');
    const audioToggle = document.getElementById('audio-toggle');
    const speechRateInput = document.getElementById('speech-rate');
    const rateValueSpan = document.getElementById('rate-value');

    // ===== TEXT-TO-SPEECH SETUP =====
    let speechEnabled = true;
    let speechRate = 1.0;
    let lastSpokenText = '';
    let isSpeaking = false;

    // Initialize speech synthesis
    const synth = window.speechSynthesis;
    let voice = null;

    // Load available voices
    function loadVoices() {
        const voices = synth.getVoices();
        // Prefer English voices
        voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    }

    // Load voices on page load and when they change
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }

    // Speech function with debouncing
    function speak(text, priority = 'normal') {
        if (!speechEnabled || !text) return;
        
        // Don't repeat the same text immediately
        if (text === lastSpokenText && isSpeaking) return;
        
        // Cancel previous speech for high-priority messages
        if (priority === 'high') {
            synth.cancel();
        }
        
        // Don't queue up too many messages
        if (synth.speaking && priority === 'normal') return;
        
        // Always try to reload and pick Elara's female/doctor voice
        let utterVoice = null;
        if (window.elara && window.elara.voice) {
            utterVoice = window.elara.voice;
        } else {
            // Try to reload voices and pick best female English
            const voices = synth.getVoices();
            utterVoice = voices.find(v => v.lang.startsWith('en') && ["female","Female","Doctor","doctor","en-US","en-GB"].some(term=>v.name.includes(term))) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = utterVoice;
        utterance.rate = utterVoice && utterVoice.name && utterVoice.name.toLowerCase().includes('female') ? 0.93 : speechRate;
        utterance.pitch = utterVoice && utterVoice.name && utterVoice.name.toLowerCase().includes('female') ? 1.1 : 1;
        utterance.volume = 1;
        
        utterance.onstart = () => {
            isSpeaking = true;
            lastSpokenText = text;
        };
        
        utterance.onend = () => {
            isSpeaking = false;
        };
        
        synth.speak(utterance);
    }

    // Audio controls event listeners
    if (audioToggle) {
        audioToggle.addEventListener('change', (e) => {
            speechEnabled = e.target.checked;
            if (!speechEnabled) {
                synth.cancel();
            }
        });
    }

    if (speechRateInput) {
        speechRateInput.addEventListener('input', (e) => {
            speechRate = parseFloat(e.target.value);
            rateValueSpan.textContent = speechRate.toFixed(1) + 'x';
        });
    }

    // ===== STATE MANAGEMENT =====
    let repCounter = 0;
    let stage = null;
    let feedback = 'Position yourself in front of the camera.';
    let currentExerciseIndex = 0;
    let currentRoutine = null;
    let setComplete = false;
    let exerciseState = {};
    let userLocked = false;
    let targetUserPosition = null;
    const LOCK_THRESHOLD = 0.25;
    
    // For rep counting reliability
    let framesSinceLastRep = 0;
    const MIN_FRAMES_BETWEEN_REPS = 15; // Prevents double-counting

    // ===== UTILITY FUNCTIONS =====
    function calculateAngle(a, b, c) {
        if (!a || !b || !c || a.visibility < 0.6 || b.visibility < 0.6 || c.visibility < 0.6) {
            return null;
        }
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) { angle = 360 - angle; }
        return angle;
    }

    function incrementRep() {
        // Always increment frames for reliability (called per pose detection frame)
        framesSinceLastRep++;
        if (framesSinceLastRep >= MIN_FRAMES_BETWEEN_REPS) {
            repCounter++;
            framesSinceLastRep = 0;
            repCounterEl.innerText = `${repCounter} / ${(currentRoutine && currentRoutine.exercises[currentExerciseIndex].targetReps) || ''}`;
            speak(`${repCounter}`, 'normal');
            return true;
        }
        return false;
    }

    // ===== EXERCISE DEFINITIONS =====
    const exercises = {
        bodyweight_squats: {
            name: 'Bodyweight Squats',
            targetReps: 15,
            instructions: [
                "Stand with feet shoulder-width apart.",
                "Keep your chest up and back straight.",
                "Lower your hips as if sitting in a chair.",
                "Push through your heels to return to the start."
            ],
            logic: (landmarks) => {
                const hip = landmarks[23];
                const knee = landmarks[25];
                const ankle = landmarks[27];
                const kneeAngle = calculateAngle(hip, knee, ankle);
                
                if (kneeAngle === null) {
                    feedback = "Ensure your whole body is visible.";
                    return;
                }

                // DOWN phase - only once per full cycle
                if (kneeAngle < 90 && stage !== 'down') {
                    stage = 'down';
                    feedback = "Great depth! Push up.";
                    speak("Good depth, now push up", 'normal');
                    console.log('DEBUG: Stage changed to down (squat)');
                }
                
                // UP phase (rep only if just completed full down-up)
                if (kneeAngle > 160 && stage === 'down') {
                    if (incrementRep()) {
                        stage = 'up';
                        feedback = "Excellent rep! Go again.";
                        speak("Excellent, go again", 'normal');
                        console.log('DEBUG: Stage changed to up (squat) and rep counted.');
                    }
                }
            }
        },
        
        glute_bridge: {
            name: 'Glute Bridge',
            targetReps: 12,
            instructions: [
                "Lie on your back with knees bent and feet flat on the floor.",
                "Lift your hips until your knees, hips, and shoulders form a straight line.",
                "Squeeze your glutes at the top.",
                "Lower down slowly."
            ],
            logic: (landmarks) => {
                const shoulder = landmarks[11];
                const hip = landmarks[23];
                const knee = landmarks[25];
                const hipAngle = calculateAngle(shoulder, hip, knee);
                
                if (hipAngle === null) {
                    feedback = "Lie on your side facing the camera.";
                    return;
                }
                
                if (hipAngle > 150 && stage !== 'up') {
                    stage = "up";
                    feedback = "Great! Squeeze glutes and lower slowly.";
                    speak("Squeeze your glutes", 'normal');
                }
                
                if (stage === 'up' && hipAngle < 120) {
                    if (incrementRep()) {
                        stage = "down";
                        feedback = "Good rep! Lift your hips again.";
                    }
                }
            }
        },

        cat_cow: {
            name: 'Cat-Cow Stretch',
            targetReps: 10,
            instructions: [
                "Start on your hands and knees.",
                "For 'Cow', inhale as you drop your belly and look up.",
                "For 'Cat', exhale as you round your spine.",
                "One cycle of Cow then Cat is one rep."
            ],
            logic: (landmarks) => {
                const shoulder = landmarks[11];
                const hip = landmarks[23];
                const knee = landmarks[25];
                const backAngle = calculateAngle(shoulder, hip, knee);
                
                if (backAngle === null) {
                    feedback = "Position yourself on all fours, side-on.";
                    return;
                }
                
                if (backAngle < 95 && stage !== 'cow') {
                    stage = "cow";
                    feedback = "Good arch! Now round your spine for Cat.";
                    speak("Good cow pose, now round your back", 'normal');
                }
                
                if (stage === 'cow' && backAngle > 115) {
                    if (incrementRep()) {
                        stage = "cat";
                        feedback = "Nice! Return to Cow pose.";
                        speak("Perfect, return to cow", 'normal');
                    }
                }
            }
        },

        lateral_raises: {
            name: 'Lateral Arm Raises',
            targetReps: 12,
            instructions: [
                "Stand tall with arms by your sides.",
                "Raise your arms out to the sides until they are at shoulder level.",
                "Keep your core engaged and avoid shrugging.",
                "Lower your arms back down slowly."
            ],
            logic: (landmarks) => {
                const hip = landmarks[23];
                const shoulder = landmarks[11];
                const elbow = landmarks[13];
                const shoulderAngle = calculateAngle(hip, shoulder, elbow);
                
                if (shoulderAngle === null) return;
                
                if (shoulderAngle > 80 && stage !== 'up') {
                    stage = "up";
                    feedback = shoulderAngle > 110 ? "Don't raise too high." : "Perfect! Lower with control.";
                    if (shoulderAngle > 110) {
                        speak("Too high, lower a bit", 'high');
                    } else {
                        speak("Good height, now lower slowly", 'normal');
                    }
                }
                
                if (stage === 'up' && shoulderAngle < 30) {
                    if (incrementRep()) {
                        stage = "down";
                        feedback = "Great. Raise again.";
                    }
                }
            }
        },

        shoulder_shrugs: {
            name: 'Shoulder Shrugs',
            targetReps: 15,
            instructions: [
                "Stand straight with arms at your sides.",
                "Inhale and lift your shoulders up towards your ears.",
                "Hold for a moment at the top.",
                "Exhale and lower your shoulders back down."
            ],
            logic: (landmarks) => {
                const shoulder = landmarks[11];
                const ear = landmarks[7];
                
                if (shoulder.visibility < 0.6 || ear.visibility < 0.6) return;
                
                const shoulderEarDist = Math.abs(shoulder.y - ear.y);
                
                if (shoulderEarDist < 0.1 && stage !== 'up') {
                    stage = "up";
                    feedback = "Hold it... now relax down.";
                    speak("Hold, now relax", 'normal');
                }
                
                if (stage === 'up' && shoulderEarDist > 0.15) {
                    if (incrementRep()) {
                        stage = "down";
                        feedback = "Good. Shrug up again.";
                    }
                }
            }
        },

        lunges: {
            name: 'Alternating Lunges',
            targetReps: 10,
            instructions: [
                "This routine tracks your LEFT leg.",
                "Step forward with your LEFT foot.",
                "Lower hips until both knees are bent at a 90-degree angle.",
                "Push off your front foot to return to the start."
            ],
            logic: (landmarks) => {
                const hip = landmarks[23];
                const knee = landmarks[25];
                const ankle = landmarks[27];
                const frontKneeAngle = calculateAngle(hip, knee, ankle);
                
                if (frontKneeAngle === null) {
                    feedback = "Ensure your whole body is visible.";
                    return;
                }
                
                if (frontKneeAngle > 160) {
                    if (stage === 'down') {
                        if (incrementRep()) {
                            feedback = "Good! Lunge again with the same leg.";
                        }
                    }
                    stage = 'up';
                }
                
                if (stage === 'up' && frontKneeAngle < 100) {
                    feedback = "Great form! Push back up.";
                    speak("Good depth, push back", 'normal');
                    stage = 'down';
                }
            }
        },

        neck_tilts: {
            name: 'Neck Tilts',
            targetReps: 10,
            instructions: [
                "Sit or stand tall, looking straight ahead.",
                "Slowly tilt head to one side.",
                "Then, smoothly tilt your head to the other side.",
                "A full tilt to both sides completes one rep."
            ],
            logic: (landmarks) => {
                const leftEar = landmarks[7];
                const rightEar = landmarks[8];
                
                if (leftEar.visibility < 0.6 || rightEar.visibility < 0.6) {
                    feedback = "Face the camera directly.";
                    return;
                }
                
                if (leftEar.y < rightEar.y - 0.02) {
                    if (stage !== 'right') {
                        if (exerciseState.last_direction === 'left') {
                            if (incrementRep()) {
                                feedback = `Rep ${repCounter} complete!`;
                            }
                        } else {
                            feedback = "Now tilt to the other side.";
                            speak("Tilt to the other side", 'normal');
                        }
                        exerciseState.last_direction = 'right';
                    }
                    stage = 'right';
                } else if (rightEar.y < leftEar.y - 0.02) {
                    if (stage !== 'left') {
                        if (exerciseState.last_direction === 'right') {
                            if (incrementRep()) {
                                feedback = `Rep ${repCounter} complete!`;
                            }
                        } else {
                            feedback = "Now tilt to the other side.";
                            speak("Tilt to the other side", 'normal');
                        }
                        exerciseState.last_direction = 'left';
                    }
                    stage = 'left';
                } else {
                    stage = 'center';
                }
            }
        },

        neck_rotations: {
            name: 'Neck Rotations',
            targetReps: 10,
            instructions: [
                "Sit or stand tall, keeping your chin level.",
                "Slowly turn your head to one side.",
                "Then, smoothly turn to the other side.",
                "A full rotation to both sides completes one rep."
            ],
            logic: (landmarks) => {
                const nose = landmarks[0];
                const leftShoulder = landmarks[11];
                const rightShoulder = landmarks[12];
                
                if (nose.visibility < 0.8 || leftShoulder.visibility < 0.6) {
                    feedback = "Face the camera directly.";
                    return;
                }
                
                const shoulderMidpointX = (leftShoulder.x + rightShoulder.x) / 2;
                const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
                const noseDisplacement = (nose.x - shoulderMidpointX) / shoulderWidth;

                if (noseDisplacement > 0.15) {
                    if (stage !== 'left') {
                        if (exerciseState.last_direction === 'right') {
                            if (incrementRep()) {
                                feedback = `Rep ${repCounter} complete!`;
                            }
                        } else {
                            feedback = "Now turn to the other side.";
                            speak("Turn to the other side", 'normal');
                        }
                        exerciseState.last_direction = 'left';
                    }
                    stage = 'left';
                } else if (noseDisplacement < -0.15) {
                    if (stage !== 'right') {
                        if (exerciseState.last_direction === 'left') {
                            if (incrementRep()) {
                                feedback = `Rep ${repCounter} complete!`;
                            }
                        } else {
                            feedback = "Now turn to the other side.";
                            speak("Turn to the other side", 'normal');
                        }
                        exerciseState.last_direction = 'right';
                    }
                    stage = 'right';
                } else {
                    stage = 'center';
                }
            }
        }
    };

    // ===== ROUTINE DEFINITIONS =====
    const routines = {
        back_pain: { name: 'Lower Back Relief', exercises: [exercises.glute_bridge, exercises.cat_cow] },
        shoulder_mobility: { name: 'Shoulder Mobility', exercises: [exercises.lateral_raises, exercises.shoulder_shrugs] },
        knee_strength: { name: 'Knee Strength', exercises: [exercises.bodyweight_squats, exercises.lunges, exercises.glute_bridge] },
        posture_correction: { name: 'Posture Correction', exercises: [exercises.neck_tilts, exercises.neck_rotations] }
    };

    // ===== EXERCISE LOADING =====
    function loadExercise(exercise) {
        repCounter = 0;
        setComplete = false;
        feedback = `Get ready for ${exercise.name}.`;
        exerciseState = { last_direction: null };
        userLocked = false;
        targetUserPosition = null;
        framesSinceLastRep = 0;
        
        // Initial stage setup
        if (['bodyweight_squats', 'lateral_raises', 'shoulder_shrugs', 'lunges'].includes(
            exercise.name.toLowerCase().replace(/\s/g, '_')
        )) {
            stage = 'up';
        } else {
            stage = 'center';
        }
        
        exerciseTitleEl.innerText = exercise.name;
        repCounterEl.innerText = `${repCounter} / ${exercise.targetReps}`;
        instructionsEl.innerHTML = exercise.instructions.map(inst => `<li>${inst}</li>`).join('');
        
        // Speak exercise name and first instruction
        speak(`Starting ${exercise.name}`, 'high');
        setTimeout(() => {
            speak(exercise.instructions[0], 'normal');
        }, 2000);
    }

    // ===== POSE DETECTION =====
    function onResults(results) {
        framesSinceLastRep++;
        
        if (!results.poseLandmarks) {
            if (userLocked) {
                feedbackEl.innerText = "Tracking lost. Please reposition.";
                speak("I can't see you, please reposition", 'high');
            }
            return;
        }
        
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        loadingMessageEl.style.display = 'none';
        
        const landmarks = results.poseLandmarks;
        const currentPoseCenter = {
            x: (landmarks[11].x + landmarks[12].x) / 2,
            y: (landmarks[11].y + landmarks[12].y) / 2
        };
        
        if (!userLocked) {
            targetUserPosition = currentPoseCenter;
            userLocked = true;
            feedbackEl.innerText = "User detected. Begin exercise.";
            speak("I can see you, let's begin", 'normal');
        }
        
        const distance = Math.sqrt(
            Math.pow(currentPoseCenter.x - targetUserPosition.x, 2) +
            Math.pow(currentPoseCenter.y - targetUserPosition.y, 2)
        );
        
        if (distance < LOCK_THRESHOLD) {
            drawConnectors(canvasCtx, landmarks, POSE_CONNECTIONS, {
                color: '#00bcd4',
                lineWidth: 4
            });
            drawLandmarks(canvasCtx, landmarks, {
                color: '#ffffff',
                lineWidth: 2
            });
            
            try {
                const currentExercise = currentRoutine.exercises[currentExerciseIndex];
                if (!setComplete) {
                    currentExercise.logic(landmarks);
                }
                
                repCounterEl.innerText = `${repCounter} / ${currentExercise.targetReps}`;
                stageEl.innerText = stage || '-';
                feedbackEl.innerText = feedback;
                
                if (repCounter >= currentExercise.targetReps && !setComplete) {
                    feedbackEl.innerText = "Set Complete! Well done.";
                    speak("Set complete! Well done!", 'high');
                    setComplete = true;
                }
            } catch (error) {
                feedbackEl.innerText = "Could not detect pose. Please reposition.";
            }
        } else {
            feedbackEl.innerText = "Multiple people detected. Please ensure only you are in frame.";
            speak("Multiple people detected", 'high');
        }
        
        canvasCtx.restore();
    }

    // ===== INITIALIZATION =====
    const urlParams = new URLSearchParams(window.location.search);
    const routineKey = urlParams.get('exercise') || 'back_pain';
    currentRoutine = routines[routineKey];

    if (currentRoutine) {
        routineTitleEl.innerText = currentRoutine.name;
        loadExercise(currentRoutine.exercises[currentExerciseIndex]);
    } else {
        routineTitleEl.innerText = "Routine Not Found";
        feedbackEl.innerText = "The selected exercise routine could not be found.";
    }

    // ===== MEDIAPIPE SETUP =====
    const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    pose.onResults(onResults);
    
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await pose.send({ image: videoElement });
        },
        width: 640,
        height: 480
    });
    camera.start();

    // ===== NEXT EXERCISE BUTTON =====
    nextExerciseBtn.addEventListener('click', () => {
        synth.cancel(); // Stop any ongoing speech
        currentExerciseIndex++;
        
        if (currentExerciseIndex < currentRoutine.exercises.length) {
            loadExercise(currentRoutine.exercises[currentExerciseIndex]);
        } else {
            routineTitleEl.innerText = "Routine Complete!";
            exerciseTitleEl.innerText = "You did a great job! 🎉";
            feedbackEl.innerText = "Return to the home page to explore more programs.";
            speak("Routine complete! Great work!", 'high');
            nextExerciseBtn.innerText = "Finish";
            nextExerciseBtn.onclick = () => {
                window.location.href = 'index.html';
            };
        }
    });
});