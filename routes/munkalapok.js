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
            return res.status(400).json({
                error: 'Érvénytelen statusz'
            })
        }
        sql += params.length ? ' AND m.statusz = ?' : ' WHERE m.statusz = ?';
        params.push(statusz)
    }
    

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

    eredmeny.filter(f => f.alkatreszId !== null).forEach(alkatreszek=>{
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


router.patch('/:id/statusz', async (req, res) => {
    const { id } = req.params
    const { statusz } = req.body

    const [munkalap] = await pool.query(
        'SELECT * FROM munkalapok WHERE id = ?',
        [id]
    )

    if (munkalap.length === 0) {
        return res.status(404).json({
            error: 'A munkalap nem található'
        })
    }

    const statuszok = [
        'felvéve',
        'javítás alatt',
        'kész',
        'átadva'
    ]

    if (!statuszok.includes(statusz)) {
        return res.status(400).json({
            error: 'Érvénytelen státusz'
        })
    }
    const jelenlegi = statuszok.indexOf(munkalap[0].statusz)
    const uj = statuszok.indexOf(statusz)

    if (uj !== jelenlegi + 1) {
        return res.status(409).json({
            error: 'Csak a következő státusz engedélyezett'
        })
    }

    await pool.query(
        'UPDATE munkalapok SET statusz = ? WHERE id = ?',
        [statusz, id]
    )

    const [eredmeny] = await pool.query(
        'SELECT * FROM munkalapok WHERE id = ?',
        [id]
    )

    res.status(200).json(eredmeny[0])
})

//feladat megoldásához AI segítségét használtam
router.post('/:id/alkatreszek', async (req, res) => {
    const { id } = req.params
    const { alkatreszId, db } = req.body ?? {}

    if (!Number.isInteger(Number(db)) || Number(db) < 1) {
    return res.status(400).json({
        error: 'A darabszámnak pozitív egész számnak kell lennie'
        })
    }

    if (!Number.isInteger(Number(id)) || Number(id) < 1 ||
        !Number.isInteger(Number(alkatreszId)) || Number(alkatreszId) < 1 ||
        !Number.isInteger(Number(db)) || Number(db) < 1) {
        return res.status(400).json({
            error: 'Hibás adatok'
        })
    }

    const conn = await pool.getConnection()

    try {
        await conn.beginTransaction()

        const [munkalap] = await conn.query(
            'SELECT * FROM munkalapok WHERE id = ? FOR UPDATE',
            [id]
        )

        if (munkalap.length === 0) {
            await conn.rollback()
            return res.status(404).json({
                error: 'A munkalap nem található'
            })
        }

        if (munkalap[0].statusz === 'kész' ||
            munkalap[0].statusz === 'átadva') {
            await conn.rollback()
            return res.status(409).json({
            error: 'A munkalap már lezárt'
            })
        }

        const [alkatresz] = await conn.query(
            'SELECT * FROM alkatreszek WHERE id = ? FOR UPDATE',
            [alkatreszId]
        )

        if (alkatresz.length === 0) {
            await conn.rollback()
            return res.status(404).json({
                error: 'Az alkatrész nem található'
            })
        }

        if (alkatresz[0].keszlet < db) {
            await conn.rollback()
            return res.status(409).json({
                error: 'Nincs elegendő alkatrész a készleten'
            })
        }

        const [felhasznalas] = await conn.query(`
            SELECT * FROM felhasznalasok
            WHERE munkalap_id = ? AND alkatresz_id = ?
        `, [id, alkatreszId])

        if (felhasznalas.length > 0) {
            await conn.query(`
                UPDATE felhasznalasok
                SET db = db + ?
                WHERE munkalap_id = ? AND alkatresz_id = ?
            `, [db, id, alkatreszId])
        } else {
            await conn.query(`
                INSERT INTO felhasznalasok
                (munkalap_id, alkatresz_id, db)
                VALUES (?, ?, ?)
            `, [id, alkatreszId, db])
        }

        await conn.query(`
            UPDATE alkatreszek
            SET keszlet = keszlet - ?
            WHERE id = ?
        `, [db, alkatreszId])

        await conn.commit()

        const [m] = await pool.query(`
            SELECT *
            FROM munkalapok
            WHERE id = ?
        `, [id])

        const [a] = await pool.query(`
            SELECT
                a.id AS alkatreszId,
                a.nev AS alkatresz,
                a.ar,
                f.db,
                (a.ar * f.db) AS reszosszeg
            FROM felhasznalasok f
            JOIN alkatreszek a ON f.alkatresz_id = a.id
            WHERE f.munkalap_id = ?
        `, [id])

        const munkadij = Number(m[0].munkaora) * 12000

        const alkatreszDij = a.reduce(
            (osszeg, elem) => osszeg + Number(elem.reszosszeg), 0
        )

        const vegosszeg = munkadij + alkatreszDij

        res.status(201).json({
            ...m[0],
            alkatreszek: a,
            munkadij,
            alkatreszDij,
            vegosszeg
        })

    } catch (error) {
        await conn.rollback()
        res.status(500).json({
            error: 'Szerverhiba'
        })
    } finally {
        conn.release()
    }
})

export default router