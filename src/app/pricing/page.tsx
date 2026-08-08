'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* Navbar */}
      <nav style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #e01e37, #85101f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>SmartAttend</span>
        </Link>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#4b5563', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem', marginRight: '16px' }}>Home</Link>
          <Link href="/login" style={{ color: '#4b5563', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem' }}>Log in</Link>
          <Link href="/onboard?plan=starter" style={{ padding: '8px 16px', background: '#e01e37', color: 'white', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem' }}>Start Free Trial</Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px', maxWidth: '800px', margin: '0 auto 64px auto' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: '#111827', letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '24px' }}>
            Simple, transparent pricing for any institution.
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#6b7280', lineHeight: 1.6 }}>
            Whether you're a small tutoring center or a massive university, we have a plan that perfectly scales with your needs. Get started for free today.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
            <span style={{ fontSize: '1rem', fontWeight: isYearly ? 500 : 700, color: isYearly ? '#6b7280' : '#111827' }}>Monthly</span>
            <button 
              onClick={() => setIsYearly(!isYearly)}
              style={{ width: '64px', height: '32px', background: isYearly ? '#e01e37' : '#d1d5db', borderRadius: '99px', position: 'relative', cursor: 'pointer', border: 'none', transition: 'background 0.3s' }}
            >
              <div style={{ width: '24px', height: '24px', background: 'white', borderRadius: '50%', position: 'absolute', top: '4px', left: isYearly ? '36px' : '4px', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1rem', fontWeight: isYearly ? 700 : 500, color: isYearly ? '#111827' : '#6b7280' }}>Yearly</span>
              <span style={{ background: '#fef2f2', color: '#e01e37', padding: '4px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>Save 20%</span>
            </div>
          </div>
        </div>

        {/* Pricing Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', alignItems: 'flex-start' }}>
          
          {/* Starter Plan */}
          <div style={{ background: 'white', borderRadius: '24px', padding: '40px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>Starter</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>GH₵ {isYearly ? '3,840' : '400'}</span>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>/{isYearly ? 'year' : 'month'}</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '32px' }}>Perfect for small schools and bootcamps just getting started.</p>
            
            <Link href="/onboard?plan=starter" style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#f1f5f9', color: '#111827', borderRadius: '12px', fontWeight: 600, textDecoration: 'none', marginBottom: '32px', transition: 'background 0.2s' }}>
              Get Started
            </Link>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Feature text="1 Administrator" />
              <Feature text="Up to 50 Users" />
              <Feature text="5GB Storage" />
              <Feature text="Basic Email Support" />
            </div>
          </div>

          {/* Pro Plan */}
          <div style={{ background: 'white', borderRadius: '24px', padding: '40px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>Pro</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>GH₵ {isYearly ? '14,400' : '1,500'}</span>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>/{isYearly ? 'year' : 'month'}</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '32px' }}>Everything you need to manage a growing campus.</p>
            
            <Link href="/onboard?plan=pro" style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#f1f5f9', color: '#111827', borderRadius: '12px', fontWeight: 600, textDecoration: 'none', marginBottom: '32px', transition: 'background 0.2s' }}>
              Start 2-Month Free Trial
            </Link>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Feature text="5 Administrators" />
              <Feature text="Up to 500 Users" />
              <Feature text="50GB Storage" />
              <Feature text="Priority Email Support" />
              <Feature text="Custom Branding" />
            </div>
          </div>

          {/* Enterprise Plan (Highlighted) */}
          <div style={{ background: 'white', borderRadius: '24px', padding: '40px', border: '2px solid #e01e37', boxShadow: '0 20px 25px -5px rgba(224, 30, 55, 0.1)', position: 'relative', transform: 'scale(1.02)' }}>
            <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#e01e37', color: 'white', padding: '4px 16px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Most Popular
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>Enterprise</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>GH₵ {isYearly ? '40,000' : '4,000'}</span>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>/{isYearly ? 'year' : 'month'}</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '32px' }}>Unlimited scaling for massive global universities.</p>
            
            <Link href="/onboard?plan=enterprise" style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#e01e37', color: 'white', borderRadius: '12px', fontWeight: 600, textDecoration: 'none', marginBottom: '32px', transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(224,30,55,0.3)' }}>
              Contact Sales
            </Link>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Feature text="Unlimited Administrators" />
              <Feature text="Unlimited Users" />
              <Feature text="500GB Storage" />
              <Feature text="24/7 Phone Support" />
              <Feature text="Single Sign-On (SSO)" />
              <Feature text="API Access" />
            </div>
          </div>

          {/* Self-Hosted Plan */}
          <div style={{ background: 'white', borderRadius: '24px', padding: '40px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>Self-Hosted</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>Custom</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '32px' }}>Deployed to your private servers. Pricing tiered by total student volume.</p>
            
            <Link href="/onboard?plan=self-hosted" style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#111827', color: 'white', borderRadius: '12px', fontWeight: 600, textDecoration: 'none', marginBottom: '32px', transition: 'background 0.2s' }}>
              Contact Sales
            </Link>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Feature text="100% Data Sovereignty" />
              <Feature text="Tiered by Student Volume" />
              <Feature text="Custom Hardware Integration" />
              <Feature text="Dedicated Setup Engineer" />
              <Feature text="Annual Maintenance SLA" />
              <Feature text="Source Code Escrow" />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e01e37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <span style={{ color: '#374151', fontSize: '0.95rem', fontWeight: 500 }}>{text}</span>
    </div>
  );
}
