import './App.css'
import { useRef, useEffect, useState } from 'react'
import axios from 'axios'

function SolutionDisplay({ data, loading }) {
  if (loading) {
    return (
      <div className="solutionContent">
        <div className="solutionSpinner">⏳</div>
        <p className="solutionHint">Solving your equation...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="solutionContent solutionEmpty">
        <span className="solutionIcon">✏️</span>
        <p>Draw an equation or expression, then hit Solve</p>
      </div>
    );
  }

  const { label, expression, answer, note } = data;

  return (
    <div className="solutionContent">
      {/* What we read */}
      {expression && (
        <div className="solutionBlock">
          <span className="solutionBlockLabel">We read</span>
          <div className="solutionExpression">{expression}</div>
        </div>
      )}

      {/* The answer */}
      <div className="solutionBlock">
        <span className="solutionBlockLabel">{label}</span>
        <div className="solutionAnswer">
          {answer.split("\n").map((line, i) => (
            <div key={i} className="solutionAnswerLine">{line}</div>
          ))}
        </div>
      </div>

      {/* Optional footnote */}
      {note && (
        <div className="solutionNote">{note}</div>
      )}
    </div>
  );
}

function App() {
  const canvasRef = useRef(null);
  const solveRef = useRef(null);
  const penRef = useRef(null);
  const eraseRef = useRef(null);
  const clearRef = useRef(null);
  const [solutionData, setSolutionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const drawingBoard = canvasRef.current;
    const ctx = drawingBoard.getContext('2d');

    let isPressed = false;
    const brushSize = 5;
    let x = 0, y = 0;
    const brushColor = 'black';

    let rect = drawingBoard.getBoundingClientRect();
    drawingBoard.width = rect.width;
    drawingBoard.height = rect.height;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, drawingBoard.width, drawingBoard.height);

    const drawCircle = (x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      // Use ctx.strokeStyle so the eraser (white) is respected
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    };

    const drawLine = (x1, y1, x2, y2) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      // strokeStyle is already set by pen/eraser buttons — don't override it
      ctx.lineWidth = brushSize * 2;
      ctx.stroke();
    };

    drawingBoard.addEventListener('mousedown', (e) => { isPressed = true; x = e.offsetX; y = e.offsetY; });
    drawingBoard.addEventListener('mouseup', () => { isPressed = false; x = undefined; y = undefined; });
    drawingBoard.addEventListener('mousemove', (e) => {
      if (!isPressed) return;
      const x2 = e.offsetX, y2 = e.offsetY;
      drawCircle(x2, y2);
      drawLine(x, y, x2, y2);
      x = x2; y = y2;
    });

    penRef.current.addEventListener('click', () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize * 2;
    });

    clearRef.current.addEventListener('click', () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, drawingBoard.width, drawingBoard.height);
      setSolutionData(null);
    });

    eraseRef.current.addEventListener('click', () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = 'white';
      ctx.lineWidth = brushSize * 4;
      ctx.lineCap = "round";
    });

    solveRef.current.addEventListener('click', () => connectToPython(drawingBoard));
  }, []);

  async function connectToPython(element) {
    setLoading(true);
    setSolutionData(null);
    try {
      const imageData = element.toDataURL("image/jpeg", 0.95);
      const response = await axios.post("http://127.0.0.1:5000/solveServer", { image: imageData });
      setSolutionData(response.data);
    } catch (err) {
      console.error(err);
      setSolutionData({
        label: "Connection error",
        expression: null,
        answer: "Could not reach the server. Make sure it's running.",
        note: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="App">
      <div className="topPanel">
        <div><img src="3dots.svg" alt="" /></div>
        <div><img src="3dots.svg" alt="" /></div>
      </div>

      <div className="middlePanel">
        <div className="buttonsPanel">
          <button className="penButton" ref={penRef}><img src="pen.svg" alt="Pen" /></button>
          <button className="eraseButton" ref={eraseRef}><img src="clear.svg" alt="Erase" /></button>
          <button className="clearButton" ref={clearRef}><img src="trash.svg" alt="Clear" /></button>
          <button className="solveButton" ref={solveRef}><img src="solve.svg" alt="Solve" /></button>
        </div>

        <div className="canvasPanel">
          <canvas id="canvas" ref={canvasRef}></canvas>
        </div>

        <div className="solutionPanel">
          <div className="solutionTitle">
            Solution
            <img src="solution.svg" alt="" />
          </div>
          <SolutionDisplay data={solutionData} loading={loading} />
        </div>
      </div>

      <div className="bottomPanel">
        <div className="colorsPalet"></div>
        <div className="scrolbar"><h2><b><i>brwnkn</i></b></h2></div>
      </div>
    </div>
  );
}

export default App
