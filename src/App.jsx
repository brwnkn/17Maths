
import './App.css'
import { useRef, useEffect, use} from 'react'
import axios from 'axios'



function App() {
  const canvasRef = useRef(null);
  const solveRef = useRef(null);
  const penRef = useRef(null);
  const eraseRef = useRef(null);
  const clearRef = useRef(null);
  const solutionTextRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const drawingBoard = canvasRef.current;
    const penButton = penRef.current;
    const eraseButton = eraseRef.current;
    const clearButton = clearRef.current;
    const solveButton = solveRef.current;
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

    penButton.addEventListener('click', () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize * 2
    });
    clearButton.addEventListener("click", () =>
    ctx.clearRect(0, 0, drawingBoard.width, drawingBoard.height)
      );

    eraseButton.addEventListener('click', () => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize * 4;       // eraser size
      ctx.lineCap = "round";
    });

    solveButton.addEventListener('click', connectToPython);


      }, []);
    async function connectToPython(){
      try{
        // POST
          const sent = await axios.post("http://127.0.0.1:5000/api/data", {"image": drawingBoard.toDataURL()});
        // GET
          const msg = await axios.get("http://127.0.0.1:5000/api/data");
          console.log(msg.data.message);
      }
      catch (error) {
        console.error("Error connecting to Python server:", error);
      }
    }
//the UI display part, not related to the drawing logic
  return (
    <div className="App">
      <div className = "topPanel">
        <div><img src = "3dots.svg"></img></div>
        <div><img src = "3dots.svg"></img></div>
      </div>

      <div className = "middlePanel">
        <div className = "buttonsPanel">
          <button className = "penButton" ref = {penRef}>
            <img src ="pen.svg"></img>
          </button>
          <button className = "eraseButton" ref = {eraseRef}>
            <img src ="clear.svg"></img>
          </button>
          <button className = "clearButton" ref = {clearRef}>
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
          <h2 className="solutionText" ref = {solutionTextRef}>No solution yet</h2>
        </div>

      </div>

      <div className = "bottomPanel">

        <div className='colorsPalet'>
          
        </div>
        <div className='scrolbar'>
          <h2><b><i>brwnkn</i></b></h2>
        </div>
        
      </div>
    </div>
  )
}

export default App
