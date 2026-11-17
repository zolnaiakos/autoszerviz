import pool from '../data/db.js'
import { Router } from 'express'

const router = Router();


router.get('/fogyo', async(req,res)=>{
    const {min} = req.query || 3

    let params = []

    let sql = `
    SELECT a.id, a.nev, a.ar, a.keszlet
    FROM alkatreszek a
    ORDER BY a.keszlet ASC
    LIMIT 3;
`   

    if(min){
        sql += ' LIMIT 5'
        params.push(min)
    }

    const [eredmeny] = await pool.query(sql,params)

    res.status(200).json(eredmeny)
})


export default router