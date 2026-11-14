
const display = document.getElementById("display");
const result = document.getElementById("result");
const historyList = document.getElementById("historyList");
const angleButton = document.getElementById("angleMode");

let angleMode = "DEG";
let lastAnswer = 0;
let history = [];

// The display is readonly: the mobile keyboard cannot open from it.
display.readOnly = true;
display.setAttribute("inputmode", "none");

// Prevent keypad buttons from taking focus on touch devices.
document.querySelectorAll(".key").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
  });

  button.addEventListener("click", () => {
    const value = button.dataset.value;
    const action = button.dataset.action;

    if (action === "clear") clearDisplay();
    else if (action === "delete") deleteLast();
    else if (action === "calculate") calculate();
    else if (value) insertValue(value);
  });
});

function insertValue(value) {
  const start = display.selectionStart ?? display.value.length;
  const end = display.selectionEnd ?? display.value.length;

  const updated =
    display.value.slice(0, start) +
    value +
    display.value.slice(end);

  display.value = updated;

  const cursor = start + value.length;
  try {
    display.setSelectionRange(cursor, cursor);
  } catch (_) {}

  updatePreview();
}

function clearDisplay() {
  display.value = "";
  result.textContent = "0";
}

function deleteLast() {
  const start = display.selectionStart ?? display.value.length;
  const end = display.selectionEnd ?? display.value.length;

  if (start !== end) {
    display.value =
      display.value.slice(0, start) +
      display.value.slice(end);
    try {
      display.setSelectionRange(start, start);
    } catch (_) {}
  } else if (start > 0) {
    display.value =
      display.value.slice(0, start - 1) +
      display.value.slice(end);
    try {
      display.setSelectionRange(start - 1, start - 1);
    } catch (_) {}
  }

  updatePreview();
}

function toggleAngleMode() {
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  angleButton.textContent = angleMode;
  updatePreview();
}

angleButton.addEventListener("click", toggleAngleMode);

function makeScope(xValue) {
  const toRadians = (value) =>
    angleMode === "DEG" ? value * Math.PI / 180 : value;

  return {
    x: xValue,
    Ans: lastAnswer,
    sin: (value) => Math.sin(toRadians(value)),
    cos: (value) => Math.cos(toRadians(value)),
    tan: (value) => Math.tan(toRadians(value)),
    log: (value) => Math.log10(value),
    ln: (value) => Math.log(value),
    sqrt: (value) => Math.sqrt(value)
  };
}

function evaluateExpression(expression, xValue = 0) {
  if (!window.math) {
    throw new Error("Math library did not load. Check your internet connection.");
  }

  const scope = makeScope(xValue);
  return math.evaluate(expression, scope);
}

function formatNumber(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "Error";
    return Number(value.toPrecision(12)).toString();
  }

  return String(value);
}

function updatePreview() {
  const expression = display.value.trim();

  if (!expression) {
    result.textContent = "0";
    return;
  }

  try {
    const value = evaluateExpression(expression);
    result.textContent = formatNumber(value);
  } catch (_) {
    result.textContent = "…";
  }
}

function calculate() {
  const expression = display.value.trim();
  if (!expression) return;

  try {
    const value = evaluateExpression(expression);
    const formatted = formatNumber(value);

    if (formatted === "Error") throw new Error("Invalid result");

    result.textContent = formatted;
    lastAnswer = value;

    history.unshift({
      expression,
      result: formatted
    });

    history = history.slice(0, 20);
    renderHistory();
  } catch (error) {
    result.textContent = "Error";
  }
}

function renderHistory() {
  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML =
      '<p class="empty-history">Your calculations will appear here.</p>';
    return;
  }

  history.forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-item";

    const expression = document.createElement("span");
    expression.className = "history-expression";
    expression.textContent = item.expression;

    const answer = document.createElement("span");
    answer.className = "history-result";
    answer.textContent = item.result;

    row.append(expression, answer);

    row.addEventListener("click", () => {
      display.value = item.expression;
      result.textContent = item.result;
    });

    historyList.appendChild(row);
  });
}

document.getElementById("clearHistory").addEventListener("click", () => {
  history = [];
  renderHistory();
});

// Calculator tabs
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => {
      item.classList.remove("active");
    });

    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });

    tab.classList.add("active");
    document.getElementById(tab.dataset.page).classList.add("active");

    if (tab.dataset.page === "graph") {
      setTimeout(() => {
        if (window.Plotly) Plotly.Plots.resize("plot");
      }, 100);
    }
  });
});

// Graph plotting
document.getElementById("plotButton").addEventListener("click", plotGraph);

function plotGraph() {
  const equation = document.getElementById("equation").value.trim();
  const min = Number(document.getElementById("xMin").value);
  const max = Number(document.getElementById("xMax").value);
  const error = document.getElementById("graphError");

  error.textContent = "";

  if (!equation) {
    error.textContent = "Please enter an equation first.";
    return;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    error.textContent = "Enter a valid X range. Minimum must be smaller than maximum.";
    return;
  }

  if (!window.Plotly || !window.math) {
    error.textContent = "Graph libraries did not load. Check your internet connection.";
    return;
  }

  try {
    const compiled = math.compile(equation);
    const xValues = [];
    const yValues = [];
    const steps = 500;

    for (let i = 0; i <= steps; i++) {
      const x = min + (max - min) * i / steps;
      const y = compiled.evaluate(makeScope(x));

      xValues.push(x);
      yValues.push(typeof y === "number" && Number.isFinite(y) ? y : null);
    }

    Plotly.newPlot("plot", [{
      x: xValues,
      y: yValues,
      type: "scatter",
      mode: "lines",
      line: { width: 3, color: "#168fbd" }
    }], {
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#ffffff",
      margin: { t: 20, r: 20, b: 50, l: 55 },
      xaxis: { title: "x", zeroline: true, gridcolor: "#e5e9ef" },
      yaxis: { title: "y", zeroline: true, gridcolor: "#e5e9ef" }
    }, {
      responsive: true,
      displaylogo: false
    });
  } catch (err) {
    error.textContent = "Unable to plot this equation. Check the mathematical expression.";
  }
}

// Register the PWA service worker.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch((error) => console.error("Service worker registration failed:", error));
  });
}

renderHistory();
