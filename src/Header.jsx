import React from "react";

import Button from "./Button";

export default function Header({ setBrand }) {
  return (
    <div className="header">
      <Button setBrand={() => setBrand("allpro")}>All Pro</Button>
      <Button setBrand={() => setBrand("betusa")}>Bet USA</Button>
      <Button setBrand={() => setBrand("carbonpoker")}>Carbon Poker</Button>
      <Button setBrand={() => setBrand("linesmaker")}>Linesmaker</Button>
      <Button setBrand={() => setBrand("mergegaming")}>Mergegaming</Button>
      <Button setBrand={() => setBrand("playersonly")}>Playersonly</Button>
      <Button setBrand={() => setBrand("sportsbook")}>Sportsbook</Button>
    </div>
  );
}
