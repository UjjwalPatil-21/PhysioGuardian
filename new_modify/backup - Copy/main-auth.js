// main-auth.js

let auth = null;
let userMenuEl = null;
const authLinksContainer = document.getElementById('auth-links');
const userProfile = document.querySelector('.user-profile');

function ensureUserMenu() {
	if (!userMenuEl) {
		userMenuEl = document.createElement('div');
		userMenuEl.id = 'user-profile-menu';
		userMenuEl.style.position = 'absolute';
		userMenuEl.style.top = '60px';
		userMenuEl.style.right = '20px';
		userMenuEl.style.background = 'var(--card-background)';
		userMenuEl.style.border = '1px solid var(--border-color)';
		userMenuEl.style.borderRadius = '8px';
		userMenuEl.style.boxShadow = '0 8px 30px var(--shadow-color)';
		userMenuEl.style.padding = '0.5rem 0';
		userMenuEl.style.minWidth = '180px';
		userMenuEl.style.display = 'none';
		userMenuEl.style.zIndex = '10000';
		document.body.appendChild(userMenuEl);
		document.addEventListener('click', (e) => {
			if (!userMenuEl || !userProfile) return;
			if (userMenuEl.contains(e.target) || userProfile.contains(e.target)) return;
			userMenuEl.style.display = 'none';
		});
	}
}

function setMenuItems(items) {
	ensureUserMenu();
	userMenuEl.innerHTML = '';
	items.forEach(item => {
		const a = document.createElement('a');
		a.href = item.href || '#';
		a.textContent = item.label;
		a.style.display = 'block';
		a.style.padding = '0.6rem 1rem';
		a.style.color = 'var(--text-color)';
		a.style.textDecoration = 'none';
		a.addEventListener('mouseover', () => { a.style.background = 'var(--input-bg)'; });
		a.addEventListener('mouseout', () => { a.style.background = 'transparent'; });
		if (item.onClick) {
			a.addEventListener('click', (e) => { e.preventDefault(); item.onClick(); });
		}
		userMenuEl.appendChild(a);
	});
}

function toggleMenu() {
	ensureUserMenu();
	userMenuEl.style.display = (userMenuEl.style.display === 'none' || !userMenuEl.style.display) ? 'block' : 'none';
}

function renderLoggedOutHeader() {
	if (!authLinksContainer || !userProfile) return;
	authLinksContainer.innerHTML = '';
	userProfile.style.display = 'none';
	if (userMenuEl) { userMenuEl.style.display = 'none'; }

	const loginIcon = document.createElement('span');
	loginIcon.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
	loginIcon.style.marginRight = '0.5rem';
	loginIcon.style.color = 'var(--text-color)';

	const loginLink = document.createElement('a');
	loginLink.href = 'login.html';
	loginLink.textContent = 'Login';
	loginLink.style.marginRight = '1rem';

	const registerLink = document.createElement('a');
	registerLink.href = 'register.html';
	registerLink.textContent = 'Register';

	const wrapper = document.createElement('div');
	wrapper.style.display = 'flex';
	wrapper.style.alignItems = 'center';
	wrapper.style.gap = '0.5rem';
	wrapper.appendChild(loginIcon);
	wrapper.appendChild(loginLink);
	wrapper.appendChild(registerLink);
	authLinksContainer.appendChild(wrapper);
}

function renderLoggedInHeader(user, signOutFn) {
	if (!authLinksContainer || !userProfile) return;
	authLinksContainer.innerHTML = '';
	userProfile.textContent = (user && user.email ? user.email.charAt(0).toUpperCase() : 'U');
	userProfile.style.display = 'flex';
	userProfile.style.cursor = 'pointer';
	userProfile.title = 'Account';
	userProfile.onclick = toggleMenu;
	setMenuItems([
		{ label: 'Logout', onClick: () => { if (signOutFn) { signOutFn().then(() => { window.location.href = 'login.html'; }).catch((e)=>console.error('Logout Error:', e)); } } }
	]);
}

(async function initAuth() {
	try {
		const firebaseApp = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js');
		const firebaseAuth = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js');

		const { initializeApp } = firebaseApp;
		const { getAuth, onAuthStateChanged, signOut } = firebaseAuth;

		const firebaseConfig = {
			apiKey: "AIzaSyB5TrbBh1Wm7MJwvZtbE6abPsyGv_2N5jU",
			authDomain: "physioguard-d4334.firebaseapp.com",
			projectId: "physioguard-d4334",
			storageBucket: "physioguard-d4334.appspot.com",
			messagingSenderId: "52845535275",
			appId: "1:52845535275:web:6272acc9e6decc877d0a6e",
			measurementId: "G-9E9YQC5MMH"
		};

		const app = initializeApp(firebaseConfig);
		auth = getAuth();

		onAuthStateChanged(auth, (user) => {
			if (user) {
				renderLoggedInHeader(user, () => signOut(auth));
			} else {
				renderLoggedOutHeader();
			}
		});
	} catch (e) {
		// If Firebase fails to load (file://, offline, blocked), show logged-out UI
		console.warn('Auth unavailable, showing Login/Register only.', e);
		renderLoggedOutHeader();
	}
})();