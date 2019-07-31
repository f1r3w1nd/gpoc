import React, { useEffect, useRef } from 'react';
import draw from './d3-svg';
import graph from './api';
import './App.css';

const App = () => {
  const svgRef = useRef(null);
  useEffect(() => {
    if (svgRef.current !== null) {
      draw(svgRef.current, graph);
    }
  }, [svgRef]);

  return (
    <div className="layout_wrapper">
      <div className="l_main_component">
        <svg ref={svgRef} className="graph" width="1268" height="1024" />
      </div>
    </div>
  );
}

export default App;
