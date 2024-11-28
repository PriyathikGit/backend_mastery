import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [jokes, setJokes] = useState([])
  useEffect(() => {
    axios.get('/api/jokes')
      .then((res) => setJokes(res.data))
      .catch((err) => console.log(err));
  }, [])
  return (
    <>
      <p>Jokes: {jokes.length}</p>
      {jokes.map((item) => (
        <div key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.joke}</p>
        </div>
      ))}
    </>
  )
}

export default App
