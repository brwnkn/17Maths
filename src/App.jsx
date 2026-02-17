
import './App.css'
import { useRef, useEffect, use} from 'react'



function App() {
  const canvasRef = useRef(null);
  const solveRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const drawingBoard = canvasRef.current
    const ctx = drawingBoard.getContext('2d');

    let isPressed = false;
    const brushSize = 5;
    let x = 0;
    let y = 0;
    const brushColor = 'black';
    //...
    let rect = drawingBoard.getBoundingClientRect();
    drawingBoard.width = rect.width; 
    drawingBoard.height = rect.height;
    // the enclosed segment above enables getting exact CSS scale for the canvas so the drawing logic works properly.
    const drawCircle=(x, y)=>{
        ctx.beginPath();
        ctx.arc(x, y, brushSize, 0, Math.PI * 2);
        ctx.fillStyle = brushColor;
        ctx.fill();
    };

    const drawLine=(x1, y1, x2, y2) =>  {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize * 2;
        ctx.stroke();
    };

    drawingBoard.addEventListener('mousedown', (event) => {
        isPressed = true;
        x = event.offsetX;
        y = event.offsetY;
    });

    drawingBoard.addEventListener('mouseup', (event) => {
        isPressed = false;
        x = undefined;
        y = undefined;
    });

    drawingBoard.addEventListener('mousemove', (event) => {
        if(isPressed){
            const x2 = event.offsetX;
            const y2 = event.offsetY;
            drawCircle(x2, y2);
            drawLine(x, y, x2, y2);
            x = x2;
            y = y2;
        }
    });

    solveRef.current.addEventListener('click', () => {
      console.log("solve button clicked");
    });


      }, []);

//the UI display part, not related to the drawing logic
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
          <button className = "solveButton" ref = {solveRef}>
            <img src ="solve.svg"></img>
          </button>
        </div>

        <div className = "canvasPanel">
          <canvas id = "canvas"  ref = {canvasRef} ></canvas>
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
          <input id="brushSize" type="range" min="1" max="60" />
        </div>
        
      </div>
    </div>
  )
}

export default App
