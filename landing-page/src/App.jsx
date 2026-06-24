import React from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import Stats from './components/sections/Stats';
import Features from './components/sections/Features';
import HowItWorks from './components/sections/HowItWorks';
import Pricing from './components/sections/Pricing';
import Testimonials from './components/sections/Testimonials';
import DownloadApp from './components/sections/DownloadApp';
import FinalCTA from './components/sections/FinalCTA';
import WhatsAppFloat from './components/ui/WhatsAppFloat';
import './App.css';

function App() {
  const [isCheckingVersion, setIsCheckingVersion] = React.useState(true);
  const [isUpgrading, setIsUpgrading] = React.useState(false);

  React.useEffect(() => {
    const checkVersion = async () => {
      try {
        const { initializeApp, getApps } = await import('firebase/app');
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        
        const firebaseConfig = {
          apiKey: "AIzaSyDP8xh4FwNRbswvSf1egMCmybkcRr_8xgk",
          authDomain: "miprodu-fec00.firebaseapp.com",
          projectId: "miprodu-fec00",
          storageBucket: "miprodu-fec00.firebasestorage.app",
          messagingSenderId: "112703118753",
          appId: "1:112703118753:web:797a1ec23d2165a9517fe0",
          measurementId: "G-R1BRV39W0X"
        };

        const app = getApps().find(a => a.name === 'landing-pricing')
          || initializeApp(firebaseConfig, 'landing-pricing');
        const db = getFirestore(app);
        
        const ref = doc(db, 'platform_settings', 'version');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const serverVersion = snap.data().version;
          const localVersion = localStorage.getItem('app_version');
          if (serverVersion && localVersion && serverVersion !== localVersion) {
            setIsUpgrading(true);
            console.warn(`[VersionController] Nueva versión detectada: ${serverVersion}. Reiniciando y limpiando base de datos y caché local...`);
            
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              for (let r of regs) {
                await r.unregister();
              }
            }
            
            if ('caches' in window) {
              const keys = await caches.keys();
              for (let k of keys) {
                await caches.delete(k);
              }
            }

            if (window.indexedDB && window.indexedDB.databases) {
              try {
                const databases = await window.indexedDB.databases();
                for (const dbInfo of databases) {
                  if (dbInfo.name && dbInfo.name.toLowerCase().includes('firestore')) {
                    window.indexedDB.deleteDatabase(dbInfo.name);
                  }
                }
              } catch (dbErr) {
                console.error("Error deleting databases:", dbErr);
              }
            }

            sessionStorage.clear();
            localStorage.setItem('app_version', serverVersion);
            
            const cleanUrl = window.location.origin + window.location.pathname + '?v=' + serverVersion + window.location.hash;
            window.location.replace(cleanUrl);
            return;
          } else if (serverVersion && !localVersion) {
            localStorage.setItem('app_version', serverVersion);
          }
        }
      } catch (err) {
        console.error('[VersionController] Error checking version:', err);
      } finally {
        setIsCheckingVersion(false);
      }
    };
    checkVersion();
  }, []);

  React.useEffect(() => {
    if (isCheckingVersion || isUpgrading) return;
    // Clear retry flags on successful mount
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('chunk_retry_count');
    }
  }, [isCheckingVersion, isUpgrading]);

  if (isUpgrading || isCheckingVersion) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--black, #FFFFFF)',
        color: 'var(--white, #060608)',
        fontFamily: 'var(--font-sans), sans-serif'
      }}>
        <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(139, 26, 46, 0.1)',
            borderTopColor: 'var(--wine, #8B1A2E)',
            borderRadius: '50%',
            animation: 'spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite'
          }} />
          <div style={{
            position: 'absolute',
            width: '48px',
            height: '48px',
            border: '2px solid var(--wine, #8B1A2E)',
            borderRadius: '50%',
            opacity: 0,
            animation: 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite'
          }} />
        </div>
        <p style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--wine-mid, #A52040)',
          opacity: 0.8,
          animation: 'fade-text 1.5s ease-in-out infinite'
        }}>
          Cargando...
        </p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.3; }
            50% { opacity: 0.1; }
            100% { transform: scale(1.3); opacity: 0; }
          }
          @keyframes fade-text {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.9; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Header />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <DownloadApp />
        <FinalCTA />
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}

export default App;
