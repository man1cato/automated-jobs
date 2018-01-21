require('dotenv').config();
const axios = require('axios');

const airtableApiEndpoint = 'https://api.airtable.com/v0/appWyAv00LNP2Jv9G';
const airtableApiKey = process.env.MY_AIRTABLE_APIKEY;
const coinMarketApiEndpoint = 'https://api.coinmarketcap.com/v1';
const groupmeBaseUrl = 'https://api.groupme.com/v3';
const accessToken = process.env.MY_GROUPME_ACCESS_TOKEN;

const now = new Date().toUTCString();
console.log('now:', now);


const updateCryptoPrices = async () => {
    const airtableResponse = await axios.get(`${airtableApiEndpoint}/Coins?api_key=${airtableApiKey}`);
    const coins = airtableResponse.data.records.map((record) => ({
        id: record.id,
        name: record.fields.Name.toLowerCase(),
        symbol: record.fields.Symbol
    }));
    console.log('Coins:',coins);
    
    for (let coin of coins) {
        const response = await axios.get(`${coinMarketApiEndpoint}/ticker/${coin.name}`);
        const coinData = response.data[0];
        // console.log('response',response.data);
        
        axios.patch(`${airtableApiEndpoint}/Coins/${coin.id}?api_key=${airtableApiKey}`, {
            "fields": {
                "Value (BTC)": Number(coinData.price_btc),
                "Value (USD)": Number(coinData.price_usd),
                "7 Day Change": Number(coinData.percent_change_7d),
                "24hr Change": Number(coinData.percent_change_24h),
                "1hr Change": Number(coinData.percent_change_1h),
                "Market Cap": Number(coinData.market_cap_usd),
                "24hr Volume": Number(coinData['24h_volume_usd']),
                "Circulating Supply": Number(coinData.available_supply),
                "Total Supply": Number(coinData.total_supply),
                "Max Supply": Number(coinData.max_supply),
                "Last Updated On": now
            }
        });
        // if (percentChange > 0.2) {
        //     sendGroupmeMessage(coin.symbol, percentChange);
        // }
    }
};

const sendGroupmeMessage = (symbol, percentChange) => {
    axios.post(`${groupmeBaseUrl}/direct_messages?access_token=${accessToken}`, {
        "source_guid": "GUID",
        "recipient_id": "20",
        "text": `${symbol} is up ${percentChange}`
    });
};

updateCryptoPrices();