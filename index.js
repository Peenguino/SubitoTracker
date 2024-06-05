const https = require("https")
const telegramBot = require("node-telegram-bot-api")

//token bot telegram
class NoToken extends Error{}

const telegramToken = require("./.settings").telegramToken
if(!(telegramToken))
{
    throw new NoToken("Invalid Telegram Bot Token")
}

// ======== gestione asincrona del tracking 



// ========

let bot = new telegramBot(telegramToken,{polling:true})

bot.onText(/[/]{1}track/,(msg,match)=>{
    chatId = msg.chat.id
    let url = "https://hades.subito.it/v1/search/items?c=43&r=15&ci=5&to=065052&t=u&qso=false&shp=false&urg=false&sort=datedesc&lim=30&start=0"
    https.get(url,(res) => {
        let body = "";
    
        res.on("data", (chunk) => {
            body += chunk;
        });
    
        res.on("end", () => {
            try {
                let obj = JSON.parse(body);
                
                console.log(obj.ads[0])

            } catch (error) {
                console.error(error.message);
            };
        });
    
    }).on("error", (error) => {
        console.error(error.message);
    });

})
