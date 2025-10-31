// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB5TrbBh1Wm7MJwvZtbE6abPsyGv_2N5jU",
    authDomain: "physioguard-d4334.firebaseapp.com",
    projectId: "physioguard-d4334",
    storageBucket: "physioguard-d4334.appspot.com", // Corrected storageBucket URL
    messagingSenderId: "52845535275",
    appId: "1:52845535275:web:6272acc9e6decc877d0a6e",
    measurementId: "G-9E9YQC5MMH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();

// Get the submit button element
const submit = document.getElementById('submit');

// Listen for the click event on the submit button
submit.addEventListener("click", function (event) {
    event.preventDefault(); // Prevents the form from reloading the page

    // Get the values from the input fields *inside* the event listener
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Basic validation
    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in successfully
            const user = userCredential.user;
            alert("Signing in account...");
            window.location.href = "index.html"; // Redirect to home page
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Firebase Error:", errorCode, errorMessage); // Log detailed error to console
            
            // Provide a user-friendly error message
            if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
                alert("Invalid email or password. Please try again.");
            } else {
                alert(errorMessage);
            }
        });
});