import { Controller, Get, Header } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("tiktokGTu6guA6BWbvFlR9iChxomYvIBo6ZS4Y.txt")
  @Header("Content-Type", "text/plain")
  getVerification() {
    return "tiktok-developers-site-verification=GTu6guA6BWbvFlR9iChxomYvIBo6ZS4Y";
  }

  @Get()
  @Header("Content-Type", "text/html")
  getHome() {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>vvg - Global Political Summaries</title>
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f4f7f6; }
              header { text-align: center; padding: 40px 0; border-bottom: 2px solid #eee; margin-bottom: 40px; }
              h1 { color: #2c3e50; font-size: 2.5rem; margin-bottom: 10px; }
              .tagline { font-size: 1.2rem; color: #7f8c8d; }
              .content { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .news-item { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
              .news-item:last-child { border-bottom: none; }
              .news-item h2 { color: #34495e; font-size: 1.5rem; margin-top: 0; }
              .badge { background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; text-transform: uppercase; font-weight: bold; }
              footer { text-align: center; margin-top: 50px; padding: 20px; color: #7f8c8d; font-size: 0.9rem; }
              footer a { color: #3498db; text-decoration: none; margin: 0 10px; }
              footer a:hover { text-decoration: underline; }
          </style>
      </head>
      <body>
          <header>
              <h1>vvg</h1>
              <p class="tagline">Daily updates on global political events. Neutral, factual, and easy to understand.</p>
          </header>
          <div class="content">
              <div class="news-item">
                  <span class="badge">International</span>
                  <h2>Global Leaders Convene for Climate Summit</h2>
                  <p>Heads of state from over 100 countries gathered in Geneva today to discuss new frameworks for international environmental cooperation and carbon credit standardization.</p>
              </div>
              <div class="news-item">
                  <span class="badge">Europe</span>
                  <h2>New Economic Partnership Framework Proposed</h2>
                  <p>The European Commission has introduced a draft for a revised trade agreement aimed at streamlining digital services across member states, focusing on data portability and consumer protection.</p>
              </div>
              <div class="news-item">
                  <span class="badge">Americas</span>
                  <h2>Infrastructure Initiative Passes Initial Review</h2>
                  <p>A major bipartisan infrastructure proposal has cleared the first stage of legislative review, detailing plans for significant investment in high-speed rail and renewable energy grids.</p>
              </div>
          </div>
          <footer>
              <p>&copy; 2026 vvg. All rights reserved.</p>
              <nav>
                  <a href="/terms">Terms of Service</a>
                  <a href="/privacy">Privacy Policy</a>
              </nav>
          </footer>
      </body>
      </html>
    `;
  }

  @Get("terms")
  @Header("Content-Type", "text/html")
  getTerms() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Terms of Service - vvg</title>
          <style>
              body { font-family: sans-serif; line-height: 1.5; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; }
              h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
          </style>
      </head>
      <body>
          <h1>Terms of Service</h1>
          <p>Effective Date: January 14, 2026</p>
          <p>vvg is an informational platform that provides short summaries of publicly available news related to global political events.</p>
          <h2>1. Purpose</h2>
          <p>vvg is designed for informational and educational purposes only. The content does not constitute political advice, endorsement, persuasion, or opinion.</p>
          <h2>2. Content Sources</h2>
          <p>Content is generated from publicly available news sources. While we strive for accuracy, we do not guarantee completeness or timeliness.</p>
          <h2>3. User Responsibilities</h2>
          <p>Users agree to use the service lawfully and for personal, non-commercial purposes. Misuse, automated scraping, or attempts to manipulate content are prohibited.</p>
          <h2>4. No Political Advocacy</h2>
          <p>vvg does not promote or oppose any political party, candidate, or ideology.</p>
          <h2>5. Limitation of Liability</h2>
          <p>vvg is not liable for decisions made based on information provided by the app.</p>
          <h2>6. Changes</h2>
          <p>We may update these Terms at any time. Continued use indicates acceptance of changes.</p>
          <h2>7. Contact</h2>
          <p>For questions, contact: support@vvg.app</p>
          <p><a href="/">Back to Home</a></p>
      </body>
      </html>
    `;
  }

  @Get("privacy")
  @Header("Content-Type", "text/html")
  getPrivacy() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Privacy Policy - vvg</title>
          <style>
              body { font-family: sans-serif; line-height: 1.5; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; }
              h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
          </style>
      </head>
      <body>
          <h1>Privacy Policy</h1>
          <p>Effective Date: January 14, 2026</p>
          <p>vvg respects user privacy and is committed to protecting personal data.</p>
          <h2>1. Information We Collect</h2>
          <p>We collect minimal data such as basic usage analytics and device information to improve service performance. We do not collect sensitive personal data.</p>
          <h2>2. Content Data</h2>
          <p>Political summaries are generated from public news sources and do not include user-generated political opinions.</p>
          <h2>3. Cookies</h2>
          <p>We may use cookies or similar technologies for basic functionality and analytics.</p>
          <h2>4. Data Sharing</h2>
          <p>We do not sell or share personal data with third parties except as required by law.</p>
          <h2>5. Data Security</h2>
          <p>Reasonable technical measures are used to protect data.</p>
          <h2>6. Children’s Privacy</h2>
          <p>vvg is not intended for children under 13.</p>
          <h2>7. Updates</h2>
          <p>This policy may be updated periodically.</p>
          <h2>8. Contact</h2>
          <p>For privacy concerns, contact: privacy@vvg.app</p>
          <p><a href="/">Back to Home</a></p>
      </body>
      </html>
    `;
  }

  @Get("status")
  getStatus() {
    return {
      status: "online",
      service: "Viral Video Generator API",
      version: "1.0.0",
    };
  }
}
