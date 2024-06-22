const https = require("https")
const telegramBot = require("node-telegram-bot-api")
const { resolve } = require("path")

//var resObj

//token bot telegram
class NoToken extends Error{}

const telegramToken = require("./.settings").telegramToken
if(!(telegramToken))
{
    throw new NoToken("Invalid Telegram Bot Token")
}

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

async function keepTracking()
{
    let i = 0
    let adsList = await getSubitoJSON()
    let checkNewObj = adsList.checknew
    while(true)
    {   
        let adsList = await getSubitoJSON()
        let checkNewObj = adsList.checknew
        setTimeout(async ()=>
        {
            if(checkNewObj.newads == true)
            {
                bot.sendMessage(chatId,"Nuovo annuncio pubblicato")
                adsList = await getSubitoJSON()
                checkNewObj = adsList.checknew
            }
            else
            {
                bot.sendMessage(chatId,"Nessun annuncio pubblicato")
            }
        },10000)//600000)
    }
}

// ========

let bot = new telegramBot(telegramToken,{polling:true})

bot.onText(/[/]{1}track/,async (msg,match)=>{
    chatId = msg.chat.id

    //await keepTracking()
})

/*
bot.onText(/[/]{1}debug/,(msg,match)=>{
    chatId = msg.chat.id
    while(true)
    {
        setTimeout(()=>
        {
            console.log("printdebug")
        },10000)//600000)
    }
})
*/


