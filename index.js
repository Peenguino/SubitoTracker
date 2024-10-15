const https = require("https")
const telegramBot = require("node-telegram-bot-api")
const puppeteer = require("puppeteer-core")
const { resolve } = require("path")

//var resObj

// ======== token bot telegram
class NoToken extends Error{}

const telegramToken = require("./.settings").telegramToken
if(!(telegramToken))
{
    throw new NoToken("Invalid Telegram Bot Token")
}

// ======== istanza del bot di telegram

let bot = new telegramBot(telegramToken,{polling:true})

// ======== lista dei track già effettuati

class URL_Error extends Error{}

var currentGlobalQueryURL="empty", shippingValue = "false";

async function getWindowObj(inputUrl) {
    return new Promise(async (resolve, reject) => {
        try {
            const browser = await puppeteer.launch(
                { channel: "chrome" }
                /*
                {executablePath:"/snap/bin/chromium",
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox']}
                */
            )
            const page = await browser.newPage()

            await page.goto(inputUrl)
            

            let subitoQueryOBJ = await page.evaluate(() => {
                return window.subito.dataLayer._modelsMap.search
            })
            await browser.close()

            resolve(subitoQueryOBJ)
        }
        catch (error) {
            reject(error)
        }
    }
    )
}

async function mapQueryParams(inputUrl) {
    return new Promise(async (resolve, reject) => {
        try {
            let queryObj = await getWindowObj(inputUrl)
            //console.dir(queryObj, { depth: 100 })
            let queryParams = { 
                // --- QUERY
                "q": (queryObj.query != '')? queryObj.query : null, 
                "c": (queryObj.category.parent.id != '0')? queryObj.category.child.id: null, 
                // --- GEO
                "ci": queryObj.geo.city? queryObj.geo.city.id : null, 
                "r": queryObj.geo.region? queryObj.geo.region.id:null, 
                "to":queryObj.geo.town? queryObj.geo.town.id:null, 
                // --- SORT (tracking, sempre ordinato dal più recente al meno recente)
                "sort":'datedesc',
                //"sort":queryObj.sort? queryObj.sort.id:'datedesc',
                // --- PARAMETRI NON COMUNI A TUTTE LE CATEGORIE
                "urg":'false',
                "shp":'false',
                "qso":'false'
                }

                //console.dir(queryParams,{depth:10})
                let queryPrefix = "https://hades.subito.it/v1/search/items?", paramsString="", queryString="";
                for(let key in queryParams)
                {
                    if(queryParams[key]!=null)
                    {
                        paramsString += "&" +key+ "=" + queryParams[key]
                    }
                }

                //setto di default qso, shp, urg a false non essendo parametri essenziali

                queryString = queryPrefix + paramsString.slice(1) + "&qso=false&shp=false&urg=false&lim=30&start=0";
                //console.log(queryString)
            resolve(queryString)
        }
        catch (error) {
            reject(error)
        }
    })

}


// ======== gestione asincrona del tracking 

async function getSubitoJSON()
{
    return new Promise(async (resolve,reject) => {
        try
        {
            let data = await fetch(currentGlobalQueryURL)
            resolve(data.json())
        }
        catch(error)
        {
            reject(error)
        }
    })
    
}

let fullListFirstAds, firstAds, intervalID;

async function setFirstAds()
{
    if(currentGlobalQueryURL!="empty")
    {
        fullListFirstAds = await getSubitoJSON(currentGlobalQueryURL)
    }
    else
    {
        throw(Error("Errore con l'URL inserito"))
    }
    firstAds = fullListFirstAds.ads[0]
    console.log(`start id: ${firstAds.urn}`)
}

async function sendSubitoAlert()
{
    try
    {
        let fullListCurrAds = await getSubitoJSON(currentGlobalQueryURL)
        currAds = fullListCurrAds.ads[0]
    
        console.log(`precedente id: ${firstAds.urn}`)
        console.log(`corrente id: ${currAds.urn}`)

        if(firstAds.urn != currAds.urn)
        {
            bot.sendMessage(chatId,`Nuovo annuncio pubblicato in data: ${currAds.dates.display}`)
            //url del nuovo annuncio
            bot.sendMessage(chatId,currAds.urls.default)
        }

        firstAds = currAds
    }
    catch(error)
    {
        //bot.sendMessage(chatId,"Errore")
        console.log(error)
    }
}

let userInput = null

// ======== COMANDI DISPONIBILI

bot.onText(/[/]{1}start$/,async (msg,match)=>{
    chatId = msg.chat.id
    bot.sendMessage(chatId,`Benvenuto! Digita /help per ricevere informazioni sulle operazioni eseguibili.`)
})

bot.onText(/[/]{1}help$/,async (msg,match)=>{
    chatId = msg.chat.id
    bot.sendMessage(chatId,"I comandi disponibili sono: ")
    bot.sendMessage(chatId,"/startTrack [url], effettua un track effettuando dei controlli periodici all'url passato come parametro")
    bot.sendMessage(chatId,"/stopTrack, interrompe il corrente tracking")
    bot.sendMessage(chatId,"/infoTrack, restituisce informazioni riguardo il corrente tracking attivo")

})
bot.onText(/[/]{1}startTrack/,async (msg,match)=>{
    chatId = msg.chat.id
    let minutes = 8

    //console.log(msg)

    let index = msg.text.search(/\s+/)
    userInput = msg.text.slice(index+1).trim()
    bot.sendMessage(chatId,`Attendi...`)
    currentGlobalQueryURL = await mapQueryParams(userInput)    
    try
    {
        bot.sendMessage(chatId,`Inizio tracking, controllo nuovo annuncio ogni ${minutes} minuti`)
        bot.sendMessage(chatId,`Inizio tracking dell url ${userInput}`)
        //setta il primo
        setFirstAds(currentGlobalQueryURL)
        //notifica per la prima volta
        sendSubitoAlert(currentGlobalQueryURL)
        //start loop e relativo id
        intervalID = setInterval(sendSubitoAlert, minutes * 60 * 1000)
    }
    catch(e)
    {
        console.log(e)
        bot.sendMessage(chatId,"Errore")
        bot.sendMessage(chatId,"Riprova l'inserimento dell'URL: ")
    }
})

bot.onText(/[/]{1}stopTrack$/,async (msg,match)=>{
    chatId = msg.chat.id
    if(intervalID)
    {
        clearInterval(intervalID)
        currentGlobalQueryURL = "empty"
        bot.sendMessage(chatId,`Tracking interrotto`)
    }
    else
    {
        bot.sendMessage(chatId,`Nessun tracking in corso`)
    }
})

bot.onText(/[/]{1}infoTrack$/,async (msg,match)=>{
    chatId = msg.chat.id
    if(intervalID && userInput != null)
    {
        bot.sendMessage(chatId,`Attualmente stai trackando: ${userInput}`)
    }
    else
    {
        bot.sendMessage(chatId,`Nessun tracking in corso`)
    }
})

bot.onText(/[/]{1}test$/,async (msg,match)=>{
    chatId = msg.chat.id
    bot.sendMessage(chatId,`test`)
})



