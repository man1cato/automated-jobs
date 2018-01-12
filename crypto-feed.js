const axios = require('axios');

const airtableApiEndpoint = 'https://api.airtable.com/v0/appWyAv00LNP2Jv9G';
const airtableApiKey = 'keyzG8AODPdzdkhjG';
const coinMarketApiEndpoint = 'https://api.coinmarketcap.com/v1';
const groupmeBaseUrl = 'https://api.groupme.com/v3';
const ACCESS_TOKEN = '47ae92f0c4190135d3e50f90f2367d88';

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
        const btcPrice = Number(coinData.price_btc);
        const usdPrice = Number(coinData.price_usd);
        const percentChange1hr = Number(coinData.percent_change_1h);
        const percentChange24hr = Number(coinData.percent_change_24h);
        const percentChange7d = Number(coinData.percent_change_7d);
        const marketCap = Number(coinData.market_cap_usd);
        const circulatingSupply = Number(coinData.available_supply);
        const totalSupply = Number(coinData.total_supply);
        const maxSupply = Number(coinData.max_supply);
        // console.log('response',response.data);
        axios.patch(`${airtableApiEndpoint}/Coins/${coin.id}?api_key=${airtableApiKey}`, {
            "fields": {
                "Value (BTC)": btcPrice,
                "Value (USD)": usdPrice,
                "7 Day Change": percentChange7d,
                "24hr Change": percentChange24hr,
                "1hr Change": percentChange1hr,
                "Market Cap": marketCap,
                "Circulating Supply": circulatingSupply,
                "Total Supply": totalSupply,
                "Max Supply": maxSupply,
                "Last Updated On": now
            }
        });
        // if (percentChange > 0.2) {
        //     sendGroupmeMessage(coin.symbol, percentChange);
        // }
    }
};

const sendGroupmeMessage = (symbol, percentChange) => {
    axios.post(`${groupmeBaseUrl}/direct_messages?access_token=${ACCESS_TOKEN}`, {
        "source_guid": "GUID",
        "recipient_id": "20",
        "text": `${symbol} is up ${percentChange}`
    });
};

updateCryptoPrices();