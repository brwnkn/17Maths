
import './App.css'

function App() {
  return (
    <div className="App">
      <div className = "topPanel">
        <h2>the space containing the two small dots</h2>
      </div>

      <div className = "middlePanel">
        <div className = "buttonsPanel">
          <button className = "penButton">Pen</button>
          <button className = "eraseButton">Erase</button>
          <button className = "clearButton">Clear</button>
          <button className = "solveButton">Solve</button>
        </div>

        <div className = "canvasPanel">
          <canvas id = "canvas"></canvas>
        </div>

        <div className = "solutionPanel">
          <div className="solutionTitle"> Solution</div>
          <h2 className="solutionText">No solution yet</h2>
        </div>

      </div>

      <div className = "bottomPanel">
        <h2>the space containing the colors</h2>
      </div>
    </div>
  )
}


export default App
