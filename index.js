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

let trackedList = require("./trackedList.json")

// ======== filtro annunci spam

let spamList = require("./spamList.json")


function spamFilter(cityName,currStr)
{
    let spamStr1 = currStr.replace(/\s+/g, '').toLowerCase(), spamStr2 = spamList[cityName].replace(/\s+/g, '').toLowerCase()

    //chiamata effettuata nella funzione sendSubitoAlert
    if(spamStr1 == spamStr2)
    {
        return "spam"
    }
    else
    {
        return "notSpam"
    }
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

        //controllo spam, tramite chiamata a funzione apposita
        let city = currAds.geo.city.value.toLowerCase(), isSpam = "notSpam"
        if(city in spamList)
        {
            //controlla il body (descrizione annuncio), body ricorrenti in annunci spam noti
            isSpam = spamFilter(city,currAds.body.slice(0,351))
        }

        if(firstAds.urn != currAds.urn && isSpam == "notSpam")
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
    bot.sendMessage(chatId,"/trackedList, restituisce una lista di locazioni disponibili al tracking")
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


