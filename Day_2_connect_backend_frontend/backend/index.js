import express from 'express';

const app = express();

// app.get('/', (req, res) => {
//   res.send('server is ready');
// });

app.get('/api/jokes', (req, res) => {
  const jokes = [
    {
      id: 1,
      title: 'first joke',
      joke: 'this is first joke',
    },
    {
      id: 2,
      title: 'second joke',
      joke: 'this is second joke',
    },
    {
      id: 3,
      title: 'third joke',
      joke: 'this is third joke',
    },
    {
      id: 4,
      title: 'fourth joke',
      joke: 'this is fourth joke',
    },
    {
      id: 5,
      title: 'fifth joke',
      joke: 'this is fifth joke',
    },
  ];
  res.send(jokes);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
