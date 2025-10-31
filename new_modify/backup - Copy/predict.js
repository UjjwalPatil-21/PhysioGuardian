document.addEventListener('DOMContentLoaded', () => {
    const predictionForm = document.getElementById('prediction-form');
    const resultDiv = document.getElementById('prediction-result');
    const predictedFeeSpan = document.getElementById('predicted-fee');

    // Regression model coefficients (exported from Python training)
    // Example values - you will replace them with your trained model’s coefficients
    const regressionModel = {
        intercept: 320.45,
        coefficients: {
            experience: 14.8,
            rating: 95.2,
            sessionDuration: 4.9,
            "serviceType_Initial Consultation": 110.3,
            "serviceType_Follow-up Session": -20.5,
            "serviceType_Therapy Session": 145.7,
            "serviceType_Sports Injury Rehab": 205.9,
            "serviceType_Post-surgical Rehab": 260.4
        }
    };

    // Prediction function using linear regression
    function predictFee(experience, rating, serviceType, sessionDuration) {
        let predicted = regressionModel.intercept;

        // Numeric features
        predicted += experience * regressionModel.coefficients.experience;
        predicted += rating * regressionModel.coefficients.rating;
        predicted += sessionDuration * regressionModel.coefficients.sessionDuration;

        // One-hot categorical (serviceType)
        const serviceKey = `serviceType_${serviceType}`;
        if (regressionModel.coefficients[serviceKey]) {
            predicted += regressionModel.coefficients[serviceKey];
        }

        return Math.max(400, predicted); // keep minimum fee at 400
    }

    if (predictionForm) {
        predictionForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const experience = parseFloat(document.getElementById('experience').value);
            const rating = parseFloat(document.getElementById('rating').value);
            const serviceType = document.getElementById('service-type').value;
            const sessionDuration = parseFloat(document.getElementById('session-duration').value);

            if (isNaN(experience) || isNaN(rating)) {
                alert("Please enter valid numerical values.");
                return;
            }

            const predictedFee = predictFee(experience, rating, serviceType, sessionDuration);

            predictedFeeSpan.textContent = `₹${Math.round(predictedFee)}`;
            resultDiv.style.display = 'block';
        });
    }
});
