import pool from '../data/db.js'
import { Router } from 'express'

const router = Router();

router.get('/', async(req,res)=>{

    const {rendszam, statusz} = req.query
    const statuszok =  ['felvéve', 'javítás alatt', 'átadva', 'kész']
    

    let params = []

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
`


    if(rendszam){
        sql += ' WHERE m.rendszam = ?'
        params.push(rendszam)
    }

    if(statusz){
        if(!statuszok.includes(statusz)){
            return res.status(404).json({
                error: 'Érvénytelen statusz'
            })
        }
    }

    sql += params.length ? ' AND m.statusz = ?' : ' WHERE m.statusz = ?';
    params.push(statusz)
    

    sql += ' ORDER BY m.felvetel ASC'

    const [eredmeny] = await pool.query(sql,params)

    res.status(200).json(eredmeny)

})

export default router