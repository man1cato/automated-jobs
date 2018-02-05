require('dotenv').config();
const _ = require('lodash');
const axios = require('axios');

//Airtable API
const airtableApiEndpoint = 'https://api.airtable.com/v0/app9hQCFu4mbhVICF';
const airtableApiKey = process.env.MY_AIRTABLE_APIKEY;
const coinMarketApiEndpoint = 'https://api.coinmarketcap.com/v1';

//Binance API
const Binance = require('binance-node-api');
const binanceConfig = {
  apiKey: process.env.MY_BINANCE_APIKEY,
  secretKey: process.env.MY_BINANCE_SECRET
};
const binanceApi = Object.create(Binance);
binanceApi.init(binanceConfig);

//GDAX API
const gdax = require('gdax');
const gdaxApiKey = process.env.MY_GDAX_APIKEY;
const gdaxSecret = process.env.MY_GDAX_SECRET;
const gdaxPassphrase = process.env.MY_GDAX_PASSPHRASE;
const gdaxApiEndpoint = 'https://api.gdax.com';
const gdaxSandboxEndpoint = 'https://api-public.sandbox.gdax.com';
const authedClient = new gdax.AuthenticatedClient(
  gdaxApiKey,
  gdaxSecret,
  gdaxPassphrase,
  gdaxApiEndpoint
);

const updateTransfers = async () => {
    const transfersResponse = await axios.get(`${airtableApiEndpoint}/Transfers?api_key=${airtableApiKey}`);    //GET LIST OF EXISTING TRANSFERS
    const balancesResponse = await axios.get(`${airtableApiEndpoint}/Balances?api_key=${airtableApiKey}`);      //GET LIST OF BALANCE RECORDS
    const transferIds = transfersResponse.data.records.map((record) => record.fields['Transfer ID']);
    const ownerAssets = balancesResponse.data.records.map((record) => ({
        id: record.id,                  //ID IS NEEDED FOR THE POST METHOD LATER
        name: record.fields.Name,
        symbol: record.fields.Symbol
    }));
    
    authedClient.getAccounts((err, res, data) => {      //GET ACCOUNT DATA FROM GDAX
        if (err) {
            console.log(err);
        } else {
            for (let account of data) {                   
                const accountId = account.id;
                const symbol = account.currency;
                const balance = account.balance;
                const ownerAsset = ownerAssets.find((item) => item.name === `Andy ${symbol}`);  //GRAB THE LINKED RECORD ID FOR THAT OWNER/ASSET
                console.log('');
                authedClient.getAccountHistory(accountId, (err, res, data) => {         //GET ALL THE ACCOUNT DATA FROM GDAX
                    if (err) {
                        console.log(err);
                    } else {
                        const transfers = data.filter((item) => item.type === 'transfer');      //FILTER OUT THE NON-TRANSFER DATA
                        for (let transfer of transfers) {
                            const transferId = transfer.details.transfer_id;
                            if (!transferIds.find((id) => id === transferId)) {             //POST THE TRANSFER RECORDS FOR THOSE THAT DON'T ALREADY EXIST
                                axios.post(`${airtableApiEndpoint}/Transfers?api_key=${airtableApiKey}`, {
                                    "fields": {
                                        "Amount": transfer.amount,
                                        "Type": transfer.details.transfer_type === 'deposit' ? 'Deposit' : 'Withdrawal',
                                        "Owner/Asset": [ownerAsset.id],
                                        "Transfer Date": transfer.created_at,
                                        "Transfer ID": transferId
                                    }
                                });
                                // .then(() => {
                                    console.log({
                                        "Amount": transfer.amount,
                                        "Type": transfer.details.transfer_type === 'deposit' ? 'Deposit' : 'Withdrawal',
                                        "Owner/Asset": [ownerAsset.id],
                                        "Transfer Date": transfer.created_at,
                                        "Transfer ID": transferId
                                    });
                                // }).catch((e) => {
                                //     console.log(e);
                                // });
                            }
                        }
                    }
                });
            }
        }
    });
};



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


updateTransfers();
// updateTrades();