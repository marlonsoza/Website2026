# GreenThumb Pro - Gardening Services App

A web application for managing gardening service requests, client negotiations, and appointment scheduling.

## Features

### For Business Owners
- **Calendar View**: See all confirmed appointments at a glance
- **Service Requests**: Review incoming requests with photos and availability
- **Negotiations**: Send quotes, counter-offers, and finalize pricing
- **Email Reminders**: Get notified before appointments (configurable timing)
- **Settings**: Configure email, reminder preferences, and business name

### For Clients
- **Submit Requests**: Upload garden photos, select available dates, describe work needed
- **Private Communication**: Only you and the business owner see your address and details
- **Negotiate Pricing**: Review quotes, send counter-offers, or accept proposals
- **View Appointments**: See all confirmed appointments with details

## Setup

1. Save all three files (`index.html`, `styles.css`, `app.js`) in the same folder
2. Open `index.html` in a web browser
3. No server required - runs entirely in the browser

## Email Integration

The app currently logs email notifications to the console. For production use, you'll need to:

1. Set up a backend service (Node.js, Python, etc.)
2. Use an email service like SendGrid, Mailgun, or AWS SES
3. Replace the `sendEmailNotification()` function with actual API calls

Example backend endpoint:
```javascript
// Replace in app.js
async function sendEmailNotification(to, subject, body) {
    await fetch('[your-api.com](https://your-api.com/send-email)', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body })
    });
}
# Website2026
