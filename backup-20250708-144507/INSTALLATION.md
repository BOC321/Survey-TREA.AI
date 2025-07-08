# Installation Guide

## The Answer Trap Risk Profile Survey

### Quick Start (Local Usage)

#### Option 1: Direct Browser Access (Simplest)
1. **Download/Extract Files**
   - Ensure all files are in the same directory:
     - `index.html`
     - `styles.css`
     - `script.js`
     - `README.md`
     - `package.json`
     - `run-survey.bat`

2. **Run the Application**
   - **Windows**: Double-click `run-survey.bat`
   - **Manual**: Double-click `index.html` to open in browser
   - **Alternative**: Right-click `index.html` → "Open with" → Choose your browser

3. **Access the Survey**
   - The application will open in your default web browser
   - Choose "Admin Access" to configure or "Take Survey" to use
   - **Note**: Email functionality requires Node.js server (see Option 2)

#### Option 1.5: Install Node.js (Required for Email)

1. Download and install Node.js from [nodejs.org](https://nodejs.org/)
2. Restart your command prompt/terminal
3. Verify installation: `node --version` and `npm --version`
4. Continue with Option 2 for full functionality

#### Option 2: Local Web Server (Recommended for full functionality)

**Prerequisites:**
- Node.js installed on your system (Download from [nodejs.org](https://nodejs.org/))

**Using Node.js (Recommended):**
```bash
# First, ensure Node.js is installed
node --version
npm --version

# Install dependencies
npm install

# Start the development server with email functionality
npm start

# Or start with live reload
npm run dev
```

The survey will be available at `http://localhost:3000` with full email functionality.

**Alternative - Simple HTTP Server:**
1. Open command prompt/terminal in the project directory
2. Install a simple HTTP server:
   ```bash
   npm install -g http-server
   ```
3. Start the server:
   ```bash
   http-server . -p 8080 -o
   ```
4. Access at: `http://localhost:8080`

### Production Deployment

#### Web Server Deployment

**Requirements:**
- Web server (Apache, Nginx, IIS, etc.)
- HTTPS certificate (recommended)

**Steps:**
1. **Upload Files**
   - Copy all project files to your web server directory
   - Maintain the file structure

2. **Configure Web Server**
   - Set up virtual host/site
   - Enable HTTPS (recommended)
   - Configure proper MIME types for .js and .css files

3. **Test Deployment**
   - Access your domain/subdomain
   - Test both admin and user functionality
   - Verify all features work correctly

#### Apache Configuration Example
```apache
<VirtualHost *:443>
    ServerName survey.yourdomain.com
    DocumentRoot /path/to/survey/files
    
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    
    <Directory /path/to/survey/files>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

#### Nginx Configuration Example
```nginx
server {
    listen 443 ssl;
    server_name survey.yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    root /path/to/survey/files;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Cloud Deployment Options

#### GitHub Pages
1. Create a GitHub repository
2. Upload all files to the repository
3. Enable GitHub Pages in repository settings
4. Access via: `https://username.github.io/repository-name`

#### Netlify
1. Create account at netlify.com
2. Drag and drop project folder to Netlify dashboard
3. Get instant deployment URL
4. Optional: Configure custom domain

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Follow deployment prompts
4. Get deployment URL

### Configuration After Installation

#### Initial Admin Setup
1. **Access Admin Mode**
   - Open the application
   - Click "Admin Access"

2. **Basic Configuration**
   - Set survey title
   - Upload banner image (optional)
   - Save basic settings

3. **Question Setup**
   - Add introduction questions with dropdown options
   - Create categories for grouping questions
   - Add categorical questions with 3 scored options each

4. **Scoring Configuration**
   - Define score ranges (e.g., 0-40%, 41-70%, 71-100%)
   - Set colors for each range
   - Write descriptions for each score level

5. **Email Settings** (Optional)
   - Configure SMTP settings for email delivery
   - Test email functionality

#### Sample Configuration

The application comes with sample data including:
- 2 introduction questions (age group, occupation)
- 2 categories (Risk Tolerance, Decision Making)
- 3 categorical questions total
- 3 scoring ranges (Low, Moderate, High Risk)

### Troubleshooting

#### Common Issues

**Issue: Node.js not found**
- **Solution**: Download and install from [nodejs.org](https://nodejs.org/)
- **Check**: Restart command prompt after installation
- **Verify**: Add Node.js to system PATH if needed

**Issue: npm install fails**
- **Solution**: Ensure Node.js is properly installed
- **Check**: Try running as administrator
- **Verify**: Clear npm cache: `npm cache clean --force`

**Issue: Application doesn't load properly**
- **Solution**: Ensure all files are in the same directory
- **Check**: Browser console for JavaScript errors
- **Verify**: All file paths are correct

**Issue: Styles not loading**
- **Solution**: Check that `styles.css` is in the same directory as `index.html`
- **Verify**: No browser caching issues (hard refresh: Ctrl+F5)

**Issue: Data not saving**
- **Solution**: Ensure localStorage is enabled in browser
- **Check**: Browser privacy settings
- **Note**: Incognito/private mode may not persist data

**Issue: Email functionality not working**
- **Solution**: Ensure Node.js server is running (`npm start`)
- **Check**: Verify SMTP settings in admin panel
- **Verify**: Check server console for error messages
- **Note**: Ensure firewall allows Node.js connections

#### Browser Compatibility

**Supported Browsers:**
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

**Not Supported:**
- Internet Explorer
- Very old browser versions

#### Performance Optimization

**For Large Surveys:**
- Limit questions to reasonable numbers (< 50 total)
- Optimize images (compress banner images)
- Consider pagination for very long surveys

**For Production:**
- Enable gzip compression on web server
- Set appropriate cache headers
- Use CDN for static assets if needed

### Security Considerations

#### Data Protection
- All data stored locally in browser
- No server transmission of sensitive data
- HTTPS recommended for production

#### Input Validation
- Application includes basic input sanitization
- XSS protection through proper escaping
- No server-side vulnerabilities (client-only app)

#### Privacy
- No external tracking or analytics by default
- Data remains on user's device
- Admin can add analytics if needed

### Customization

#### Styling
- Edit `styles.css` for visual customization
- Modify color scheme variables
- Adjust responsive breakpoints

#### Functionality
- Edit `script.js` for feature modifications
- Add new question types
- Implement additional scoring algorithms

#### Branding
- Replace banner image
- Modify survey title
- Customize color scheme
- Add company logo/branding

### Support

For technical support:
1. Check this installation guide
2. Review the main README.md file
3. Check browser console for errors
4. Verify all files are present and correctly named

### Version Information

- **Version**: 1.0.0
- **Compatibility**: Modern web browsers
- **Dependencies**: None (pure HTML/CSS/JavaScript)
- **Storage**: Browser localStorage

---

**Note**: This is a client-side application. For enterprise deployment with user management, database storage, and advanced features, consider implementing a server-side backend.