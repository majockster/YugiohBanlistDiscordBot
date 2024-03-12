const mongoose = require("mongoose")
const schema = mongoose.Schema

const yugiohBanlistSchema = new schema({
    CardType: {
        type: String
    },
    CardName: {
        type: String,
        unique: true
    },
    AdvancedFormat: {
        type: String
    },
    TraditionalFormat: {
        type: String
    },
    Remarks: {
        type: String
    },
}, { strict: false })

yugiohBanlistSchema.index({ CardName: 1 }, { unique: true })

module.exports = mongoose.model("YugiohBanlistCard", yugiohBanlistSchema)