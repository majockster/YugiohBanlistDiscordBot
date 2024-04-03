const puppeteer = require("puppeteer")
var url = "https://www.yugioh-card.com/en/limited/"
const classId = ".wp-block-button__link.has-text-color.has-background"
const dbHandler = require("../Persistence/YugiohBanlistDataHandler")
const {setVariable} = require('../Events/UpdateEventHandler')

const UpdateYugiohUrl = async page => {
    const newUrl = await page.evaluate((url, classId) => {  
        url = DoUpdateBanlistUrl(classId, url)
    }, url, classId)
    return newUrl
}

function DoUpdateBanlistUrl(classId, url){
    const webDom = document.querySelector(classId)
    const href = webDom.getAttribute('href')
    const banlistEndpoint = href.substring(href.indexOf("list"))
    url += banlistEndpoint
    return url
}

const GetYugiohBanlistData = async page => {
    const banlistData = await page.evaluate(() => {
        return DoUpdateBanlistData()
    })
    return banlistData
}

function DoUpdateBanlistData(){
    let results = []
    let effects = document.querySelectorAll('tr[class^=\"cardlist\"]')
    effects.forEach((x) => {
        let cardInfo = x.innerText.split("\t")
        results.push({
            CardType: cardInfo[0],
            CardName: cardInfo[1],
            AdvancedFormat: cardInfo[2].trim(),
            TraditionalFormat: cardInfo[2] != 'Forbidden' ? '' : cardInfo[3].trim(),
            Remarks: cardInfo[2] != 'Forbidden' ? cardInfo[3] : cardInfo[4]
        })
    })
    results.shift()
    return results
}

const AddBanlistDataToDb = results => {
    
    dbHandler.ConnectToDb()

    results.forEach(x => {
        dbHandler.AddBanlistCardToDb(x)
    })    
}

const ScrapeYugiohWebpage = async () => {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    const initialUrl = url
    try{
        await page.goto(url)
        url = await UpdateYugiohUrl(page)
        console.log(url)
        await page.goto(url, {waitUntil: 'networkidle0'})
        const data = await GetYugiohBanlistData(page)
        AddBanlistDataToDb(data)
        console.log(`Added ${data.length} cards in DB`)

        await page.goto(initialUrl)
        await UpdateBanlistDataFromYugiohWebsite(page, options)
        //browser.close()
    }
    catch(e){
        console.log(e)
    }
}

//1. fetch already the banlist data
//2. wait for update
//3. if url has change -> update url + fetch banlist data
async function UpdateBanlistDataFromYugiohWebsite(page){
    var target = await page.$(classId)

    const callback = async (mutationsList) => {
        for (const mutation of mutationsList){
            if (mutation.type === 'attributes' && mutation.attributeName === 'href'){
                var newUrl = mutation.target.getAttribute('href')
                await page.goto(newUrl, {waitUntil: 'networkidle0'})
                const data = await GetYugiohBanlistData(page)
                AddBanlistDataToDb(data)
                console.log(`Added ${data.length} cards in DB`)
                setVariable(true)
            }
        }
    }

    const observer = new MutationObserver(callback)
    observer.observe(target, {attributes: true, attributeFilter: ['href']})
}

module.exports = { ScrapeYugiohWebpage, url, classId }


        

