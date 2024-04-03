require('dotenv').config(); 

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js')
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]})
const dbHandler = require("./Persistence/YugiohBanlistDataHandler")

const channelId = process.env.CHANNEL_ID
const commands = [
    {
        name: 'get_all_banlist',
        description: 'Gets the entire banlist'
    },
    {
        name: 'get_updated',
        description: 'Gets all updated cards in the banlist'
    },
    {
        name: 'get_banned',
        description: 'Gets all banned cards in the banlist'
    },
    {
        name: 'get_limited',
        description: 'Gets all limited cards in the banlist'
    },
    {
        name: 'get_semi_limited',
        description: 'Gets all semi-limited cards in the banlist'
    },
    {
        name: 'get_unlimited',
        description: 'Gets all unlimited cards in the banlist'
    }
]
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
    commands.forEach(x => client.application.commands.create(x))
})

const { emitter } = require('./Events/UpdateEventHandler')
const yugiohScrapper = require("./YugiohScrapper/YugiohScrapper")

const callback = async () => {
    let data = await dbHandler.GetBanlistCards(updatedFilter, true)
    await SendUpdatedCardData(data, interaction)
}

emitter.on('change', callback)

yugiohScrapper.ScrapeYugiohWebpage()

const updatedFilter = {
    $or: [
        { Remarks: /New/ },
        { Remarks: /Was/}
    ]
}

const bannedFilter = {AdvancedFormat: 'Forbidden'}
const limitedFilter = {AdvancedFormat: 'Limited'}
const semiLimitedFilter = {AdvancedFormat: 'Semi-Limited'}
const unlimitedFilter = {AdvancedFormat: 'No Longer On List'}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()){
        console.log('not a command')
        return
    }
    const { commandName } = interaction
    let data = null
    switch (commandName) {
        case 'get_updated':
            console.log('Attempting to get updated cards...')
            data = await dbHandler.GetBanlistCards(updatedFilter, true)
            await SendUpdatedCardData(data, interaction)
            break
        case 'get_banned':
            console.log('Attempting to get banned cards...')
            data = await dbHandler.GetBanlistCards(bannedFilter)
            await SendBannedBanlistData(data)
            break
        case 'get_limited':
            console.log('Attempting to get limited cards...')
            data = await dbHandler.GetBanlistCards(limitedFilter)
            await SendLimitedBanlistData(data)
            break
        case 'get_semi_limited':
            console.log('Attempting to get semi-limited cards...')
            data = await dbHandler.GetBanlistCards(semiLimitedFilter)
            await SendSemiLimitedBanlistData(data)
            break
        case 'get_unlimited':
            console.log('Attempting to get unlimited cards...')
            data = await dbHandler.GetBanlistCards(unlimitedFilter)
            await SendUnlimitedBanlistData(data)
            break
        case 'get_all_banlist':
            console.log('Attempting to get all banlist...')
            data = await dbHandler.GetBanlistCards({})
            await SendBanlistDataToServer(data)
            break
        default:
            break
    }
})

const rest = new REST({version: '10'}).setToken(process.env.CLIENT_TOKEN);
(async () => {
    try{
        console.log('Started refreshing application commands')
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, channelId),
            {body: commands}
        )
        console.log('Successfully reloaded commands')
    }
    catch(e){
        console.error(e)
    }
})()

function SendBanlistDataToServer(data){
    console.log('attempting to send to discord server... ')
    SendBannedBanlistData(data)

    SendLimitedBanlistData(data)

    SendSemiLimitedBanlistData(data)

    SendUnlimitedBanlistData(data)
}

async function SendUpdatedCardData(data, interaction){
    const cardData = data.filter(x => x.Remarks.includes('New') || x.Remarks.includes('Was'))
    let cardInfo = []
    let cardType = cardData[0].CardType
    cardInfo.push({CardType: GetCardType(cardType)})
    cardData.forEach(x => {
        if (cardType != x.CardType){
            cardType = x.CardType
            cardInfo.push({CardType: GetCardType(cardType)})
        }
        cardInfo.push({CardName: x.CardName})
    })

    await interaction.reply('**NEWLY UPDATED CARDS**\n' + JSON.stringify(cardInfo).split(',').join("\n"))
}

function GetCardType(cardType){
    switch (cardType) {
        case 'Monster/Effect':
            return `**${cardType.toUpperCase()}**` + ' :orange_square: :white_check_mark:'
        case 'Monster/Fusion':
            return `**${cardType.toUpperCase()}**` + ' :purple_square: :white_check_mark:'
        case 'Monster/Link':
            return `**${cardType.toUpperCase()}**` + ' :blue_square: :white_check_mark:'
        case 'Monster/Synchro':
            return `**${cardType.toUpperCase()}**` + ' :white_large_square: :white_check_mark:'
        case 'Monster/Xyz':
            return `**${cardType.toUpperCase()}**` + ' :black_large_square: :white_check_mark:'
        case 'Spell':
            return `**${cardType.toUpperCase()}**` + ' :green_square: :white_check_mark:'
        case 'Trap':
            return `**${cardType.toUpperCase()}**` + ' :red_square: :white_check_mark:'
        default:
            return cardType;
    }
}

function SendBanlistCardData(data, cardTypeFilter, status){
    const cardData = data.filter(x => x.CardType == cardTypeFilter && x.AdvancedFormat == status)
    let cardInfo = []
    cardData.forEach(x => {
        cardInfo.push({
            CardName: (x.Remarks.includes("New") || x.Remarks.includes("Was")) 
                ? `**${x.CardName}** :white_check_mark:` 
                : x.CardName
        })
    })
    console.log(JSON.stringify(cardInfo).length)   
    client.channels.cache.get(`${channelId}`).send(JSON.stringify(cardInfo).split(',').join("\n"))
}

function SendBannedBanlistData(data){
    client.channels.cache.get(`${channelId}`).send('**:prohibited: BANNED MONSTER EFFECT :orange_square:**\n')
    SendBanlistCardData(data, "Monster/Effect", "Forbidden")
    client.channels.cache.get(`${channelId}`).send('\n**:prohibited: BANNED MONSTER FUSION :purple_square:**\n')
    SendBanlistCardData(data, "Monster/Fusion", "Forbidden")
    client.channels.cache.get(`${channelId}`).send('\n**:prohibited: BANNED MONSTER LINK :blue_square:**\n')
    SendBanlistCardData(data, "Monster/Link", "Forbidden")
    client.channels.cache.get(`${channelId}`).send('\n**:prohibited: BANNED MONSTER SYNCHRO :white_large_square:**\n')
    SendBanlistCardData(data, "Monster/Synchro", "Forbidden")
    client.channels.cache.get(`${channelId}`).send('\n**:prohibited: BANNED MONSTER XYZ :black_large_square:**\n')
    SendBanlistCardData(data, "Monster/Xyz", "Forbidden")
    client.channels.cache.get(`${channelId}`).send('\n**:prohibited: BANNED SPELLS :green_square:**\n')
    SendBanlistCardData(data, "Spell", "Forbidden")
    client.channels.cache.get(`${channelId}`).send('\n**:prohibited: BANNED TRAPS :red_square:**\n')
    SendBanlistCardData(data, "Trap", "Forbidden")
}

function SendLimitedBanlistData(data){
    client.channels.cache.get(`${channelId}`).send('**:one: LIMITED MONSTER VANILLA :yellow_square:**\n')
    SendBanlistCardData(data, "Monster", "Limited")
    client.channels.cache.get(`${channelId}`).send('**:one: LIMITED MONSTER EFFECT :orange_square:**\n')
    SendBanlistCardData(data, "Monster/Effect", "Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:one: LIMITED MONSTER FUSION :purple_square:**\n')
    SendBanlistCardData(data, "Monster/Fusion", "Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:one: LIMITED MONSTER LINK :blue_square:**\n')
    SendBanlistCardData(data, "Monster/Link", "Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:one: LIMITED MONSTER SYNCHRO :white_large_square:**\n')
    SendBanlistCardData(data, "Monster/Synchro", "Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:one: LIMITED MONSTER XYZ :black_large_square:**\n')
    SendBanlistCardData(data, "Monster/Xyz", "Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:one: LIMITED SPELLS :green_square:**\n')
    SendBanlistCardData(data, "Spell", "Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:one: LIMITED TRAPS :red_square:**\n')
    SendBanlistCardData(data, "Trap", "Limited")
}

function SendSemiLimitedBanlistData(data){
    client.channels.cache.get(`${channelId}`).send('**:two: SEMI-LIMITED MONSTER EFFECT :orange_square:**\n')
    SendBanlistCardData(data, "Monster/Effect", "Semi-Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:two: SEMI-LIMITED MONSTER FUSION :purple_square:**\n')
    SendBanlistCardData(data, "Monster/Fusion", "Semi-Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:two: SEMI-LIMITED MONSTER LINK :blue_square:**\n')
    SendBanlistCardData(data, "Monster/Link", "Semi-Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:two: SEMI-LIMITED MONSTER SYNCHRO :white_large_square:**\n')
    SendBanlistCardData(data, "Monster/Synchro", "Semi-Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:two: SEMI-LIMITED MONSTER XYZ :black_large_square:**\n')
    SendBanlistCardData(data, "Monster/Xyz", "Semi-Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:two: SEMI-LIMITED SPELLS :green_square:**\n')
    SendBanlistCardData(data, "Spell", "Semi-Limited")
    client.channels.cache.get(`${channelId}`).send('\n**:two: SEMI-LIMITED TRAPS :red_square:**\n')
    SendBanlistCardData(data, "Trap", "Semi-Limited")
}

function SendUnlimitedBanlistData(data){
    client.channels.cache.get(`${channelId}`).send('**:three: UNLIMITED MONSTER EFFECT :orange_square:**\n')
    SendBanlistCardData(data, "Monster/Effect", "No Longer On List")
    client.channels.cache.get(`${channelId}`).send('\n**:three: UNLIMITED MONSTER FUSION :purple_square:**\n')
    SendBanlistCardData(data, "Monster/Fusion", "No Longer On List")
    client.channels.cache.get(`${channelId}`).send('\n**:three: UNLIMITED MONSTER LINK :blue_square:**\n')
    SendBanlistCardData(data, "Monster/Link", "No Longer On List")
    client.channels.cache.get(`${channelId}`).send('\n**:three: UNLIMITED MONSTER SYNCHRO :white_large_square:**\n')
    SendBanlistCardData(data, "Monster/Synchro", "No Longer On List")
    client.channels.cache.get(`${channelId}`).send('\n**:three: UNLIMITED MONSTER XYZ :black_large_square:**\n')
    SendBanlistCardData(data, "Monster/Xyz", "No Longer On List")
    client.channels.cache.get(`${channelId}`).send('\n**:three: UNLIMITED SPELLS :green_square:**\n')
    SendBanlistCardData(data, "Spell", "No Longer On List")
    client.channels.cache.get(`${channelId}`).send('\n**:three: UNLIMITED TRAPS :red_square:**\n')
    SendBanlistCardData(data, "Trap", "No Longer On List")
}

client.login(process.env.CLIENT_TOKEN)
