import pool from '../data/db.js'
import { Router } from 'express'

const router = Router();


router.get('/', async(req,res)=>{
    let sql = `
    SELECT u.id, u.nev, u.telefon, COUNT(DISTINCT m.id) AS munkalapDb, COALESCE(SUM(m.munkaora * 12000), 0) +
     COALESCE((
        SELECT SUM(f.db * a.ar)
        FROM munkalapok m2
        JOIN felhasznalasok f ON m2.id = f.munkalap_id
        JOIN alkatreszek a ON f.alkatresz_id = a.id
        WHERE m2.ugyfel_id = u.id
    ), 0) AS osszKoltes
    FROM ugyfelek u     
    LEFT JOIN munkalapok m ON u.id = m.ugyfel_id
    GROUP BY u.id, u.nev, u.telefon
    ORDER BY osszKoltes DESC

`

    const [eredmeny] = await pool.query(sql)
    
    res.status(200).json(eredmeny)

})

export default router