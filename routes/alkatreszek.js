import pool from '../data/db.js'
import { Router } from 'express'

const router = Router();


router.get('/', async(req,res)=>{
    let sql = `
    SELECT a.id, a.nev, a.ar, a.keszlet
    FROM alkatreszek a    
`
})


export default router