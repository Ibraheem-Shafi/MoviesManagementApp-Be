const express = require("express");
const cors = require("cors");
const http = require('http');
const PORT = 5000;
require("dotenv").config();
require('./Database/config');
const Routes = require('./Routes/Router');

const app = express();
const server = http.createServer(app);

// const corsOptions = {
//   // origin: 'https://frontend-kappa-ten-32.vercel.app',
//   origin: 'http://localhost:3000',
//   credentials: true,
// };

app.use(cors());

app.use(express.json());
app.use(Routes);

app.get('/', (req, res) => {
    res.status(200).json("Server is running")
});

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
