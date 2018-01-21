require('dotenv').config();
const _ = require('lodash');
const axios = require('axios');

const airtableApiEndpoint = 'https://api.airtable.com/v0/appWyAv00LNP2Jv9G';
const airtableApiKey = process.env.MY_AIRTABLE_APIKEY;
const coinMarketApiEndpoint = 'https://api.coinmarketcap.com/v1';

const Binance = require('binance-node-api');
const binanceConfig = {
  apiKey: process.env.MY_BINANCE_APIKEY,
  secretKey: process.env.MY_BINANCE_SECRET
};
const binanceApi = Object.create(Binance);
binanceApi.init(binanceConfig);


const updateTrades = async () => {
    
    const airtableResponse = await axios.get(`${airtableApiEndpoint}/Balances?view=Andy&api_key=${airtableApiKey}`);
    const assets = airtableResponse.data.records.map((record) => ({
        id: record.id,
        name: record.fields['Asset Name'][0].toLowerCase(),
        symbol: record.fields.Symbol
    }));
    let exchangeAssets = ['BTC','ETH','LTC','USDT','USD'];
    exchangeAssets = _.compact(exchangeAssets.map((exchangeAsset) => {
        return assets.find((asset) => asset.symbol === exchangeAsset);
    }));

    for (let asset of assets) {
        for (let exchangeAsset of exchangeAssets) {
            const symbol = asset.symbol + exchangeAsset.symbol;
            
            try {
                const tradesResponse = await binanceApi.getAccountTradeList({symbol, timestamp: Date.now()});
            
                if (tradesResponse) {
                    const trades = tradesResponse.data;
                    console.log(symbol);
                    // console.log(trades);
                    
                    for (let trade of trades) {
                        const qty = Number(trade.qty);
                        const price = Number(trade.price);
                        const purchaseDate = new Date(Number(trade.time)).toUTCString();
                        // console.log('tradetime:', trade.time);
                        // console.log('purchaseDate:', purchaseDate);
                        
                        const response = await axios.get(`${coinMarketApiEndpoint}/ticker/${asset.name}`);
                        const usdPrice = response.data[0].price_usd;
                        
                        // const response = await axios.get(`https://min-api.cryptocompare.com/data/pricehistorical?fsym=${asset.symbol}&tsyms=USD&ts=${trade.time}`);
                        // console.log('response:', response.data);
                        // const usdPrice = response.data[asset.symbol].USD;
                        
                        const filterFormula = `{Trade ID}=${trade.id}`;
                        const tradeLookup = await axios.get(`${airtableApiEndpoint}/Trades?filterByFormula=${filterFormula}&api_key=${airtableApiKey}`);
                        // console.log('tradeLookup:  ', tradeLookup.data);
                        if (tradeLookup.data.records.length < 1) {
                            console.log({
                                "Type": trade.isBuyer ? "Buy" : "Sell",
                                "Owner/Action Asset": [asset.id],
                                "Owner/Exchange Asset": [exchangeAsset.id],
                                "Qty": qty,
                                "Purchase Date": purchaseDate,
                                "Price": price,
                                "Price (USD)": usdPrice,
                                "Trade ID": trade.id
                            });
                        }
                        
                        // try {
                        //     axios.post(`${airtableApiEndpoint}/Trades?api_key=${airtableApiKey}`, {
                        //         "fields": {
                        //             "Type": trade.isBuyer ? "Buy" : "Sell",
                        //             "Owner/Action Asset": [asset.id],
                        //             "Owner/Exchange Asset": [exchangeAsset.id],
                        //             "Qty": qty,
                        //             "Purchase Date": purchaseDate,
                        //             "Price": price,
                        //             "Price (USD)": usdPrice
                        //         }
                        //     });
                        // } catch (e) {
                        //     throw new Error(`Failure at Airtable POST: ${e}`);
                        // }
                    }
                }
            } catch (e) {
            }
        }
    }
};

updateTrades();