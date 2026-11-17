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

router.get('/:id', async(req,res)=>{
    //feladat megoldásához használtam AIt
    
    const {id} = req.params

    let sql = `
    SELECT 
    m.id, 
    m.rendszam, 
    m.felvetel, 
    m.leiras, 
    m.statusz, 
    u.id AS ugyfelId, 
    u.nev AS ugyfelNev, 
    u.telefon AS telefon, 
    m.munkaora, 
    a.id AS alkatreszId, 
    a.nev AS alkatreszNev, 
    COALESCE(SUM(f.db), 0) AS db, 
    a.ar, COALESCE(SUM(f.db * a.ar), 0) AS Osszeg,
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
    LEFT JOIN felhasznalasok f ON f.munkalap_id = m.id
    LEFT JOIN alkatreszek a ON a.id = f.alkatresz_id
    WHERE m.id = ?
    GROUP BY m.id, m.rendszam, m.felvetel, m.leiras, m.statusz, u.id, u.nev, u.telefon, m.munkaora, a.id, a.nev, a.ar
    ORDER BY a.nev ASC
`
    const [eredmeny] = await pool.query(sql,[id])


    if (eredmeny.length === 0) {
        return res.status(404).json({ error: "Munkalap nem található" });
    }

    const munkalapok = {
        id: eredmeny[0].id,
        rendszam : eredmeny[0].rendszam,
        felvetel : eredmeny[0]. felvetel,
        leiras: eredmeny[0].leiras,
        statusz: eredmeny[0].statusz,
    

    ugyfel: {
        id: eredmeny[0].ugyfelId,
        nev: eredmeny[0].ugyfelNev,
        telefon: eredmeny[0].telefon
    },

    munkaora : eredmeny[0].munkaora,

    alkatreszek : [],

    munkadij: Number(eredmeny[0].munkaora) * 12000,
    alkatreszDij: Number(eredmeny[0].alkatreszDij),
    vegosszeg: Number(eredmeny[0].munkaora) * 12000 +
        Number(eredmeny[0].alkatreszDij)
};

    eredmeny.forEach(alkatreszek=>{
        munkalapok.alkatreszek.push({
            id : alkatreszek.alkatreszId,
            nev: alkatreszek.alkatreszNev,
            db:  Number(alkatreszek.db),
            ar:  Number(alkatreszek.ar),
            osszeg: Number(alkatreszek.Osszeg)
        })
    })

    res.status(200).json(munkalapok)

})

export default router