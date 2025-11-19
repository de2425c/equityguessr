import ReactDOM from "react-dom";
import React, { useState } from "react";

import "./styles.scss";
import Header from "./Header";

function App() {
  const [brand, setBrand] = useState("mergegaming");

  return (
    <div id="arcade" className={brand}>
      <Header setBrand={setBrand} />
      <div className="table container">
        <div className="background" />
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
