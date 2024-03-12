require('dotenv').config(); 

const mongoUri = process.env.MONGO_DB_URI

const mongoose = require("mongoose")
const banlistData = require("./YugiohBanlistSchema")

function ConnectToDb(){
    mongoose
    .connect(mongoUri, {autoIndex: true, family: 4})
    .then(() => console.log("Connected to MongoDB"))
    .catch(e => console.log(e))
}

function Disconnect(){
    mongoose.disconnect()
}

function AddBanlistCardToDb(banlistCard){
    try{
        const newBanlistData = new banlistData(banlistCard)
        return newBanlistData.save().catch(e => console.log(e))
    }
    catch(e){
        console.error(e)
    }
}

async function GetBanlistCards(filter, sort = false){
    const data = sort 
        ? await banlistData.find(filter).sort('CardType') 
        : await banlistData.find(filter) 
    return data
}

module.exports = { ConnectToDb, AddBanlistCardToDb, Disconnect, GetBanlistCards }


