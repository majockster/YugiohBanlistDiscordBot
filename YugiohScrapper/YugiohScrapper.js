const puppeteer = require("puppeteer")
var url = "https://www.yugioh-card.com/en/limited/"
const classId = ".wp-block-button__link.has-text-color.has-background"
const dbHandler = require("../Persistence/YugiohBanlistDataHandler")

const UpdateYugiohUrl = async page => {
    const newUrl = await page.evaluate((url, classId) => {  
        const webDom = document.querySelector(classId)
        const href = webDom.getAttribute('href')
        const banlistEndpoint = href.substring(href.indexOf("list"))
        url += banlistEndpoint
        return url
    }, url, classId)
    return newUrl
}

const GetYugiohBanlistData = async page => {
    const banlistData = await page.evaluate(() => {
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
    })
    return banlistData
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

    try{
        await page.goto(url)
        url = await UpdateYugiohUrl(page)
        console.log(url)
        await page.goto(url, {waitUntil: 'networkidle0'})
        const data = await GetYugiohBanlistData(page)
        AddBanlistDataToDb(data)
        console.log(`Added ${data.length} cards in DB`)
        browser.close()
    }
    catch(e){
        console.log(e)
    }
}

module.exports = { ScrapeYugiohWebpage, url, classId }


        

