require('dotenv').config();
const axios = require('axios');

const airtableApiEndpoint = 'https://api.airtable.com/v0/appWyAv00LNP2Jv9G';
const airtableApiKey = process.env.MY_AIRTABLE_APIKEY;
const coinMarketApiEndpoint = 'https://api.coinmarketcap.com/v1';
const groupmeBaseUrl = 'https://api.groupme.com/v3';
const myGroupmeUserId = process.env.MY_GROUPME_USER_ID;
const accessToken = process.env.MY_GROUPME_ACCESS_TOKEN;
const cryptoBotId = process.env.GROUPME_CRYPTOBOT_ID;

const now = new Date().toUTCString();


const updateCryptoPrices = async () => {
    const assetsResponse = await axios.get(`${airtableApiEndpoint}/Assets?view=API%20Feed&api_key=${airtableApiKey}`);
    const assets = assetsResponse.data.records.map((record) => ({
        id: record.id,
        name: record.fields.Name,
        symbol: record.fields.Symbol
    }));
    // console.log('Assets:',assets);
    
    for (let asset of assets) {
        console.log(asset.symbol);
        try {
            const marketResponse = await axios.get(`${coinMarketApiEndpoint}/ticker/${asset.name.toLowerCase()}`);
            const assetData = marketResponse.data[0];
            const percentChange1hr = Number(assetData.percent_change_1h);
            const percentChange24hr = Number(assetData.percent_change_24h);
            const valueUSD = Number(assetData.price_usd);
            console.log('response',marketResponse.data);
            axios.patch(`${airtableApiEndpoint}/Assets/${asset.id}?api_key=${airtableApiKey}`, {
                "fields": {
                    "Value (BTC)": Number(assetData.price_btc),
                    "Value (USD)": valueUSD,
                    "7 Day Change": Number(assetData.percent_change_7d),
                    "24hr Change": percentChange24hr,
                    "1hr Change": percentChange1hr,
                    "Market Cap": Number(assetData.market_cap_usd),
                    "24hr Volume": Number(assetData['24h_volume_usd']),
                    "Circulating Supply": Number(assetData.available_supply),
                    "Total Supply": Number(assetData.total_supply),
                    "Max Supply": Number(assetData.max_supply),
                    "Last Updated On": now
                }
            });
            
            if (percentChange1hr > 10) {
                sendGroupmeMessage(`${asset.symbol} is up ${percentChange1hr.toFixed(2)}% in the last hour! The 24 hr change is ${percentChange24hr.toFixed(2)}%. Time to sell?`);
            } else if (percentChange1hr < -10) {
                sendGroupmeMessage(`${asset.symbol} is down ${percentChange1hr.toFixed(2)}% in the last hour! The 24 hr change is ${percentChange24hr.toFixed(2)}%. Time to buy?`);
            } else if (percentChange24hr > 20) {
                sendGroupmeMessage(`${asset.symbol} is up ${percentChange24hr.toFixed(2)}% in the last day! Time to sell?`);
            } else if (percentChange24hr < -20) {
                sendGroupmeMessage(`${asset.symbol} is down ${percentChange24hr.toFixed(2)}% in the last day! Time to buy?`);
            }
            
            /**My Notifications**/
            const filterFormula = `AND({Asset Name}="${asset.name}",{Owner}="Andy")`;
            const balancesResponse = await axios.get(`${airtableApiEndpoint}/Balances?api_key=${airtableApiKey}&filterByFormula=${filterFormula}`);
            const balanceRecord = balancesResponse.data.records[0];
            const purchasePrice = balanceRecord.fields['Avg Share Purchase Price'];
            const potential = balanceRecord.fields.Potential;
            const profitLoss = balanceRecord.fields['Profit/Loss'];
            
            if (valueUSD > purchasePrice) {
                const percentIncrease = (valueUSD/purchasePrice-1)*100;
                
                axios.post(`${groupmeBaseUrl}/direct_messages`, {
                    "direct_message": {
                        "source_guid": "GUID",
                        "recipient_id": myGroupmeUserId,
                        "text": `${asset.symbol} is up ${percentIncrease.toFixed(2)}% over your average purchase price at ${valueUSD}. It's potential value is $${potential}. If sold now, total profit would be $${profitLoss}.`
                    }
                });
            }
            
        } catch (e) {
            
        }
    }
};

const sendGroupmeMessage = (text) => {
    axios.post(`${groupmeBaseUrl}/bots/post?access_token=${accessToken}`, {
        "bot_id": cryptoBotId,
        "text": text
    });
};

updateCryptoPrices();