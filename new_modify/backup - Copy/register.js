// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB5TrbBh1Wm7MJwvZtbE6abPsyGv_2N5jU",
    authDomain: "physioguard-d4334.firebaseapp.com",
    projectId: "physioguard-d4334",
    storageBucket: "physioguard-d4334.firebasestorage.app",
    messagingSenderId: "52845535275",
    appId: "1:52845535275:web:6272acc9e6decc877d0a6e",
    measurementId: "G-9E9YQC5MMH"
};

// Initialize Firebase and services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Get the form element from the HTML
const registerForm = document.getElementById('registerForm');

// Listen for the 'submit' event on the form
registerForm.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the form from reloading the page

    // Get input values inside the event listener
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Use the createUserWithEmailAndPassword function
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed up successfully
            const user = userCredential.user;
            console.log("Account created for:", user.email);
            alert("Account created successfully! Redirecting...");
            
            // Redirect to a home or dashboard page after success
            window.location.href = "login.html";
        })
        .catch((error) => {
            // Handle any errors
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Firebase Error:", errorCode, errorMessage);
            alert(errorMessage); // Show the specific error to the user
        });
});