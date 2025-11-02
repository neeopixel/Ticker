import React from 'react';

interface HelloProps {
  name?: string;
}

const Hello: React.FC<HelloProps> = ({ name }) => {
  return <h1>Hello, {name ? name : 'World'}!</h1>;
};

export default Hello;