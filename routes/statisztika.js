import pool from '../data/db.js'
import { Router } from 'express'

const router = Router();

router.get('/statuszok', async(req,res)=>{
    let sql = `
    SELECT m.statusz, COUNT(*) AS db
    FROM  munkalapok m
    GROUP BY m.statusz
    ORDER BY FIELD (m.statusz, 'felvéve', 'javítás alatt', 'kész', 'átadva')   
`

    const [eredmeny] = await pool.query(sql)

    res.status(200).json(eredmeny)

})


router.get('/alkatreszek', async(req,res)=>{
    let sql = `
    SELECT a.nev AS alkatresz, SUM(f.db) AS felhasznaltDb, SUM(f.db * a.ar) AS bevetel
    FROM alkatreszek a
    INNER JOIN felhasznalasok f ON a.id = f.alkatresz_id
    GROUP BY a.id, a.nev
    ORDER BY bevetel DESC
`

    const [eredmeny] = await pool.query(sql)

    res.status(200).json(eredmeny)
})

export default router