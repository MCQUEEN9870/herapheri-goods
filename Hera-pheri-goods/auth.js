document.addEventListener('DOMContentLoaded', function () {
    const API_BASE_URL = (window.API_BASE_URL ? `${window.API_BASE_URL}/auth` : "http://localhost:8080/auth");
    console.log("Auth module loaded, API endpoint:", API_BASE_URL);

    const loginForm = document.querySelector('.login-form');
    const signupForm = document.querySelector('.signup-form');
    const showSignupLink = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    
    // Debug elements
    const loginDebugInfo = document.getElementById('loginDebugInfo');
    const signupDebugInfo = document.getElementById('signupDebugInfo');
    
    // Timer variable
    let otpTimer = null;
    let timeRemaining = 0;
    let otpExpired = false;
    let currentContactNumber = '';
    let wrongPasswordCount = 0;

    // 🔹 Switch between login and signup forms
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // 🔹 Login Form Submission (password-first; no login-page OTP UI)
    document.getElementById('loginForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const button = this.querySelector('button');
            const mobileInput = this.querySelector('input[type="tel"]');
        // Use ID so it works even when toggled to type="text"
        const passwordInput = document.getElementById('loginPassword');
        if (!validateMobile(mobileInput.value)) {
            showToast('Please enter a valid 10-digit mobile number', 'error');
            return;
        }
        const pwTrimmed = passwordInput ? passwordInput.value.trim() : '';
        const hasPassword = !!pwTrimmed;
        // Enforce password-first login from this form
        if (!hasPassword) {
            showToast('Please enter your password', 'error');
            return;
        }
        button.disabled = true;
        button.textContent = 'Logging in...';
        try {
            const payload = { contactNumber: mobileInput.value.trim() };
            if (hasPassword) payload.password = pwTrimmed;
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await handleApiResponse(res);
            if (data && data.message && data.message.includes('Login successful')) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userPhone', mobileInput.value.trim());
                showToast('Login successful!', 'success');
                setTimeout(() => {
                    const params = new URLSearchParams(window.location.search);
                    const redir = params.get('redirect');
                    let target = 'index';
                    if (redir === 'register') target = 'register';
                    if (redir === 'driver-dashboard') target = 'driver-dashboard';
                    window.location.href = target;
                }, 800);
                return;
            }
            showToast(data.message || 'Please use password or OTP login', 'error');
        } catch (err) {
            const msg = (err && err.message) ? err.message : 'Login failed';
            // Wrong password handling
            if (msg.toLowerCase().includes('invalid password')) {
                wrongPasswordCount += 1;
                if (wrongPasswordCount >= 3) {
                    alert("You've entered an incorrect password multiple times.\nFor your safety, we've redirected you to the homepage. Please try again later or contact support if you're facing issues.\n\n🔒 Your security is our priority");
                    window.location.href = 'index';
                    return;
                }
            }
            // Captcha error on password-less attempts
            if (msg.toLowerCase().includes('captcha verification failed')) {
                showToast('Please enter password to login, or use Forgot Password (OTP).', 'error');
            } else {
                showToast(msg, 'error');
            }
        } finally {
            button.disabled = false;
            button.textContent = 'Login';
        }
    });

    // 🔹 Signup Form Submission (direct signup, no OTP) with loading guard
    document.getElementById('signupForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const button = this.querySelector('button');
        if (button.disabled) return; // Prevent multiple submissions
        const originalHtml = button.innerHTML;
        const fullName = this.querySelector('input[name="fullName"]').value.trim();
        const contactNumber = this.querySelector('input[type="tel"]').value.trim();
        const emailValue = this.querySelector('input[type="email"]').value.trim();
        const password = document.getElementById('signupPassword') ? document.getElementById('signupPassword').value.trim() : '';
        if (!fullName || fullName.length < 2) { showToast('Please enter a valid name', 'error'); return; }
        if (!validateMobile(contactNumber)) { showToast('Please enter a valid 10-digit mobile number', 'error'); return; }
        if (!password || password.length < 4) { showToast('Please enter a valid password (min 4 chars)', 'error'); return; }
        
        let captchaToken = '';
        let captchaRequired = true;
        
        // Check if we're in development mode (localhost) - disable captcha
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
            captchaRequired = false;
        }
        
        try { 
            if (window.grecaptcha && captchaRequired) {
                captchaToken = grecaptcha.getResponse(window.SIGNUP_RECAPTCHA_ID); 
            }
        } catch(_) {}
        
        if (captchaRequired && !captchaToken) { 
            showToast('Please complete reCAPTCHA', 'error'); 
            return; 
        }
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing up...';
        const payload = { fullName, contactNumber, password };
        if (emailValue) payload.email = emailValue;
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (captchaRequired && captchaToken) {
                headers['X-Captcha-Token'] = captchaToken;
            }
            
            const res = await fetch(`${API_BASE_URL}/signup-direct`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });
            const data = await handleApiResponse(res);
            showToast('Signup successful! Please login.', 'success');
            // Switch to login view
            this.closest('.signup-form').style.display = 'none';
            document.querySelector('.login-form').style.display = 'block';
            // Prefill phone on login
            const loginPhone = document.getElementById('loginContactNumber');
            if (loginPhone) loginPhone.value = contactNumber;
        } catch (err) {
            showToast(err.message || 'Signup failed', 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = originalHtml;
            // Reset captcha for security
            try { if (window.grecaptcha) grecaptcha.reset(window.SIGNUP_RECAPTCHA_ID); } catch(_) {}
        }
    });
    
    function updateDebugInfo(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            console.log("Debug:", message);
        }
    }
    
    async function requestNewOTP(contactNumber, apiUrl, button) {
        try {
            button.disabled = true;
            button.textContent = 'Sending...';
            
            const form = button.closest('form');
            const otpGroup = form.querySelector('.otp-group');
            const otpInput = otpGroup.querySelector('input');
            otpInput.value = '';
            
            const payload = {
                contactNumber: contactNumber
            };
            
            let captchaToken = '';
            try { if (window.grecaptcha) captchaToken = grecaptcha.getResponse(); } catch(_) {}
            let response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Captcha-Token': captchaToken || '' },
                body: JSON.stringify(payload),
            });

            let data = await handleApiResponse(response);
            if (data) {
                showToast('New OTP sent successfully!');
                otpExpired = false;
                startOtpTimer(button, 30);
            }
        } catch (error) {
            button.disabled = false;
            button.textContent = 'Resend OTP';
            showToast(error.message || 'Failed to send new OTP! Try again.', 'error');
        }
    }
    
    function startOtpTimer(button, seconds) {
        if (otpTimer) {
            clearInterval(otpTimer);
        }
        timeRemaining = seconds;
        button.disabled = false;
        otpExpired = false;
        
        let timerDisplay = document.createElement('span');
        timerDisplay.className = 'otp-timer';
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        };
        timerDisplay.textContent = `(${formatTime(timeRemaining)})`;
        timerDisplay.style.marginLeft = '10px';
        timerDisplay.style.fontSize = '14px';
        timerDisplay.style.color = '#666';
        button.textContent = 'Verify OTP';
        if (button.nextElementSibling && button.nextElementSibling.classList.contains('otp-timer')) {
            button.parentNode.removeChild(button.nextElementSibling);
        }
        button.parentNode.insertBefore(timerDisplay, button.nextSibling);
        otpTimer = setInterval(() => {
            timeRemaining--;
            timerDisplay.textContent = `(${formatTime(timeRemaining)})`;
            if (timeRemaining <= 0) {
                clearInterval(otpTimer);
                button.textContent = 'Resend OTP';
                otpExpired = true;
                if (timerDisplay.parentNode) {
                    timerDisplay.parentNode.removeChild(timerDisplay);
                }
                showToast('OTP expired. Please request a new one.', 'error');
            }
        }, 1000);
    }

    async function handleAuthProcess(form, apiUrl, type) {
        const mobileInput = form.querySelector('input[type="tel"]');
        const otpGroup = form.querySelector('.otp-group');
        const otpInput = otpGroup.querySelector('input');
        const button = form.querySelector('button');
        const debugInfo = form.querySelector('.debug-info');
        const allInputFields = form.querySelectorAll('input:not([type="checkbox"])');

        if (otpGroup.style.display === 'none') {
            if (validateMobile(mobileInput.value)) {
                try {
                    currentContactNumber = mobileInput.value.trim();
                    updateDebugInfo(debugInfo, `Processing ${type.toLowerCase()} request for ${currentContactNumber}...`);
                    if (type === 'Signup') {
                        try {
                            updateDebugInfo(debugInfo, `Checking if number ${currentContactNumber} already exists...`);
                            const checkResponse = await fetch(`${API_BASE_URL}/login`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ contactNumber: currentContactNumber }),
                            });
                            if (checkResponse.ok) {
                                const data = await checkResponse.json();
                                if (data.userExists === 'true') {
                                    updateDebugInfo(debugInfo, `Number ${currentContactNumber} is already registered`);
                                    showToast('This number is already registered. Please login instead.', 'error');
                                    return;
                                }
                            }
                        } catch (error) {
                            console.log('User existence check failed, continuing with signup');
                        }
                    }
                    const payload = { contactNumber: currentContactNumber };
                    if (type === 'Signup') {
                        payload.fullName = form.querySelector('input[type="text"]').value.trim();
                        const emailValue = form.querySelector('input[type="email"]').value.trim();
                        if (emailValue) {
                            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!emailPattern.test(emailValue)) {
                                showToast('Please enter a valid email address', 'error');
                                return;
                            }
                            payload.email = emailValue;
                        }
                        const pw = document.getElementById('signupPassword') ? document.getElementById('signupPassword').value.trim() : '';
                        if (!pw || pw.length < 4) { showToast('Please enter a valid password (min 4 chars)', 'error'); return; }
                        payload.password = pw;
                    }
                    button.disabled = true;
                    button.textContent = 'Sending...';
                    let captchaToken = '';
                    try { if (window.grecaptcha) captchaToken = grecaptcha.getResponse(type === 'Signup' ? window.SIGNUP_RECAPTCHA_ID : undefined); } catch(_) {}
                    if (type === 'Signup' && !captchaToken) {
                        showToast(type + ': Please complete reCAPTCHA before requesting OTP', 'error');
                        button.disabled = false;
                        button.textContent = 'Get OTP';
                        return;
                    }
                    let response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(type==='Signup' ? {'X-Captcha-Token': captchaToken} : {}) },
                        body: JSON.stringify(payload),
                    });
                    let data = await handleApiResponse(response);
                    if (data) {
                        form.dataset.userExists = data.userExists || 'false';
                        if (type === 'Login' && data.userExists === 'false') {
                            showToast('User not found. Please sign up first.', 'error');
                            button.disabled = false;
                            button.textContent = 'Get OTP';
                            return;
                        }
                        otpGroup.style.display = 'block';
                        button.textContent = 'Verify OTP';
                        button.disabled = false;
                        showToast('OTP sent successfully!');
                        otpInput.focus();
                        allInputFields.forEach(input => { if (!input.closest('.otp-group')) { input.disabled = true; } });
                        startOtpTimer(button, 30);
                    }
                } catch (error) {
                    updateDebugInfo(debugInfo, `Error: ${error.message || 'Unknown error occurred'}`);
                    button.disabled = false;
                    button.textContent = 'Get OTP';
                    if (error.message && error.message.includes('User not found')) {
                        if (type === 'Login') { showToast('User not found. Please sign up first.', 'error'); }
                        else { showToast('Proceed with signup', 'success'); }
                    } else {
                        showToast(error.message || `Failed to process ${type.toLowerCase()}. Please try again later.`, 'error');
                    }
                }
            } else {
                showToast('Please enter a valid 10-digit mobile number', 'error');
            }
        } else {
            if (otpInput.value.length === 4) {
                try {
                    if (otpExpired) { showToast('This OTP has expired. Please request a new one.', 'error'); return; }
                    button.disabled = true; button.textContent = 'Verifying...';
                    const payload = { contactNumber: mobileInput.value.trim(), otp: otpInput.value.trim(), isSignup: type === 'Signup' && form.dataset.userExists === 'false' };
                    let response = await fetch(`${API_BASE_URL}/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    let data = await handleApiResponse(response);
                    if (data) {
                        if (otpTimer) { clearInterval(otpTimer); otpTimer = null; }
                        showToast(data.message || 'Login successful!');
                        localStorage.setItem('isLoggedIn', 'true');
                        localStorage.setItem('userPhone', mobileInput.value.trim());
                        localStorage.removeItem('userMembership');
                        let redirectPage = 'index';
                        if (type === 'Signup' && form.dataset.userExists === 'false') { redirectPage = 'register'; }
                        setTimeout(() => { 
                            const params = new URLSearchParams(window.location.search);
                            const redir = params.get('redirect');
                            if (redir === 'register') redirectPage = 'register';
                            if (redir === 'driver-dashboard') redirectPage = 'driver-dashboard';
                            window.location.href = redirectPage; 
                        }, 1500);
                    }
                } catch (error) {
                    button.disabled = false; button.textContent = 'Verify OTP';
                    showToast(error.message || 'OTP verification failed! Try again.', 'error');
                }
            } else {
                showToast('Please enter a valid 4-digit OTP', 'error');
            }
        }
    }

    async function handleApiResponse(response) {
        let data;
        try { data = await response.json(); }
        catch (error) {
            try { const text = await response.text(); throw new Error(text || 'Unexpected response from server!'); }
            catch (e) { throw new Error('Unexpected response from server!'); }
        }
        if (!response.ok) {
            if (data && data.message) { throw new Error(data.message); }
            else { throw new Error('Failed to process request. Please try again later.'); }
        }
        return data;
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        toast.style.position = 'fixed'; 
        toast.style.bottom = '20px'; 
        toast.style.left = '50%'; 
        toast.style.transform = 'translateX(-50%)';
        toast.style.padding = '12px 24px'; 
        toast.style.borderRadius = '8px'; 
        toast.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
        toast.style.color = 'white'; 
        toast.style.zIndex = '1000';
        toast.style.fontWeight = '500';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.transition = 'all 0.3s ease';
        
        // Show toast immediately with animation
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        
        // Force reflow and then animate in
        toast.offsetHeight;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        
        // Remove after shorter duration for better UX
        setTimeout(() => { 
            if (document.body.contains(toast)) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }
        }, 2500);
    }

    function validateMobile(number) { number = number.trim(); return /^[6-9]\d{9}$/.test(number); }

    // Name sanitizers
    document.querySelectorAll('input[name="fullName"]').forEach(input => {
        input.addEventListener('keypress', function (e) {
            const char = e.key;
            if (!char.match(/[a-zA-Z\s]/) || (this.value.length === 0 && char === ' ') || (char === ' ' && this.value.slice(-1) === ' ')) { e.preventDefault(); }
        });
        input.addEventListener('blur', function () { this.value = this.value.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').trim(); });
    });

    document.querySelectorAll('input[type="tel"]').forEach(input => {
        input.addEventListener('keypress', function (e) { if (e.key < '0' || e.key > '9' || this.value.length >= 10) { e.preventDefault(); } });
    });

    function checkAuthStatus() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const currentPage = window.location.pathname.split('/').pop();
        if (isLoggedIn && (currentPage === 'login')) { window.location.href = 'index'; }
    }
    checkAuthStatus();

    // Password show/hide text toggles
    document.querySelectorAll('.pw-toggle').forEach(t => {
        t.addEventListener('click', function(){
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;
            const isPw = input.type === 'password';
            input.type = isPw ? 'text' : 'password';
            this.textContent = isPw ? 'Hide' : 'Show';
        });
    });

    // OTP Login modal logic
    const forgotLink = document.getElementById('forgotPasswordLink');
    const otpModal = document.getElementById('otpLoginModal');
    if (forgotLink && otpModal) {
        const modalPhone = document.getElementById('otpLoginPhone');
        const modalOtp = document.getElementById('otpLoginOtp');
        const primaryBtn = document.getElementById('otpLoginPrimaryBtn');
        const closeBtn = document.getElementById('otpLoginClose');
        const otpTimerEl = document.getElementById('otpLoginTimer');
        const otpGroupEl = document.getElementById('otpLoginOtpGroup');
        const newPassBlock = document.getElementById('otpLoginNewPassBlock');
        const newPass = document.getElementById('otpNewPassword');
        const confirmPass = document.getElementById('otpConfirmPassword');
        const setNewPassBtn = document.getElementById('otpSetNewPasswordBtn');
        const loginFormEl = document.getElementById('loginForm');
        const mobileInputEl = loginFormEl.querySelector('input[type="tel"]');
        let wrongOtpCount = 0;
        let timerId = null;
        let timeLeft = 0;
        let isOtpSent = false;

        function openModal() { 
            otpModal.style.display = 'flex'; 
            // Pre-fill phone number from login form
            if (mobileInputEl && mobileInputEl.value) {
                modalPhone.value = mobileInputEl.value;
            }
        }
        
        function closeModal() { 
            otpModal.style.display = 'none'; 
            resetModalState(); 
        }
        
        function resetModalState(){ 
            modalOtp.value=''; 
            primaryBtn.textContent='Get OTP'; 
            primaryBtn.style.display='block';
            primaryBtn.disabled = false;
            newPassBlock.style.display='none'; 
            if(otpGroupEl){ 
                otpGroupEl.style.opacity = '0';
                otpGroupEl.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    if (otpGroupEl) {
                        otpGroupEl.style.display='none'; 
                    }
                }, 300);
            } 
            stopTimer(); 
            otpTimerEl.style.display='none'; 
            isOtpSent = false;
            try{
                grecaptcha.reset(window.OTPLOGIN_RECAPTCHA_ID);
            }catch(_){}
        }
        
        function startTimer(seconds){ 
            stopTimer(); 
            timeLeft = seconds; 
            otpTimerEl.style.display='inline'; 
            otpTimerEl.textContent = formatTime(timeLeft); 
            timerId = setInterval(()=>{ 
                timeLeft--; 
                otpTimerEl.textContent = formatTime(timeLeft); 
                if(timeLeft<=0){ 
                    stopTimer(); 
                    primaryBtn.textContent='Resend OTP'; 
                    isOtpSent = false;
                    showToast('OTP expired. Please request a new one.', 'error');
                } 
            }, 1000); 
        }
        
        function stopTimer(){ 
            if(timerId){ 
                clearInterval(timerId); 
                timerId=null; 
            } 
        }
        
        function formatTime(s){ 
            const m=Math.floor(s/60), ss=s%60; 
            return ` ${m}:${ss<10?'0':''}${ss}`; 
        }

        closeBtn.addEventListener('click', closeModal);
        otpModal.addEventListener('click', (e)=>{ if(e.target===otpModal) closeModal(); });
        
        forgotLink.addEventListener('click', function(e){
            e.preventDefault();
            if (!validateMobile(mobileInputEl.value)) { 
                showToast('Enter valid 10-digit mobile', 'error'); 
                return; 
            }
            modalPhone.value = mobileInputEl.value; 
            wrongOtpCount = 0; 
            openModal();
        });

        async function requestOtp() {
            // Disable button immediately to prevent multiple clicks
            primaryBtn.disabled = true;
            primaryBtn.textContent = 'Sending...';
            
            let captchaToken = '';
            let captchaRequired = true;
            
            // Check if we're in development mode (localhost) - disable captcha
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
                captchaRequired = false;
            }
            
            try { 
                if (window.grecaptcha && captchaRequired) {
                    captchaToken = grecaptcha.getResponse(window.OTPLOGIN_RECAPTCHA_ID); 
                }
            }catch(_) {}
            
            if (captchaRequired && !captchaToken) { 
                showToast('Please complete reCAPTCHA before requesting OTP', 'error'); 
                primaryBtn.disabled = false;
                primaryBtn.textContent = 'Get OTP';
                return false; 
            }
            
            try {
                const base = window.API_BASE_URL ? `${window.API_BASE_URL}/auth/forgot-init` : 'http://localhost:8080/auth/forgot-init';
                const res = await fetch(base, { 
                    method:'POST', 
                    headers:{
                        'Content-Type':'application/json',
                        'X-Captcha-Token':captchaToken
                    }, 
                    body: JSON.stringify({ contactNumber: modalPhone.value.trim() })
                });
                
                const data = await res.json().catch(()=>({}));
                
                if (!res.ok) { 
                    showToast(data.message || 'Failed to send OTP', 'error'); 
                    primaryBtn.disabled = false;
                    primaryBtn.textContent = 'Get OTP';
                    return false; 
                }
                
                // Show success message immediately
                showToast('OTP sent successfully! Please check your phone.', 'success');
                
                // Show OTP field immediately with smooth animation
                if (otpGroupEl) { 
                    otpGroupEl.style.display = 'block';
                    // Force reflow for smooth animation
                    otpGroupEl.offsetHeight;
                    otpGroupEl.style.opacity = '1';
                    otpGroupEl.style.transform = 'translateY(0)';
                }
                
                // Change button to Verify OTP
                primaryBtn.textContent = 'Verify OTP';
                primaryBtn.disabled = false;
                
                // Focus on OTP input
                modalOtp.focus();
                
                // Start 1 minute timer
                startTimer(60);
                
                isOtpSent = true;
                return true;
                
            } catch (error) {
                showToast('Failed to send OTP. Please try again.', 'error');
                primaryBtn.disabled = false;
                primaryBtn.textContent = 'Get OTP';
                return false;
            }
        }

        async function verifyOtp() {
            const otp = modalOtp.value.trim();
            if (otp.length !== 4) { 
                showToast('Please enter 4-digit OTP', 'error'); 
                return; 
            }
            
            // Disable button during verification
            primaryBtn.disabled = true;
            primaryBtn.textContent = 'Verifying...';
            
            try {
                const baseV = window.API_BASE_URL ? `${window.API_BASE_URL}/auth/forgot-verify` : 'http://localhost:8080/auth/forgot-verify';
                const resV = await fetch(baseV, { 
                    method:'POST', 
                    headers:{
                        'Content-Type':'application/json'
                    }, 
                    body: JSON.stringify({ 
                        contactNumber: modalPhone.value.trim(), 
                        otp 
                    })
                });
                
                const dV = await resV.json().catch(()=>({}));
                
                if (!resV.ok) {
                    wrongOtpCount++;
                    showToast(dV.message || 'Invalid OTP. Please try again.', 'error');
                    
                    // On wrong OTP: change to Resend, reset captcha, allow resend
                    primaryBtn.textContent = 'Resend OTP';
                    primaryBtn.disabled = false;
                    primaryBtn.style.display = 'block';
                    
                    try { 
                        if (window.grecaptcha) grecaptcha.reset(window.OTPLOGIN_RECAPTCHA_ID); 
                    }catch(_){ }
                    
                    stopTimer();
                    isOtpSent = false;
                    
                    if (wrongOtpCount >= 3) {
                        alert("You've entered an incorrect OTP multiple times.\nFor your safety, we've redirected you to the homepage. Please try again later or contact support if you're facing issues.\n\n🔒 Your security is our priority");
                        window.location.href = 'index';
                    }
                    return;
                }
                
                // OTP verified successfully -> show new password form
                stopTimer();
                primaryBtn.style.display = 'none';
                newPassBlock.style.display = 'block';
                showToast('OTP verified successfully! Please set your new password.', 'success');
                
            } catch (error) {
                showToast('Verification failed. Please try again.', 'error');
                primaryBtn.disabled = false;
                primaryBtn.textContent = 'Verify OTP';
            }
        }

        async function setNewPassword() {
            const otp = modalOtp.value.trim();
            if (!otp || otp.length !== 4) { 
                showToast('OTP missing/invalid', 'error'); 
                return; 
            }
            
            if (newPass.value.length < 4) {
                showToast('Password must be at least 4 characters', 'error');
                return;
            }
            
            if (newPass.value !== confirmPass.value) { 
                showToast('Passwords do not match', 'error'); 
                return; 
            }
            
            // Disable button during password reset
            setNewPassBtn.disabled = true;
            setNewPassBtn.textContent = 'Setting Password...';
            
            try {
                const base2 = window.API_BASE_URL ? `${window.API_BASE_URL}/auth/forgot-complete` : 'http://localhost:8080/auth/forgot-complete';
                const res2 = await fetch(base2, { 
                    method:'POST', 
                    headers:{
                        'Content-Type':'application/json'
                    }, 
                    body: JSON.stringify({ 
                        contactNumber: modalPhone.value.trim(), 
                        otp, 
                        newPassword: newPass.value 
                    })
                });
                
                const d2 = await res2.json().catch(()=>({}));
                
                if (!res2.ok) { 
                    showToast(d2.message || 'Password reset failed', 'error'); 
                    setNewPassBtn.disabled = false;
                    setNewPassBtn.textContent = 'Set Password';
                    return; 
                }
                
                showToast('Password reset successful! Please login with your new password.', 'success');
                
                // Redirect to login by closing modal
                setTimeout(()=> { 
                    closeModal(); 
                }, 1000);
                
            } catch (error) {
                showToast('Password reset failed. Please try again.', 'error');
                setNewPassBtn.disabled = false;
                setNewPassBtn.textContent = 'Set Password';
            }
        }

        primaryBtn.addEventListener('click', async function(){
            const label = primaryBtn.textContent.trim();
            if (label === 'Get OTP' || label === 'Resend OTP') { 
                await requestOtp(); 
            }
            else if (label === 'Verify OTP') { 
                await verifyOtp(); 
            }
        });
        
        setNewPassBtn.addEventListener('click', setNewPassword);
    }
});
