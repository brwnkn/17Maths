from flask import Flask, request, jsonify
from flask_cors import CORS
import base64, io
from PIL import Image
from pix2text import Pix2Text
from sympy import *
import re  # must come AFTER sympy wildcard to reclaim re module
from sympy import latex as sym_latex
from latex2sympy2 import latex2sympy as parse_latex


p2t = Pix2Text()
app = Flask(__name__)
CORS(app)


# ── OCR correction map ────────────────────────────────────────────────────────
OCR_CORRECTIONS = {
    "\\ddag":     "\\nmid",
    "\\dag":      "\\mid",
    "\\ddagger":  "\\nmid",
    "\\dagger":   "\\mid",
    "\\vdots":    "\\div",
    "\\not\\mid": "\\nmid",
    "\\not=":     "\\neq",
}


def _apply_ocr_corrections(latex_str):
    result = latex_str
    for wrong, right in OCR_CORRECTIONS.items():
        result = result.replace(wrong, right)
    if result != latex_str:
        print(f"OCR correction: '{latex_str}' -> '{result}'")
    return result


# ── Human-readable formatting ─────────────────────────────────────────────────

def _expr_to_human(sympy_expr):
    """
    Convert a SymPy expression to a clean, readable string.
    Prefers decimals for simple fractions, keeps exact form otherwise.
    """
    try:
        # If it evaluates to a clean decimal, use that
        val = float(sympy_expr.evalf())
        # Show as integer if it is one
        if val == int(val):
            return str(int(val))
        # Round to 4 significant figures to avoid floating point noise
        rounded = round(val, 4)
        return str(rounded)
    except (TypeError, ValueError):
        # Has free symbols or is complex — fall back to pretty string
        s = str(sympy_expr)
        # Clean up common SymPy noise
        s = s.replace("**", "^").replace("sqrt", "√")
        return s


def _clean_latex_for_display(latex_str):
    """
    Convert raw LaTeX into something a non-mathematician can read.
    e.g.  2 \nmid 2  →  2 ∤ 2
    """
    replacements = [
        ("\\nmid",    " ∤ "),
        ("\\mid",     " ∣ "),
        ("\\neq",     " ≠ "),
        ("\\leq",     " ≤ "),
        ("\\geq",     " ≥ "),
        ("\\lt",      " < "),
        ("\\gt",      " > "),
        ("\\approx",  " ≈ "),
        ("\\times",   " × "),
        ("\\div",     " ÷ "),
        ("\\cdot",    " · "),
        ("\\implies", " ⟹ "),
        ("\\iff",     " ⟺ "),
        ("\\subset",  " ⊂ "),
        ("\\supset",  " ⊃ "),
        ("\\in",      " ∈ "),
        ("\\notin",   " ∉ "),
        ("\\infty",   "∞"),
        ("\\pi",      "π"),
        ("\\alpha",   "α"),
        ("\\beta",    "β"),
        ("\\theta",   "θ"),
        ("\\sqrt",    "√"),
        ("\\frac",    ""),   # remove \frac, braces below handle rest
        ("\\left(",   "("),
        ("\\right)",  ")"),
        ("\\left[",   "["),
        ("\\right]",  "]"),
        ("{",         ""),
        ("}",         ""),
        ("\\",        ""),   # strip any remaining backslash commands
    ]
    s = latex_str.strip()
    for old, new in replacements:
        s = s.replace(old, new)
    # Collapse multiple spaces
    s = re.sub(r" {2,}", " ", s).strip()
    return s


def _format_result(sympy_result):
    """
    Turn the raw solve_latex dict into a friendly dict for the frontend.
    Returns: { label, expression, answer, note? }
    """
    t = sympy_result.get("type")

    if t == "error":
        raw = sympy_result.get("result", "")
        return {
            "label": "Couldn't solve",
            "expression": None,
            "answer": "We couldn't make sense of the drawing. Try writing it more clearly.",
            "note": raw if "parse" not in raw.lower() else None,
        }

    if t == "equality_check":
        res = sympy_result["result"]
        is_true = res == "True"
        return {
            "label": "Checking equality",
            "expression": None,
            "answer": "✓ Both sides are equal." if is_true else f"✗ Not equal. {res}",
        }

    if t == "divisibility":
        return {
            "label": "Divisibility check",
            "expression": None,
            "answer": sympy_result["result"],
        }

    if t == "inequality":
        result = sympy_result["result"]
        if isinstance(result, dict):
            lines = [f"{sym} is in the range: {val}" for sym, val in result.items()]
            answer = "\n".join(lines)
        else:
            answer = str(result)
        return {
            "label": "Inequality",
            "expression": None,
            "answer": answer,
        }

    if t == "statement":
        return {
            "label": "Statement",
            "expression": None,
            "answer": sympy_result["result"],
        }

    if t == "equation":
        solutions = sympy_result["result"]
        if not solutions:
            return {"label": "Equation", "expression": None, "answer": "No solutions found."}

        lines = []
        for sym, vals in solutions.items():
            if not vals:
                lines.append(f"{sym}: no solution")
            elif len(vals) == 1:
                # parse the latex val back to get a human form
                try:
                    human_val = _expr_to_human(parse_latex(vals[0]))
                except Exception:
                    human_val = vals[0]
                lines.append(f"{sym}  =  {human_val}")
            else:
                human_vals = []
                for v in vals:
                    try:
                        human_vals.append(_expr_to_human(parse_latex(v)))
                    except Exception:
                        human_vals.append(v)
                lines.append(f"{sym}  =  {',  '.join(human_vals)}")

        return {
            "label": "Equation solved",
            "expression": None,
            "answer": "\n".join(lines),
        }

    if t == "expression":
        simplified = sympy_result.get("simplified", "")
        numeric = sympy_result.get("numeric")
        try:
            human_simplified = _expr_to_human(parse_latex(simplified))
        except Exception:
            human_simplified = simplified

        if numeric is not None:
            # Already a pure number
            try:
                n = float(numeric)
                answer = str(int(n)) if n == int(n) else str(round(n, 6))
            except Exception:
                answer = numeric
        else:
            answer = human_simplified

        return {
            "label": "Simplified",
            "expression": None,
            "answer": answer,
        }

    return {"label": "Result", "expression": None, "answer": str(sympy_result)}


# ── Relation symbol handlers ──────────────────────────────────────────────────

def _safe_parse(s):
    try:
        return parse_latex(s.strip())
    except Exception:
        return None


def _divisibility(a_str, b_str, divides):
    a = _safe_parse(a_str)
    b = _safe_parse(b_str)
    if a is None or b is None:
        sym = "∣" if divides else "∤"
        return {"type": "statement", "result": f"Could not parse operands for '{sym}'"}
    try:
        remainder = simplify(Mod(b, a))
        if remainder == 0:
            verdict = (f"{a} divides {b} ✓" if divides
                       else f"{a} does NOT divide {b} ✗  (they divide evenly)")
        else:
            verdict = (f"{a} does NOT divide {b}  (remainder: {remainder}) "
                       + ("✓" if not divides else "✗"))
        return {"type": "divisibility", "result": verdict}
    except Exception:
        sym = "∣" if divides else "∤"
        return {"type": "statement", "result": f"{a_str.strip()} {sym} {b_str.strip()}"}


def _inequality(a_str, b_str, op):
    a = _safe_parse(a_str)
    b = _safe_parse(b_str)
    if a is None or b is None:
        return {"type": "statement", "result": f"{a_str} {op} {b_str} — could not parse"}
    try:
        ops = {"<=": a <= b, ">=": a >= b, "<": a < b, ">": a > b}
        ineq = ops[op]
        free = sorted(ineq.free_symbols, key=lambda s: s.name)
        if not free:
            return {"type": "inequality", "result": str(ineq)}
        solutions = {str(sym): str(solve(ineq, sym)) for sym in free}
        return {"type": "inequality", "result": solutions}
    except Exception as e:
        return {"type": "inequality", "result": f"{a_str} {op} {b_str} (could not solve: {e})"}


RELATION_HANDLERS = {
    "\\nmid":    lambda a, b: _divisibility(a, b, divides=False),
    "\\mid":     lambda a, b: _divisibility(a, b, divides=True),
    "\\notin":   lambda a, b: {"type": "statement", "result": f"{a.strip()} ∉ {b.strip()} (non-membership)"},
    "\\in":      lambda a, b: {"type": "statement", "result": f"{a.strip()} ∈ {b.strip()} (set membership)"},
    "\\leq":     lambda a, b: _inequality(a, b, "<="),
    "\\geq":     lambda a, b: _inequality(a, b, ">="),
    "\\lt":      lambda a, b: _inequality(a, b, "<"),
    "\\gt":      lambda a, b: _inequality(a, b, ">"),
    "\\neq":     lambda a, b: {"type": "statement", "result": f"{a.strip()} ≠ {b.strip()}"},
    "\\approx":  lambda a, b: {"type": "statement", "result": f"{a.strip()} ≈ {b.strip()} (approximately equal)"},
    "\\implies": lambda a, b: {"type": "statement", "result": f"{a.strip()} ⟹ {b.strip()} (implication)"},
    "\\iff":     lambda a, b: {"type": "statement", "result": f"{a.strip()} ⟺ {b.strip()} (if and only if)"},
    "\\subset":  lambda a, b: {"type": "statement", "result": f"{a.strip()} ⊂ {b.strip()} (subset)"},
    "\\supset":  lambda a, b: {"type": "statement", "result": f"{a.strip()} ⊃ {b.strip()} (superset)"},
}


def _preprocess(latex_str):
    corrected = _apply_ocr_corrections(latex_str)
    cleaned = (corrected
               .replace("\\left(", "(").replace("\\right)", ")")
               .replace("\\left[", "[").replace("\\right]", "]")
               .replace("\\cdot", "*")
               .replace("\\times", "*")
               .replace("\\div", "/")
               .strip())
    for symbol, handler in RELATION_HANDLERS.items():
        if symbol in cleaned:
            parts = cleaned.split(symbol, 1)
            return cleaned, handler(parts[0], parts[1])
    return cleaned, None


def solve_latex(latex_str):
    try:
        cleaned, early = _preprocess(latex_str)
        if early is not None:
            return early

        if "=" in cleaned:
            parts = cleaned.split("=", 1)
            lhs = parse_latex(parts[0].strip())
            rhs = parse_latex(parts[1].strip())
            equation = Eq(lhs, rhs)
            free = sorted(equation.free_symbols, key=lambda s: s.name)
            if not free:
                result = simplify(lhs - rhs)
                truth = "True" if result == 0 else f"Not equal — difference: {sym_latex(result)}"
                return {"type": "equality_check", "result": truth}
            solutions = {}
            for sym in free:
                sol = solve(equation, sym)
                solutions[str(sym)] = [sym_latex(s) for s in sol]
            return {"type": "equation", "result": solutions}
        else:
            expr = parse_latex(cleaned)
            simplified = simplify(expr)
            free = simplified.free_symbols
            if not free:
                numeric = float(simplified.evalf())
                return {"type": "expression", "simplified": sym_latex(simplified), "numeric": str(numeric)}
            return {"type": "expression", "simplified": sym_latex(simplified)}

    except Exception as e:
        return {"type": "error", "result": f"SymPy could not parse or solve: {e}"}


@app.route('/solveServer', methods=['POST'])
def handle_post():
    data = request.get_json()
    raw = data["image"]
    imgData = raw.split(",")[1] if "," in raw else raw

    image_file = io.BytesIO(base64.b64decode(imgData, validate=True))
    image_file.seek(0)

    img = Image.open(image_file)
    img.load()

    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        background = Image.new("RGB", img.size, (255, 255, 255))
        img_rgba = img.convert("RGBA")
        background.paste(img_rgba, mask=img_rgba.split()[3])
        img = background
    else:
        img = img.convert("RGB")

    try:
        latex_str = p2t.recognize_formula(img)
        print("Recognised LaTeX:", latex_str)

        sympy_result = solve_latex(latex_str)
        print("SymPy result:", sympy_result)

        # Build a human-readable version for the frontend
        friendly = _format_result(sympy_result)
        # Also include a cleaned display version of what was recognised
        friendly["expression"] = _clean_latex_for_display(latex_str)

        print("Friendly result:", friendly)
        return jsonify(friendly)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({
            "label": "Error",
            "expression": None,
            "answer": "Something went wrong on the server. Please try again.",
            "note": str(e)
        }), 500


if __name__ == '__main__':
    app.run(debug=True)
