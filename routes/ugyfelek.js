import pool from '../data/db.js'
import { Router } from 'express'

const router = Router();


router.get('/', async(req,res)=>{
    let sql = `
    SELECT u.id, u.nev, u.telefon, COUNT(m.ugyfel_id) AS munkalapDb, COALESCE(SUM(m.munka_ora*12000), 0) AS osszKoltes
    FROM ugyfelek u     
    LEFT JOIN munkalapok m ON u.id = m.ugyfel_id
    GROUP BY u.id, u.nev, u.telefon
    ORDER BY osszKoltes DESC

`

    const [eredmeny] = await pool.query(sql)
    
    res.status(200).json(eredmeny)

})

export default router