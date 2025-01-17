import React, { useState } from 'react';
import NeedleConfigPanel from './NeedleConfigPanel';
import './App.css';

function App() {
  const [needleCount, setNeedleCount] = useState(6);
  const [configuration, setConfiguration] = useState({});

  const handleSave = (config) => {
    setConfiguration(config);
    // Add API call or storage logic here
  };

  const handleReset = () => {
    setConfiguration({});
  };

  return (
    <div className="App">
      <NeedleConfigPanel 
        needleCount={needleCount}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
}

export default App;
