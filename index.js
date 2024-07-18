const express = require('express');
const app = express();
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// middlewares
app.use(express.json())
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.avssyq6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const createUserCollection = client.db('mobileFinancial').collection("users")
    const sendMoneyInfoCollection = client.db('mobileFinancial').collection("sendMoneyInfo");
    const sendMoneyCollection = client.db('mobileFinancial').collection("sendMoney");
    


    // JWT related api
        app.post('/jwt' , async(req , res) => {
                const user = req.body;
                const token = jwt.sign(user , process.env.TOKEN_SECRET , {
                        expiresIn : '1hr'
                })
                res.send({token})
        })
        // middleware
        const verifyToken = (req , res , next) => {
            // console.log('inside verify token' , req.headers.authorization);
            if(!req.headers.authorization){
                return res.status(401).send({message : 'forbidden access'})
            }
            const token = req.headers.authorization.split(" ")[1];
            
            jwt.verify(token , process.env.TOKEN_SECRET , (err , decoded) => {
                if(err){
                     return res.status(401).send({message : 'forbidden access'})
                }

                req.decoded = decoded;
                next();
            })
        }


    // user related api
    app.get("/user" , async(req , res) => {
            const email = req.query.email;
            const query = {email : email};
            const result = await createUserCollection.findOne(query);
            console.log(result);
            res.send(result);
            
    } )
    app.get('/balance' ,verifyToken, async(req , res) => {
        // console.log("headers" , req.headers)
        const email = req.query.email;
        const query = {email : email};
        const result = await createUserCollection.findOne(query);
        
        const balance = result?.balance;
        console.log(balance)
        res.send({balance});
    })
    
    app.get('/users' , async(req , res) => {
        const result = await createUserCollection.find().toArray();
        res.send(result)
    })
    app.patch('/user/:id' , async(req , res) => {
            const id = req.params.id;
            const filter = {_id : new ObjectId(id)};
            const updateDoc = {
                $set : {
                    status : 'approved',
                    balance : '40'
                }
            }
            const result = await createUserCollection.updateOne(filter , updateDoc);
            res.send(result);
            
    }) 
    app.post('/createUser' , async(req , res) => {
            const info = req.body;
            // console.log(info);
            

            const saltRound = 10;
            const pin = info?.pin;
            const hash_password = await bcrypt.hash(pin , saltRound)

            const userInfo ={
                name : info.name,
                email : info.email,
                pin : hash_password,
                number : info.number,
                status : info.status,
                balance : info.balance
        }

            const result = await createUserCollection.insertOne(userInfo);
            res.send(result);
    })

    app.post('/login' , async(req , res) => {
            const info = req.body;
            
            const email = info?.email;
            const query ={email}
            
            const userData = await createUserCollection.findOne(query);
            
            const name = userData?.name;

            const pin = userData?.pin;
            
        const isMatch = await bcrypt.compare(info?.pin , pin) ;
            if(isMatch){
                    res.send({pin : isMatch ,name :  name}) 
            }
            else{
                res.send({error : 'pin does not match'})
            }
    })
    // send money
    app.get('/haveNumber/:number' ,verifyToken, async(req , res) => {
      
        const number = req.params.number;
        console.log(number)
        const query = {number : number}
        const result = await createUserCollection.findOne(query);
        console.log("send money number " , result);


        res.send(result);
    })
    app.post('/sendMoney/:number' ,verifyToken, async(req , res) => {
        const number = req.params.number;
        console.log('number' , number)
        const amount = req.query.amount;
        const info ={
            number : number,
            balance : amount
        }
        const result = await createUserCollection.insertOne(info);
        res.send(result);

    })
    app.patch('/sendMoney/:number' ,verifyToken, async(req , res) => {
        const number = req.params.number;
        const amount = parseInt(req.query.amount);

        const filter = {number : number};
        const result = await createUserCollection.findOne(filter);

        const preAmount = parseInt(result.balance);
        const newAmount = preAmount + amount;

        console.log('amount' , amount , 'number' , number , 'result' ,result , 'preAmount' , preAmount , 'newAmount' , newAmount)

        const updateDoc ={
            $set : {
                balance : newAmount
            }
        }
        const result1 = await createUserCollection.updateOne(filter , updateDoc);
        res.send(result1)

        
    })
    app.post('/sendMoneyInfo' ,verifyToken, async(req , res) => {
        const info = req.body;
        const result = await sendMoneyInfoCollection.insertOne(info);
        res.send(result);
    })
    app.get('/sendMoneyInfo' , async(req , res) => {
        const number = req.query.number;
        const query = {phoneNumber : number};

        const result = await sendMoneyInfoCollection.findOne(query);
        res.send(result);
    })
    app.get('/pinMatch/:email/:pin',verifyToken, async(req ,res) => {
      const infoEmail = req.params.email;
      const infoPin = req.params.pin

            
            const email = infoEmail;
            const query ={email}
            
            const userData = await createUserCollection.findOne(query);
            
            // const name = userData?.name;

            const pin = userData?.pin;
      const isMatch = await bcrypt.compare(infoPin , pin) ;
      // ,name :  name
      if(isMatch){
              res.send({pin : isMatch}) 
      }
      else{
          res.send({error : 'Sorry! Pin does not match'})
      }
    })








  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/' , (req , res) =>  {
    console.log("Hello world")
})



app.listen(port  , () => {
       console.log( `The server is running port on ${port}`)
})