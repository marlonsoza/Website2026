// State Management
const state = {
    currentUser: null,
    userRole: null,
    requests: [],
    appointments: [],
    settings: {
        ownerEmail: '',
        reminderTime: 24,
        businessName: 'GreenThumb Pro'
    },
    currentMonth: new Date(),
    miniMonth: new Date(),
    selectedDates: [],
    uploadedPhotos: [],
    currentNegotiation: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    setupEventListeners();
    checkReminders();
});

function loadFromStorage() {
    const saved = localStorage.getItem('gardeningAppData');
    if (saved) {
        const data = JSON.parse(saved);
        state.requests = data.requests || [];
        state.appointments = data.appointments || [];
        state.settings = data.settings || state.settings;
    }
}

function saveToStorage() {
    localStorage.setItem('gardeningAppData', JSON.stringify({
        requests: state.requests,
        appointments: state.appointments,
        settings: state.settings
    }));
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.currentTarget.dataset.tab;
            switchTab(tabName);
        });
    });

    // Service request form
    const form = document.getElementById('service-request-form');
    if (form) {
        form.addEventListener('submit', handleServiceRequest);
    }
}

// Authentication
function loginAs(role) {
    state.userRole = role;
    state.currentUser = { name: 'Business Owner', email: state.settings.ownerEmail };
    showScreen('owner-dashboard');
    renderCalendar();
    updateBadges();
}

function showClientLogin() {
    document.querySelector('.role-selection').classList.add('hidden');
    document.getElementById('client-login').classList.remove('hidden');
}

function hideClientLogin() {
    document.querySelector('.role-selection').classList.remove('hidden');
    document.getElementById('client-login').classList.add('hidden');
}

function loginAsClient() {
    const name = document.getElementById('client-name').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const phone = document.getElementById('client-phone').value.trim();

    if (!name || !email) {
        alert('Please enter your name and email');
        return;
    }

    state.userRole = 'client';
    state.currentUser = { name, email, phone };
    showScreen('client-dashboard');
    renderMiniCalendar();
    renderClientRequests();
    renderClientAppointments();
}

function logout() {
    state.currentUser = null;
    state.userRole = null;
    state.selectedDates = [];
    state.uploadedPhotos = [];
    showScreen('auth-screen');
    hideClientLogin();
    
    // Reset forms
    document.getElementById('client-name').value = '';
    document.getElementById('client-email').value = '';
    document.getElementById('client-phone').value = '';
    const form = document.getElementById('service-request-form');
    if (form) form.reset();
    document.getElementById('photo-preview').innerHTML = '';
    document.getElementById('selected-dates').innerHTML = '';
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function switchTab(tabName) {
    const dashboard = state.userRole === 'owner' ? 'owner-dashboard' : 'client-dashboard';
    const container = document.getElementById(dashboard);
    
    container.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    container.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Render content based on tab
    if (tabName === 'calendar') renderCalendar();
    if (tabName === 'requests') renderRequests();
    if (tabName === 'negotiations') renderNegotiations();
    if (tabName === 'my-requests') renderClientRequests();
    if (tabName === 'my-appointments') renderClientAppointments();
    if (tabName === 'settings') loadSettings();
}

// Calendar Functions
function renderCalendar() {
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    
    document.getElementById('current-month').textContent = 
        new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const container = document.getElementById('calendar-days');
    container.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const div = createCalendarDay(day, true);
        container.appendChild(div);
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.getTime() === today.getTime();
        const hasAppointments = state.appointments.some(a => 
            new Date(a.date).toDateString() === date.toDateString()
        );
        
        const div = createCalendarDay(day, false, isToday, hasAppointments, date);
        container.appendChild(div);
    }
    
    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remaining = 42 - totalCells;
    for (let day = 1; day <= remaining; day++) {
        const div = createCalendarDay(day, true);
        container.appendChild(div);
    }
}

function createCalendarDay(day, isOtherMonth, isToday = false, hasAppointments = false, date = null) {
    const div = document.createElement('div');
    div.className = 'calendar-day';
    div.textContent = day;
    
    if (isOtherMonth) div.classList.add('other-month');
    if (isToday) div.classList.add('today');
    if (hasAppointments) div.classList.add('has-appointments');
    
    if (date && !isOtherMonth) {
        div.addEventListener('click', () => selectCalendarDate(date));
    }
    
    return div;
}

function selectCalendarDate(date) {
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    event.target.classList.add('selected');
    
    const dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
    });
    document.getElementById('selected-date').textContent = dateStr;
    
    const dayAppointments = state.appointments.filter(a => 
        new Date(a.date).toDateString() === date.toDateString()
    );
    
    const container = document.getElementById('appointments-list');
    if (dayAppointments.length === 0) {
        container.innerHTML = '<p class="empty-state">No appointments scheduled</p>';
    } else {
        container.innerHTML = dayAppointments.map(apt => `
            <div class="appointment-card" onclick="showAppointmentDetail('${apt.id}')">
                <div class="appointment-info">
                    <h4>${apt.clientName}</h4>
                    <p>${apt.address}</p>
                    <p>${apt.time === 'morning' ? '8AM - 12PM' : apt.time === 'afternoon' ? '12PM - 5PM' : 'Flexible'}</p>
                </div>
                <div class="appointment-amount">$${apt.amount.toFixed(2)}</div>
            </div>
        `).join('');
    }
    
    document.getElementById('day-appointments').style.display = 'block';
}

function changeMonth(delta) {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + delta);
    renderCalendar();
}

// Mini Calendar for Client Date Selection
function renderMiniCalendar() {
    const year = state.miniMonth.getFullYear();
    const month = state.miniMonth.getMonth();
    
    document.getElementById('mini-month').textContent = 
        new Date(year, month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const container = document.getElementById('mini-calendar-days');
    container.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Empty cells for alignment
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'mini-day disabled';
        container.appendChild(div);
    }
    
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const isPast = date < today;
        const isSelected = state.selectedDates.includes(dateStr);
        
        const div = document.createElement('div');
        div.className = 'mini-day';
        div.textContent = day;
        
        if (isPast) {
            div.classList.add('disabled');
        } else {
            if (isSelected) div.classList.add('selected');
            div.addEventListener('click', () => toggleDateSelection(dateStr));
        }
        
        container.appendChild(div);
    }
    
    renderSelectedDates();
}

function changeMiniMonth(delta) {
    state.miniMonth.setMonth(state.miniMonth.getMonth() + delta);
    renderMiniCalendar();
}

function toggleDateSelection(dateStr) {
    const index = state.selectedDates.indexOf(dateStr);
    if (index === -1) {
        state.selectedDates.push(dateStr);
    } else {
        state.selectedDates.splice(index, 1);
    }
    renderMiniCalendar();
}

function renderSelectedDates() {
    const container = document.getElementById('selected-dates');
    container.innerHTML = state.selectedDates.map(dateStr => {
        const date = new Date(dateStr + 'T12:00:00');
        return `
            <span class="selected-date-tag">
                ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                <button onclick="removeDate('${dateStr}')">&times;</button>
            </span>
        `;
    }).join('');
}

function removeDate(dateStr) {
    state.selectedDates = state.selectedDates.filter(d => d !== dateStr);
    renderMiniCalendar();
}

// Photo Upload
function handlePhotoUpload(event) {
    const files = Array.from(event.target.files);
    const preview = document.getElementById('photo-preview');
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            state.uploadedPhotos.push(e.target.result);
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

// Service Request
function handleServiceRequest(e) {
    e.preventDefault();
    
    if (state.selectedDates.length === 0) {
        alert('Please select at least one available date');
        return;
    }
    
    const request = {
        id: Date.now().toString(),
        clientName: state.currentUser.name,
        clientEmail: state.currentUser.email,
        clientPhone: state.currentUser.phone,
        address: `${document.getElementById('service-address').value}, ${document.getElementById('service-city').value}, ${document.getElementById('service-state').value} ${document.getElementById('service-zip').value}`,
        description: document.getElementById('work-description').value,
        photos: [...state.uploadedPhotos],
        availableDates: [...state.selectedDates],
        preferredTime: document.getElementById('preferred-time').value,
        status: 'pending',
        negotiations: [],
        createdAt: new Date().toISOString()
    };
    
    state.requests.push(request);
    saveToStorage();
    
    // Reset form
    e.target.reset();
    state.selectedDates = [];
    state.uploadedPhotos = [];
    document.getElementById('photo-preview').innerHTML = '';
    renderMiniCalendar();
    
    alert('Your service request has been submitted! The business owner will review it shortly.');
    switchTab('my-requests');
}

// Owner: View Requests
function renderRequests() {
    const pending = state.requests.filter(r => r.status === 'pending');
    const container = document.getElementById('requests-list');
    
    document.getElementById('request-badge').textContent = pending.length || '';
    
    if (pending.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No pending requests</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pending.map(req => `
        <div class="request-card" onclick="openNegotiation('${req.id}')">
            <div class="request-header">
                <h3>${req.clientName}</h3>
                <span class="status-badge pending">New Request</span>
            </div>
            <div class="request-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${req.address}</span>
                <span><i class="fas fa-calendar"></i> ${req.availableDates.length} available dates</span>
            </div>
            <p class="request-description">${req.description}</p>
        </div>
    `).join('');
}

// Owner: View Negotiations
function renderNegotiations() {
    const negotiating = state.requests.filter(r => r.status === 'negotiating');
    const container = document.getElementById('negotiations-list');
    
    document.getElementById('nego-badge').textContent = negotiating.length || '';
    
    if (negotiating.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <p>No active negotiations</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = negotiating.map(req => {
        const lastNego = req.negotiations[req.negotiations.length - 1];
        return `
            <div class="request-card" onclick="openNegotiation('${req.id}')">
                <div class="request-header">
                    <h3>${req.clientName}</h3>
                    <span class="status-badge negotiating">In Progress</span>
                </div>
                <div class="request-meta">
                    <span><i class="fas fa-dollar-sign"></i> Last offer: $${lastNego?.amount || 'N/A'}</span>
                    <span><i class="fas fa-comments"></i> ${req.negotiations.length} messages</span>
                </div>
                <p class="request-description">${req.description}</p>
            </div>
        `;
    }).join('');
}

// Client: View Their Requests
function renderClientRequests() {
    const myRequests = state.requests.filter(r => r.clientEmail === state.currentUser.email);
    const container = document.getElementById('client-requests-list');
    
    if (myRequests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-list"></i>
                <p>No requests yet. Submit your first request!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = myRequests.filter(r => r.status !== 'confirmed').map(req => `
        <div class="request-card" onclick="openNegotiation('${req.id}')">
            <div class="request-header">
                <h3>Service Request</h3>
                <span class="status-badge ${req.status}">${capitalizeFirst(req.status)}</span>
            </div>
            <div class="request-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${req.address}</span>
                <span><i class="fas fa-calendar"></i> ${new Date(req.createdAt).toLocaleDateString()}</span>
            </div>
            <p class="request-description">${req.description}</p>
        </div>
    `).join('');
}

// Client: View Appointments
function renderClientAppointments() {
    const myAppointments = state.appointments.filter(a => a.clientEmail === state.currentUser.email);
    const container = document.getElementById('client-appointments-list');
    
    if (myAppointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-check"></i>
                <p>No confirmed appointments yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = myAppointments.map(apt => `
        <div class="appointment-card-full">
            <div class="details">
                <h3>${state.settings.businessName}</h3>
                <p><i class="fas fa-map-marker-alt"></i> ${apt.address}</p>
                <p><i class="fas fa-clock"></i> ${apt.time === 'morning' ? 'Morning (8AM - 12PM)' : apt.time === 'afternoon' ? 'Afternoon (12PM - 5PM)' : 'Flexible'}</p>
                <p>${apt.description}</p>
            </div>
            <div class="amount-date">
                <div class="amount">$${apt.amount.toFixed(2)}</div>
                <div class="date">${new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            </div>
        </div>
    `).join('');
}

// Negotiation Modal
function openNegotiation(requestId) {
    const request = state.requests.find(r => r.id === requestId);
    if (!request) return;
    
    state.currentNegotiation = request;
    
    // Populate modal
    document.getElementById('nego-status').textContent = capitalizeFirst(request.status);
    document.getElementById('nego-status').className = `status-badge ${request.status}`;
    document.getElementById('nego-client-name').textContent = request.clientName;
    document.getElementById('nego-address').textContent = request.address;
    document.getElementById('nego-dates').textContent = request.availableDates.map(d => 
        new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ).join(', ');
    document.getElementById('nego-time').textContent = 
        request.preferredTime === 'morning' ? 'Morning (8AM - 12PM)' : 
        request.preferredTime === 'afternoon' ? 'Afternoon (12PM - 5PM)' : 'Flexible';
    document.getElementById('nego-description').textContent = request.description;
    
    // Photos
    const photosContainer = document.getElementById('nego-photos');
    photosContainer.innerHTML = request.photos.map(p => `<img src="${p}" alt="Garden photo">`).join('');
    
    // Chat messages
    renderNegotiationChat(request);
    
    // Show appropriate form based on role and status
    const ownerForm = document.getElementById('owner-proposal');
    const clientForm = document.getElementById('client-response');
    
    if (state.userRole === 'owner') {
        ownerForm.classList.remove('hidden');
        clientForm.classList.add('hidden');
        
        // Populate date dropdown
        const dateSelect = document.getElementById('proposal-date');
        dateSelect.innerHTML = request.availableDates.map(d => {
            const date = new Date(d + 'T12:00:00');
            return `<option value="${d}">${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</option>`;
        }).join('');
    } else {
        ownerForm.classList.add('hidden');
        
        // Show client form only if there's an offer to respond to
        const lastOffer = request.negotiations.filter(n => n.from === 'owner').pop();
        if (lastOffer && request.status === 'negotiating') {
            clientForm.classList.remove('hidden');
            document.getElementById('current-amount').textContent = lastOffer.amount.toFixed(2);
            document.getElementById('current-date').textContent = 
                new Date(lastOffer.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        } else {
            clientForm.classList.add('hidden');
        }
    }
    
    openModal('negotiation-modal');
}

function renderNegotiationChat(request) {
    const container = document.getElementById('chat-messages');
    
    if (request.negotiations.length === 0) {
        container.innerHTML = '<p class="empty-state">No messages yet</p>';
        return;
    }
    
    container.innerHTML = request.negotiations.map(nego => `
        <div class="chat-message ${nego.from}">
            <div class="amount">$${nego.amount.toFixed(2)}</div>
            <div class="date">Date: ${new Date(nego.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            ${nego.message ? `<div class="text">${nego.message}</div>` : ''}
            <div class="timestamp">${new Date(nego.timestamp).toLocaleString()}</div>
        </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
}

function sendProposal() {
    const amount = parseFloat(document.getElementById('proposal-amount').value);
    const date = document.getElementById('proposal-date').value;
    const message = document.getElementById('proposal-message').value;
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    const negotiation = {
        from: 'owner',
        amount,
        date,
        message,
        timestamp: new Date().toISOString()
    };
    
    state.currentNegotiation.negotiations.push(negotiation);
    state.currentNegotiation.status = 'negotiating';
    saveToStorage();
    
    // Clear form
    document.getElementById('proposal-amount').value = '';
    document.getElementById('proposal-message').value = '';
    
    renderNegotiationChat(state.currentNegotiation);
    updateBadges();
    
    // Send email notification (simulated)
    sendEmailNotification(state.currentNegotiation.clientEmail, 'New Proposal', 
        `You have received a new proposal for $${amount.toFixed(2)}. Please log in to review.`);
}

function sendCounterOffer() {
    const amount = parseFloat(document.getElementById('counter-amount').value);
    const message = document.getElementById('counter-message').value;
    
    if (!amount || amount <= 0) {
        alert('Please enter a counter offer amount');
        return;
    }
    
    const lastOffer = state.currentNegotiation.negotiations.filter(n => n.from === 'owner').pop();
    
    const negotiation = {
        from: 'client',
        amount,
        date: lastOffer.date,
        message,
        timestamp: new Date().toISOString()
    };
    
    state.currentNegotiation.negotiations.push(negotiation);
    saveToStorage();
    
    // Clear form
    document.getElementById('counter-amount').value = '';
    document.getElementById('counter-message').value = '';
    
    renderNegotiationChat(state.currentNegotiation);
    
    // Update client form with their counter
    document.getElementById('current-amount').textContent = amount.toFixed(2);
}

function acceptOffer() {
    const lastOffer = state.currentNegotiation.negotiations.filter(n => n.from === 'owner').pop();
    
    if (!lastOffer) {
        alert('No offer to accept');
        return;
    }
    
    // Create appointment
    const appointment = {
        id: Date.now().toString(),
        requestId: state.currentNegotiation.id,
        clientName: state.currentNegotiation.clientName,
        clientEmail: state.currentNegotiation.clientEmail,
        clientPhone: state.currentNegotiation.clientPhone,
        address: state.currentNegotiation.address,
        description: state.currentNegotiation.description,
        amount: lastOffer.amount,
        date: lastOffer.date,
        time: state.currentNegotiation.preferredTime,
        createdAt: new Date().toISOString()
    };
    
    state.appointments.push(appointment);
    state.currentNegotiation.status = 'confirmed';
    saveToStorage();
    
    closeModal('negotiation-modal');
    
    if (state.userRole === 'client') {
        renderClientRequests();
        renderClientAppointments();
        switchTab('my-appointments');
    } else {
        renderNegotiations();
        renderCalendar();
    }
    
    // Send confirmation emails
    sendEmailNotification(state.currentNegotiation.clientEmail, 'Appointment Confirmed', 
        `Your appointment has been confirmed for ${new Date(lastOffer.date + 'T12:00:00').toLocaleDateString()} at $${lastOffer.amount.toFixed(2)}.`);
    
    if (state.settings.ownerEmail) {
        sendEmailNotification(state.settings.ownerEmail, 'New Appointment', 
            `New appointment confirmed with ${state.currentNegotiation.clientName} for ${new Date(lastOffer.date + 'T12:00:00').toLocaleDateString()} at $${lastOffer.amount.toFixed(2)}.`);
    }
    
    alert('Appointment confirmed! Both you and the service provider will receive confirmation emails.');
}

function declineOffer() {
    if (!confirm('Are you sure you want to decline this offer? This will cancel the service request.')) {
        return;
    }
    
    state.currentNegotiation.status = 'declined';
    saveToStorage();
    
    closeModal('negotiation-modal');
    
    if (state.userRole === 'client') {
        renderClientRequests();
    } else {
        renderNegotiations();
    }
}

// Modals
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showAppointmentDetail(appointmentId) {
    const apt = state.appointments.find(a => a.id === appointmentId);
    if (!apt) return;
    
    document.getElementById('appointment-details').innerHTML = `
        <p><strong>Client:</strong> ${apt.clientName}</p>
        <p><strong>Email:</strong> ${apt.clientEmail}</p>
        <p><strong>Phone:</strong> ${apt.clientPhone || 'Not provided'}</p>
        <p><strong>Address:</strong> ${apt.address}</p>
        <p><strong>Date:</strong> ${new Date(apt.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <p><strong>Time:</strong> ${apt.time === 'morning' ? 'Morning (8AM - 12PM)' : apt.time === 'afternoon' ? 'Afternoon (12PM - 5PM)' : 'Flexible'}</p>
        <p><strong>Amount:</strong> $${apt.amount.toFixed(2)}</p>
        <p><strong>Description:</strong> ${apt.description}</p>
    `;
    
    openModal('appointment-modal');
}

// Settings
function loadSettings() {
    document.getElementById('owner-email').value = state.settings.ownerEmail || '';
    document.getElementById('reminder-time').value = state.settings.reminderTime || 24;
    document.getElementById('business-name').value = state.settings.businessName || '';
}

function saveSettings() {
    state.settings.ownerEmail = document.getElementById('owner-email').value;
    state.settings.reminderTime = parseInt(document.getElementById('reminder-time').value);
    state.settings.businessName = document.getElementById('business-name').value || 'GreenThumb Pro';
    saveToStorage();
    alert('Settings saved!');
}

// Email Notifications (Simulated - in production, use a backend service)
function sendEmailNotification(to, subject, body) {
    console.log(`📧 Email to: ${to}\nSubject: ${subject}\nBody: ${body}`);
    
    // In production, you would make an API call to your backend here
    // Example: fetch('/api/send-email', { method: 'POST', body: JSON.stringify({ to, subject, body }) });
}

// Reminders
function checkReminders() {
    const now = new Date();
    const reminderHours = state.settings.reminderTime || 24;
    
    state.appointments.forEach(apt => {
        const aptDate = new Date(apt.date + 'T09:00:00'); // Assume 9 AM for reminder calculation
        const hoursUntil = (aptDate - now) / (1000 * 60 * 60);
        
        if (hoursUntil > 0 && hoursUntil <= reminderHours) {
            // Check if reminder already sent (would use a flag in production)
            if (!apt.reminderSent) {
                if (state.settings.ownerEmail) {
                    sendEmailNotification(state.settings.ownerEmail, 'Appointment Reminder',
                        `Reminder: You have an appointment with ${apt.clientName} on ${new Date(apt.date + 'T12:00:00').toLocaleDateString()} at ${apt.address}.`);
                }
                apt.reminderSent = true;
                saveToStorage();
            }
        }
    });
    
    // Check every hour
    setTimeout(checkReminders, 60 * 60 * 1000);
}

// Utilities
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateBadges() {
    const pendingRequests = state.requests.filter(r => r.status === 'pending').length;
    const negotiations = state.requests.filter(r => r.status === 'negotiating').length;
    
    document.getElementById('request-badge').textContent = pendingRequests || '';
    document.getElementById('nego-badge').textContent = negotiations || '';
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
