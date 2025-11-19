import React from "react";

export default function Button(props) {
  const { children, setBrand } = props;

  return <button onClick={setBrand}>{children}</button>;
}
