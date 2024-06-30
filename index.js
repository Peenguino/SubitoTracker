#!/usr/bin/node
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

// ======== gestione asincrona del tracking 

async function getSubitoJSON()
{
    //possibile variazione codice, passando url come parametro
    let url = "https://hades.subito.it/v1/search/items?c=43&r=15&ci=5&to=065052&t=u&qso=false&shp=false&urg=false&sort=datedesc&lim=30&start=0"
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

let fullListFirstAds, firstAds

async function setFirstAds()
{
    fullListFirstAds = await getSubitoJSON()
    firstAds = fullListFirstAds.ads[0]
    console.log(`start id: ${firstAds.urn}`)
}

async function sendSubitoAlert()
{
    try
    {
        let fullListCurrAds = await getSubitoJSON()
        currAds = fullListCurrAds.ads[0]
        //console.log(currAds)

        // ==

        console.log(`precedente id: ${firstAds.urn}`)
        console.log(`corrente id: ${currAds.urn}`)

        // ==
        if(firstAds.urn != currAds.urn)
        {
            bot.sendMessage(chatId,"Nuovo annuncio pubblicato")
        }

        firstAds = currAds
    }
    catch(error)
    {
        bot.sendMessage(chatId,"Errore")
        console.log(error)
    }
}

// ======== COMANDI DISPONIBILI

bot.onText(/[/]{1}track/,async (msg,match)=>{
    chatId = msg.chat.id
    let minutes = 10
    bot.sendMessage(chatId,`Inizio tracking, controllo nuovo annuncio ogni ${minutes} minuti`)
    //setta il primo
    setFirstAds()
    //notifica per la prima volta
    sendSubitoAlert()
    //loop
    setInterval(sendSubitoAlert, minutes * 60 * 1000)
})

bot.onText(/[/]{1}hello/,async (msg,match)=>{
    chatId = msg.chat.id
    bot.sendMessage(chatId,`Hello World!`)
})


