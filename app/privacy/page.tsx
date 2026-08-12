// app/privacy/page.tsx
export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif', color: '#333', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10 }}>Privacy Policy — ReelForge</h1>
      <p style={{ color: '#666', fontSize: 14 }}>Last updated: August 2026</p>
      
      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />

      <h2>1. Information We Collect</h2>
      <p>ReelForge connects to social media platforms (Instagram, TikTok, Facebook, Twitter, YouTube, Snapchat) via official OAuth 2.0. We store access tokens securely to enable automated posting on your behalf.</p>

      <h2>2. How We Use Information</h2>
      <p>Your connected account tokens are used strictly to create, render, and publish social media content that you explicitly command or schedule.</p>

      <h2>3. Data Protection & Security</h2>
      <p>We do not store your social account passwords. OAuth tokens are stored with access controls and row-level security. You can revoke access at any time through your social platform settings.</p>

      <h2>4. Data Deletion</h2>
      <p>You can disconnect your social accounts and delete all associated data at any time from your ReelForge dashboard settings.</p>
    </div>
  )
}
