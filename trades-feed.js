require('dotenv').config();
const _ = require('lodash');
const axios = require('axios');
const moment = require('moment');

//Airtable API
const airtableApiEndpoint = 'https://api.airtable.com/v0/appA5nGrBVb4RN9No/';
const airtableApiKey = process.env.MY_AIRTABLE_APIKEY;
const coinMarketApiEndpoint = 'https://api.coinmarketcap.com/v1/';

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
const gdaxApiEndpoint = 'https://api.gdax.com/';
const gdaxSandboxEndpoint = 'https://api-public.sandbox.gdax.com/';
const authedClient = new gdax.AuthenticatedClient(
  gdaxApiKey,
  gdaxSecret,
  gdaxPassphrase,
  gdaxApiEndpoint
);

//Poloniex API
const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex(process.env.MY_POLONIEX_APIKEY,process.env.MY_POLONIEX_SECRET);

const now = moment().unix();


const setTransfers = async () => {
    try {
        const assetsResponse = await axios.get(`${airtableApiEndpoint}Assets?api_key=${airtableApiKey}`);
        const assets = assetsResponse.data.records;

        const exchangesResponse = await axios.get(`${airtableApiEndpoint}Exchanges?api_key=${airtableApiKey}&filterByFormula={Name}="Poloniex"`);
        const poloniexId = exchangesResponse.data.records[0].id;

        const start = moment().subtract(1, 'year').unix();
        const poloniexResponse = await poloniex.returnDepositsWithdrawals(start, now);  //GET TRANSFERS DATA FROM POLONIEX
        const deposits = poloniexResponse.deposits;
        const withdrawals = poloniexResponse.withdrawals;

        // for (let deposit of deposits) {
        //     const assetId = assets.find((asset) => asset.fields.Symbol === deposit.currency).id;
        //     const balancesResponse = await axios.get(`${airtableApiEndpoint}Accounts?api_key=${airtableApiKey}&filterByFormula={Name}="Andy ${deposit.currency}"`);
        //     const accountId = balancesResponse.data.records[0].id;
            
            
        //     axios.post(`${airtableApiEndpoint}Transfers?api_key=${airtableApiKey}`, {
        //         "fields": {
        //             "Amount": Number(deposit.amount),
        //             "Asset": [assetId],
        //             "Type": "Withdrawal",
        //             "Account": [accountId],
        //             "Transfer Date": moment(deposit.timestamp).format(),
        //             "From Address": deposit.address,
        //             "To Exchange": [poloniexId],
        //             "Transaction ID": deposit.txid
        //         }
        //     }).then(() => {
        //         console.log({
        //             "Amount": Number(deposit.amount),
        //             "Asset": [assetId],
        //             "Type": "Deposit",
        //             "Account": [accountId],
        //             "Transfer Date": moment(deposit.timestamp).format(),
        //             "From Address": deposit.address,
        //             "To Exchange": [poloniexId],
        //             "Transaction ID": deposit.txid
        //         });
        //     }).catch((e) => {
        //         console.log(e);
        //     });
        // }
        
        for (let withdrawal of withdrawals) {
            let symbol = withdrawal.currency === 'STR' ? 'XLM' : withdrawal.currency;
            const assetId = assets.find((asset) => asset.fields.Symbol === symbol).id;

            const accountsResponse = await axios.get(`${airtableApiEndpoint}Accounts?api_key=${airtableApiKey}&filterByFormula={Name}="Andy ${symbol}"`);
            const accountId = accountsResponse.data.records[0].id;
            // console.log({
            //         "Amount": Number(withdrawal.amount),
            //         "Asset": [assetId],
            //         "Type": "Withdrawal",
            //         "Account": [accountId],
            //         "Transfer Date": moment(withdrawal.timestamp).format(),
            //         "To Address": withdrawal.address,
            //         "From Exchange": [poloniexId],
            //         "Fee": Number(withdrawal.fee),
            //         "Withdrawal Number": withdrawal.withdrawalNumber
            //     });
            axios.post(`${airtableApiEndpoint}Transfers?api_key=${airtableApiKey}`, {
                "fields": {
                    "Amount": Number(withdrawal.amount),
                    "Asset": [assetId],
                    "Type": "Withdrawal",
                    "Account": [accountId],
                    "Transfer Date": moment(withdrawal.timestamp).format(),
                    "To Address": withdrawal.address,
                    "From Exchange": [poloniexId],
                    "Fee": Number(withdrawal.fee),
                    "Withdrawal Number": withdrawal.withdrawalNumber
                }
            }).then(() => {
                console.log({
                    "Amount": Number(withdrawal.amount),
                    "Asset": [assetId],
                    "Type": "Withdrawal",
                    "Account": [accountId],
                    "Transfer Date": moment(withdrawal.timestamp).format(),
                    "To Address": withdrawal.address,
                    "From Exchange": [poloniexId],
                    "Fee": Number(withdrawal.fee),
                    "Withdrawal Number": withdrawal.withdrawalNumber
                });
            }).catch((e) => {
                console.log(e);
            });
        }
        
    } catch (e) {
        throw new Error(e);
    }
};

const updateTransfers = async () => {
    const transfersResponse = await axios.get(`${airtableApiEndpoint}Transfers?api_key=${airtableApiKey}`);    //GET LIST OF EXISTING TRANSFERS
    const transferIds = transfersResponse.data.records.map((record) => record.fields['Transfer ID']);
    
    const balancesResponse = await axios.get(`${airtableApiEndpoint}Balances?api_key=${airtableApiKey}`);      //GET LIST OF BALANCE RECORDS
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
                                axios.post(`${airtableApiEndpoint}Transfers?api_key=${airtableApiKey}`, {
                                    "fields": {
                                        "Amount": transfer.amount,
                                        "Type": transfer.details.transfer_type === 'deposit' ? 'Deposit' : 'Withdrawal',
                                        "Owner/Asset": [ownerAsset.id],
                                        "Transfer Date": transfer.created_at,
                                        "Transfer ID": transferId
                                    }
                                });
                                console.log({
                                    "Amount": transfer.amount,
                                    "Type": transfer.details.transfer_type === 'deposit' ? 'Deposit' : 'Withdrawal',
                                    "Owner/Asset": [ownerAsset.id],
                                    "Transfer Date": transfer.created_at,
                                    "Transfer ID": transferId
                                });
                            }
                        }
                    }
                });
            }
        }
    });
    
    
};



const updateTrades = async () => {
    const airtableResponse = await axios.get(`${airtableApiEndpoint}Balances?view=Andy&api_key=${airtableApiKey}`);
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
                        
                        const response = await axios.get(`${coinMarketApiEndpoint}ticker/${asset.name}`);
                        const usdPrice = response.data[0].price_usd;
                        
                        // const response = await axios.get(`https://min-api.cryptocompare.com/data/pricehistorical?fsym=${asset.symbol}&tsyms=USD&ts=${trade.time}`);
                        // console.log('response:', response.data);
                        // const usdPrice = response.data[asset.symbol].USD;
                        
                        const filterFormula = `{Trade ID}=${trade.id}`;
                        const tradeLookup = await axios.get(`${airtableApiEndpoint}Trades?filterByFormula=${filterFormula}&api_key=${airtableApiKey}`);
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
                        //     axios.post(`${airtableApiEndpoint}Trades?api_key=${airtableApiKey}`, {
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

setTransfers();
// updateTransfers();
// updateTrades();