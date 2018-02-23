require('dotenv').config();
const axios = require('axios');

const airtableApiEndpoint = 'https://api.airtable.com/v0/appA5nGrBVb4RN9No';
const airtableApiKey = process.env.MY_AIRTABLE_APIKEY;
const coinMarketApiEndpoint = 'https://api.coinmarketcap.com/v1';
const groupmeBaseUrl = 'https://api.groupme.com/v3';
const accessToken = process.env.MY_GROUPME_ACCESS_TOKEN;
const cryptoBotId = process.env.GROUPME_CRYPTOBOT_ID;

const today = new Date().toLocaleDateString();


const postCryptoVolume = async () => {
    const marketResponse = await axios.get(`${coinMarketApiEndpoint}/ticker/tether`);
    const assetData = marketResponse.data[0];
    const newVolume = Number(assetData['24h_volume_usd']);
    // console.log('response',assetData);
    
    const airtableResponse = await axios.get(`${airtableApiEndpoint}/Volume?maxRecords=1&sort[0][field]=Date&sort[0][direction]=desc&api_key=${airtableApiKey}`);
    const lastRecord = airtableResponse.data.records[0];
    const lastVolume = lastRecord.fields['24hr Volume'];
    const lastDate = lastRecord.fields.Date;
    
    const volumeChange = newVolume-lastVolume;
    const percentChange = volumeChange/lastVolume*100;
    
    console.log({"24hr Volume": newVolume,
            "$ Change": volumeChange,
            "% Change": percentChange,
            "Date": today});
    
    axios.post(`${airtableApiEndpoint}/Volume?api_key=${airtableApiKey}`, {
        "fields": {
            "24hr Volume": newVolume,
            "$ Change": volumeChange,
            "% Change": percentChange,
            "Date": today
        }
    });
    if (percentChange > 30) {
        sendGroupmeMessage(`Tether is up ${percentChange.toFixed(2)}% in the last day! SELL SELL SELL!`);
    } else if (percentChange < -30) {
        sendGroupmeMessage(`Tether is down ${percentChange.toFixed(2)}% in the last day! BUY BUY BUY!`);
    }
    
};

const sendGroupmeMessage = (text) => {
    axios.post(`${groupmeBaseUrl}/bots/post?access_token=${accessToken}`, {
        "bot_id": cryptoBotId,
        "text": text
    });
};

postCryptoVolume();