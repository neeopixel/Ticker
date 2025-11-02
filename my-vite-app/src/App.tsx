import React from 'react';
import './styles/main.css';
import Hello from './components/Hello';

const App: React.FC = () => {
  return (
    <div>
      <h1>Welcome to My Vite App</h1>
      <Hello />
    </div>
  );
};

export default App;