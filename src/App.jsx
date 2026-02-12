
import './App.css'

function App() {
  return (
    <div className="App">
      <div className = "topPanel">
        <div><img src = "3dots.svg"></img></div>
        <div><img src = "3dots.svg"></img></div>
      </div>

      <div className = "middlePanel">
        <div className = "buttonsPanel">
          <button className = "penButton">
            <img src ="pen.svg"></img>
          </button>
          <button className = "eraseButton">
            <img src ="clear.svg"></img>
          </button>
          <button className = "clearButton">
            <img src ="trash.svg"></img>
          </button>
          <button className = "solveButton">
            <img src ="solve.svg"></img>
          </button>
        </div>

        <div className = "canvasPanel">
          <canvas id = "canvas"></canvas>
        </div>

        <div className = "solutionPanel">
          <div className="solutionTitle"> Solution
           <img src ="solution.svg"></img>
          </div>
          <h2 className="solutionText">No solution yet</h2>
        </div>

      </div>

      <div className = "bottomPanel">

        <div className='colorsPalet'>
          
        </div>
        <div className='scrolbar'>
          <input id="brushSize" type="range" min="1" max="60" value="10" />
        </div>
        
      </div>
    </div>
  )
}


export default App
