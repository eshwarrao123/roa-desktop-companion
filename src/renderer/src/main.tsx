import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { PetApp } from './pet/PetApp';
import { DashboardApp } from './dashboard/DashboardApp';

function Root() {
  const [hash, setHash] = React.useState(window.location.hash);

  React.useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const isPetView = hash.includes('pet');

  return (
    <React.StrictMode>
      {isPetView ? <PetApp /> : <DashboardApp />}
    </React.StrictMode>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<Root />);
}
