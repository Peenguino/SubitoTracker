const https = require("https")
const telegramBot = require("node-telegram-bot-api")
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

let trackedList = {
    fisciano: "https://hades.subito.it/v1/search/items?c=43&r=15&ci=5&to=065052&t=u&qso=false&shp=false&urg=false&sort=datedesc&lim=30&start=0"
}

// ======== gestione asincrona del tracking 

async function getSubitoJSON(url)
{
    //possibile variazione codice, passando url come parametro
    //let url = 
    return new Promise(async (resolve,reject) => {
        try
        {
            let data = await fetch(url)
            resolve(data.json())
        }
        catch(error)
        {
            reject(error)
        }
    })
    
}

let fullListFirstAds, firstAds,  currentURL = "?", intervalID;

async function setFirstAds()
{
    if(currentURL != "?")
    {
        fullListFirstAds = await getSubitoJSON(currentURL)
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
        let fullListCurrAds = await getSubitoJSON(currentURL)
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

// ======== COMANDI DISPONIBILI

bot.onText(/[/]{1}start$/,async (msg,match)=>{
    chatId = msg.chat.id
    bot.sendMessage(chatId,`Benvenuto! Digita /help per ricevere informazioni sulle operazioni eseguibili.`)
})

bot.onText(/[/]{1}help$/,async (msg,match)=>{
    chatId = msg.chat.id
    bot.sendMessage(chatId,"I comandi disponibili sono: ")
    bot.sendMessage(chatId,"/hello, hello world!")
    bot.sendMessage(chatId,"/startTrack [nome locazione nella lista], effettua un track effettuando dei controlli periodici alla locazione passata come parametro")
    bot.sendMessage(chatId,"/trackedList, restituisce una lista di locazioni e relativi URL trackati in passato")
    bot.sendMessage(chatId,"/stopTrack, interrompe il corrente tracking")
})
bot.onText(/[/]{1}startTrack/,async (msg,match)=>{
    chatId = msg.chat.id
    let minutes = 10

    //console.log(msg)

    //gestione dizionario locazioni trackate
    let index = msg.text.search(/\s+/)
    let currentPlace = msg.text.slice(index+1).toLowerCase().trim()
    
    if(currentPlace in trackedList)
    {
        //url nel dizionario delle chiavi
        currentURL = trackedList[currentPlace]

        bot.sendMessage(chatId,`Inizio tracking, controllo nuovo annuncio ogni ${minutes} minuti`)
        //setta il primo
        setFirstAds()
        //notifica per la prima volta
        sendSubitoAlert()
        //start loop e relativo id
        intervalID = setInterval(sendSubitoAlert, minutes * 60 * 1000)
    }
    else
    {
        bot.sendMessage(chatId,"Non hai inserito una locazione presente nella lista.")
        bot.sendMessage(chatId,"Consulta la lista delle locazioni già disponibili con /trackedList")
    }
})

bot.onText(/[/]{1}stopTrack$/,async (msg,match)=>{
    chatId = msg.chat.id
    if(intervalID)
    {
        clearInterval(intervalID)
        bot.sendMessage(chatId,`Tracking interrotto`)
    }
    else
    {
        bot.sendMessage(chatId,`Nessun tracking in corso`)
    }
})

bot.onText(/[/]{1}hello$/,async (msg,match)=>{
    chatId = msg.chat.id
    bot.sendMessage(chatId,`Hello World!`)
})

bot.onText(/[/]{1}trackedList$/,async (msg,match)=>{
    chatId = msg.chat.id
    let output = Object.keys(trackedList).toString()
    bot.sendMessage(chatId,output)
})


