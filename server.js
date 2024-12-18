import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import AuthRoutes from './routes/auth.routes.js';


dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// cors
app.use(cors());


//api way
app.use('/user', AuthRoutes)
// listen on port
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
  
 export default app;