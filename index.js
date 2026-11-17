import express from 'express'
import munkalapok from './routes/munkalapok.js'
import alkatreszek from './routes/alkatreszek.js'
import ugyfelek from './routes/ugyfelek.js'

const app = express();
const port = 3000;

app.use(express.json())


app.use('/munkalapok', munkalapok)
app.use('/alkatreszek', alkatreszek)
app.use('/ugyfelek', ugyfelek)


app.listen(port,()=>{
    console.log(`Server is running: http://localhost:${port}`);
})