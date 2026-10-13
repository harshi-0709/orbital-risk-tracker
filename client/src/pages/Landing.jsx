import { useEffect, useRef } from "react";
import { mountSatellite } from "../three/mountSatellite";

export default function Landing({ onEnter }) {
  const stageRef = useRef(null);

  // 3D satellite. If the browser has no WebGL the page still works, just without the model.
  useEffect(() => {
    try {
      return mountSatellite(stageRef.current);
    } catch (err) {
      console.warn("3D satellite unavailable:", err);
    }
  }, []);

  return (
    <section className="landing">
      <div className="landing-copy">
        <h1>Orbital Risk<br />Tracker</h1>
        <p className="facts">
          <b>70,543</b> objects in <b>9</b> orbital zones,{" "}
          <b>62</b> alerts open
        </p>
        <button className="cta" onClick={onEnter}>View dashboard</button>
      </div>
      <div
        className="landing-sat"
        ref={stageRef}
        role="img"
        aria-label="A communications satellite with two solar wings and a dish antenna, turning slowly"
      />
    </section>
  );
}