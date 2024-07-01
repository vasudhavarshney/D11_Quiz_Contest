const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();


function mongoConnect(){
    mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbname:process.env.DataBaseName
    }).then(()=>{
            console.log('Connected to MongoDB');
    }).catch(err => {
            console.error('Error connecting to MongoDB', err);
    })
}


module.exports = mongoConnect;