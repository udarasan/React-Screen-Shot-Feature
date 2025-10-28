import ScreenCaptureTool from './ScreenCaptureTool';
import './App.css';

function App() {
  return (
    <div className="app">
      <h1>Screen Capture Tool</h1>
      <p>Click the button below to capture a selected area of your screen.</p>
      <ScreenCaptureTool />
    </div>
  );
}

export default App;