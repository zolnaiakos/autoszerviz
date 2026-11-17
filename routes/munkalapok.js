import pool from '../data/db.js'
import { Router } from 'express'

const router = Router();

router.get('/', async(req,res)=>{
    let sql = `
    SELECT m.id, m.rendszam, u.nev AS ugyfel, DATE_FORMAT(m.felvetel, '%Y-%m-%d') AS felvetel , m.leiras, m.statusz, m.munkaora, m.munkaora * 12000 AS munkaDij,
    (SELECT COALESCE(SUM(f.db * a.ar), 0) 
    FROM felhasznalasok f 
    JOIN alkatreszek a ON a.id = f.alkatresz_id WHERE f.munkalap_id = m.id) AS alkatreszDij,
    m.munkaora * 12000 +
    (SELECT COALESCE(SUM(f.db * a.ar), 0)
    FROM felhasznalasok f
    JOIN alkatreszek a ON a.id = f.alkatresz_id
    WHERE f.munkalap_id = m.id) AS vegosszeg
    FROM munkalapok m 
    LEFT JOIN ugyfelek u ON m.ugyfel_id = u.id  
    ORDER BY m.felvetel ASC
`

    const [eredmeny] = await pool.query(sql)

    res.status(200).json(eredmeny)

})

export default router