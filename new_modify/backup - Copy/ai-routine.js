document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const problemDescription = document.getElementById('problem-description');
    const resultsContainer = document.getElementById('results-container');

    const availableRoutines = [
        {
            key: 'back_pain',
            name: 'Lower Back Relief',
            keywords: ['back', 'spine', 'lumbar'],
            img: 'https://placehold.co/400x225/00bcd4/ffffff?text=Back+Pain',
            reason: 'Lower back pain often stems from prolonged sitting, which can lead to weak core muscles and tight hip flexors. The suggested exercises focus on strengthening your core and improving flexibility in your hips and spine.'
        },
        {
            key: 'shoulder_mobility',
            name: 'Shoulder Mobility',
            keywords: ['shoulder', 'rotator cuff', 'arm'],
            img: 'https://placehold.co/400x225/00bcd4/ffffff?text=Shoulder',
            reason: 'Shoulder discomfort is commonly caused by poor posture, like rounded shoulders from desk work or phone use. This routine helps to open up the chest and improve the range of motion in your shoulder joints.'
        },
        {
            key: 'knee_strength',
            name: 'Knee Strength',
            keywords: ['knee', 'leg'],
            img: 'https://placehold.co/400x225/00bcd4/ffffff?text=Knee',
            reason: 'Knee pain can be a result of muscle imbalances or weakness in the muscles that support the knee, such as the quadriceps and glutes. These exercises are designed to build strength around the joint, providing better stability.'
        },
        {
            key: 'posture_correction',
            name: 'Posture Correction',
            keywords: ['posture', 'neck', 'stiff', 'sitting'],
            img: 'https://placehold.co/400x225/00bcd4/ffffff?text=Posture',
            reason: 'Stiffness in the neck and upper back is often a sign of postural strain, sometimes called "tech neck." The following routine focuses on gentle stretches to relieve tension and correct postural habits.'
        }
    ];

    generateBtn.addEventListener('click', () => {
        const userInput = problemDescription.value.toLowerCase();
        if (userInput.trim() === '') {
            resultsContainer.innerHTML = '<h2>Please describe your problem first.</h2>';
            return;
        }

        const suggestions = availableRoutines.filter(routine => 
            routine.keywords.some(keyword => userInput.includes(keyword))
        );

        displaySuggestions(suggestions);
    });

    function displaySuggestions(suggestions) {
        if (suggestions.length === 0) {
            resultsContainer.innerHTML = `
                <h2>Sorry, no specific routine found.</h2>
                <p style="text-align: center;">Try using keywords like "back", "knee pain", "stiff neck", or "shoulder".</p>
            `;
            return;
        }

        // Build the explanation part first
        let explanationHTML = '';
        suggestions.forEach(routine => {
            explanationHTML += `
                <div id="explanation-container">
                    <h3>Possible Cause for ${routine.name}</h3>
                    <p>${routine.reason}</p>
                </div>
            `;
        });
        
        // Build the routine cards part
        let cardsHTML = `
            <h2>Here is your suggested routine:</h2>
            <div class="card-row">
        `;
        suggestions.forEach(routine => {
            cardsHTML += `
                <a href="exercise.html?exercise=${routine.key}" class="card">
                    <img src="${routine.img}" alt="${routine.name}">
                    <h3>${routine.name}</h3>
                </a>
            `;
        });
        cardsHTML += `</div>`;

        // Combine both parts and display
        resultsContainer.innerHTML = explanationHTML + cardsHTML;
    }
});