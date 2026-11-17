import pool from '../data/db.js'
import { Router } from 'express'

const router = Router();


router.get('/fogyo', async(req,res)=>{
    const {min = 3} = req.query

    const minErtek = Number(min)

    const params = [Number(min)];

    if (!Number.isInteger(minErtek) || minErtek <= 0) {
        return res.status(400).json({
            error: "A minimum csak egész szám lehet"
        });
    }
    let sql = `
    SELECT a.id, a.nev, a.ar, a.keszlet
    FROM alkatreszek a
    WHERE a.keszlet < ?
    ORDER BY a.keszlet ASC
`   

    const [eredmeny] = await pool.query(sql,params)

    res.status(200).json(eredmeny)
})


export default router