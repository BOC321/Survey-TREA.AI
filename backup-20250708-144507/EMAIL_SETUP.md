# Email Functionality Setup Guide

This guide will help you set up the email functionality for The Answer Trap Risk Profile survey application.

## Prerequisites

### 1. Install Node.js

**Windows:**
1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version (recommended)
3. Run the installer and follow the setup wizard
4. Restart your computer or command prompt
5. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

**macOS:**
```bash
# Using Homebrew (recommended)
brew install node

# Or download from nodejs.org
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# CentOS/RHEL
sudo yum install nodejs npm
```

### 2. Install Dependencies

1. Open command prompt/terminal in the project directory
2. Install required packages:
   ```bash
   npm install
   ```

   This will install:
   - `express` - Web server framework
   - `nodemailer` - Email sending library
   - `cors` - Cross-origin resource sharing

## Email Configuration

### 1. Start the Server

```bash
# Start the server with email functionality
npm start

# The server will run on http://localhost:3000
```

### 2. Configure Email Settings

1. Open the survey application in your browser: `http://localhost:3000`
2. Click "Admin Access"
3. Navigate to "Email Settings" tab
4. Configure your SMTP settings:

#### Gmail Configuration
```
SMTP Server: smtp.gmail.com
SMTP Port: 587
Username: your-email@gmail.com
Password: your-app-password
```

**Important for Gmail:**
- Enable 2-factor authentication
- Generate an "App Password" instead of using your regular password
- Go to Google Account Settings > Security > App passwords

#### Outlook/Hotmail Configuration
```
SMTP Server: smtp-mail.outlook.com
SMTP Port: 587
Username: your-email@outlook.com
Password: your-password
```

#### Other Email Providers

**Yahoo:**
```
SMTP Server: smtp.mail.yahoo.com
SMTP Port: 587
```

**Custom SMTP:**
- Contact your email provider for SMTP settings
- Common ports: 587 (TLS), 465 (SSL), 25 (unsecured)

### 3. Test Email Configuration

1. After saving email settings, the system will automatically test the configuration
2. Check for success/error messages
3. If successful, you can now send survey results via email

## Using Email Features

### 1. Sending Results via Email

1. Complete a survey
2. On the results page, click "Email Results"
3. Enter the recipient's email address
4. The system will send a formatted email with:
   - Survey title
   - Total score and percentage
   - Category breakdowns
   - Risk assessment

### 2. Generating Shareable Links

1. On the results page, click "Get Shareable Link"
2. The system generates a unique link
3. Link is automatically copied to clipboard
4. Share the link with others to view results

## Troubleshooting

### Common Issues

**Error: "npm is not recognized"**
- Node.js is not installed or not in PATH
- Reinstall Node.js and restart command prompt

**Error: "Cannot find module 'express'"**
- Dependencies not installed
- Run `npm install` in project directory

**Error: "EAUTH - Authentication failed"**
- Incorrect email credentials
- For Gmail, use App Password instead of regular password
- Check username/password spelling

**Error: "ECONNREFUSED"**
- SMTP server settings incorrect
- Check server address and port
- Verify firewall settings

**Error: "Server is not available"**
- Node.js server not running
- Start server with `npm start`
- Check if port 3000 is available

### Email Provider Specific Issues

**Gmail:**
- Enable "Less secure app access" (not recommended)
- Use App Passwords (recommended)
- Check Google Account security settings

**Outlook:**
- May require OAuth2 for some accounts
- Check Microsoft account security settings

**Corporate Email:**
- May require VPN connection
- Contact IT department for SMTP settings
- Firewall may block outgoing SMTP connections

## Security Considerations

1. **Never commit email passwords to version control**
2. **Use environment variables for production:**
   ```bash
   # Create .env file
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

3. **Use App Passwords instead of regular passwords**
4. **Enable 2-factor authentication on email accounts**
5. **Regularly rotate email credentials**

## Production Deployment

For production deployment:

1. **Use environment variables for email settings**
2. **Enable HTTPS for secure transmission**
3. **Configure proper firewall rules**
4. **Use a dedicated email service (SendGrid, Mailgun, etc.)**
5. **Implement rate limiting for email sending**

## Support

If you encounter issues:

1. Check the server console for error messages
2. Verify all prerequisites are installed
3. Test with a simple email provider (Gmail with App Password)
4. Check firewall and antivirus settings
5. Ensure the server is running on the correct port

---

**Note:** Email functionality requires the Node.js server to be running. The survey application will work without the server, but email features will not be available.