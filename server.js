const express = require('express');
const bodyParser= require('body-parser');
const bcrypt= require('bcrypt-nodejs');
const cors= require('cors');
const knex=require('knex');
const Clarifai=require('clarifai');

const db = knex({
   client: 'pg',
   connection:{
    connectionString: process.env.DATABASE_URL,
    SSL: true,  
   }
})

const ClarifaiApp= new Clarifai.App({
  apiKey: 'd22f26a69db94d5d9c845fcea6713dd5'
});

const app = express();


 app.use(cors())
 app.use(bodyParser.json());

 app.get('/', (req, res)=>{
 res.send("app is running");
 })



 app.post('/signin',(req, res)=>{
    db.select('email', 'hash').from('login')
      .where('email','=', req.body.email)
      .then (data =>{
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        if (isValid) { 
           return db.select('*')
              .from('users')
              .where('email','=', req.body.email)
              .then(user=>{
                res.json(user[0])
              })
              .catch (err=>{res.status(400).json('Cant get user')})
        }
        else {
            res.status(400).json('There no such user!!')
        }
      })
      .catch(err=>res.status(400).json('Enter Valid informations'))

})

 app.post('/register',(req, res)=>{
    //distructring and hashing
    const {email, name, password }= req.body;
    const hash = bcrypt.hashSync(password);

    if (!email || !name || !password){
        return res.status(400).json('Enter valid values!')
    }

    db.transaction(trx =>{
        trx.insert({
            email: email,
            hash: hash
        })
            .into('login')
            .returning('email')
            .then(loginEmail=>{
               return trx('users')
                .returning('*')
                .insert({        
                    name: name,
                    email: loginEmail[0], 
                    joined: new Date()
                })
            .then(user => {
                res.json(user[0])
                })
            })
    .then(trx.commit)
    .catch(trx.rollback);      
        }) 
    .catch(err => { res.status(400).json('user already exits; enable to reg')})
})

 app.get('/profile/:id', (req, res)=>{
    const { id } = req.params;
    let found = false;

    db.select('*')
      .from('users') 
      .where({
        id: id
      })
      .then( user =>{
        if(user.length){
            res.json(user[0])
        }
        else{
            res.json('no such user!')
        }
      })
 })

 app.post('/imageurl', (req, res)=>{
    ClarifaiApp.models
        .predict(
        Clarifai.FACE_DETECT_MODEL,
        req.body.input)

        .then(data=>
            res.json(data))
        .catch(err=> res.status(400).json('api err'))
 })
  
 

 app.listen(process.env.PORT || 3001, ()=>{
    console.log("server is running")
 })


