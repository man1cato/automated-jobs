require('dotenv').config();
const axios = require('axios');
const Webflow = require('webflow-api');

const airtableApiEndpoint = 'https://api.airtable.com/v0/appt7YYH8PuWcqLnz/';
const airtableApiKey = process.env.OL_AIRTABLE_APIKEY;

const webflow = new Webflow({ token: process.env.OL_WEBFLOW_APIKEY });
const siteId = '5afb13525d83d958048d25d6';

const productCollectionId = '5b50ba525d6e7e255d906933';
const authorCollectionId = '5b749c85cf70826a7c1a16e5';
const articleCollectionId = '5b631f9eec59f37f21699485';

let webflowArticles, webflowAuthors, webflowProducts = [];
let offset = 0;
for (let i = 0; i < 2; i++) {
    const products = await webflow.items({ collectionId: productCollectionId }, {offset});
    const articles = await webflow.items({ collectionId: articleCollectionId }, {offset});
    const authors = await webflow.items({ collectionId: authorCollectionId }, {offset});
    webflowProducts = webflowProducts.concat(products.items);
    webflowArticles = webflowArticles.concat(authors.items);
    webflowAuthors = webflowAuthors.concat(articles.items);
    offset = offset + 100;
}



//POST WEBFLOW IDs TO AIRTABLE

const postIds = async () => {

    try {
        const productRes = await axios.get(`${airtableApiEndpoint}Products?api_key=${airtableApiKey}&view=IDs`);
        const products = productRes.data.records;

        for (let product of products) {    
            const webflowProductId = webflowProducts.items.find((item) => item.name === product.fields.Name)._id;
    
            axios.patch(`${airtableApiEndpoint}Products/${product.id}?api_key=${airtableApiKey}`, {
                "fields": {
                    "Webflow ID": webflowProductId
                }
            }).catch((e) => {
                console.log('ERROR:', e)
            }); 
        }
    } catch (e) {
        console.error(e);
    }

}


//ADD WEBFLOW PRODUCT ID TO AIRTABLE

const addProductId = async () => {
    try {
        const productRes = await axios.get(`${airtableApiEndpoint}Products?api_key=${airtableApiKey}&view=IDs`);
        for (let product of productRes.data.records) {
            const item = await webflow.item({ collectionId: productCollectionId, itemId: product.fields["Webflow ID"] });
            const articleID = item["product-page"];
            const shortDescription = item["short-description"] || "";
    
            axios.patch(`${airtableApiEndpoint}Products/${product.id}?api_key=${airtableApiKey}`, {
                "fields": {
                    "Article ID": articleID,
                    "Short Description": shortDescription
                }
            }).catch((e) => {
                console.log('ERROR:', e)
            });
        }
    } catch (e) {
        console.log('ERROR:', e)
    }
}


//ADD WEBFLOW ARTICLE ID TO AIRTABLE

const addArticleId = async () => {
    try {
        const airtableRes = await axios.get(`${airtableApiEndpoint}Content?api_key=${airtableApiKey}&view=Script Trigger`);
        
        for (let article of airtableRes.data.records) {
            const webflowArticle = webflowArticles.find((item) => item.permalink === article.fields.Permalink) || undefined; 
            if (webflowArticle) {
                axios.patch(`${airtableApiEndpoint}Content/${article.id}?api_key=${airtableApiKey}`, {
                    "fields": {
                        "Webflow ID": webflowArticle._id
                    }
                }).catch((e) => {
                    console.log('ERROR:', e)
                });
            }
        }
    } catch (e) {
        console.log('ERROR:', e)
    }
}


//ADD PERMALINKS TO WEBFLOW ARTICLES

const addPermalinks = async () => {
    try {
        const contentRes = await axios.get(`${airtableApiEndpoint}Content?api_key=${airtableApiKey}&view=Articles`);

        // const article = contentRes.data.records[0];
        
        for (let article of contentRes.data.records) {
            const itemId = article.fields["Webflow ID"];
            const permalink = article.fields.Permalink;
            const item = await webflow.item({ 
                collectionId: articleCollectionId, 
                itemId          
            });
            // console.log(item)
            const updatedItem = await webflow.updateItem({
                collectionId: articleCollectionId,
                itemId,
                fields: {
                    _archived: item._archived,
                    _draft: item._draft,
                    _cid: item._cid,
                    slug: item.slug,
                    name: item.name,
                    author: item.author,
                    'product-2': item['product-2'],
                    'hero-title': item['hero-title'],
                    'hero-subtitle': item['hero-subtitle'],
                    'hero-image': item['hero-image'] && item['hero-image'].fieldId,
                    'card-image': item['card-image'] && item['card-image'].fieldId,
                    'card-description': item['card-description'],
                    summary: item.summary,
                    'section-1-title': item['section-1-title'],
                    'section-1-content': item['section-1-content'],
                    'section-2-title': item['section-2-title'],
                    'section-2-content': item['section-2-content'],
                    'section-3-title': item['section-3-title'],
                    'section-3-content': item['section-3-content'],
                    'section-4-title': item['section-4-title'],
                    'section-4-content': item['section-4-content'],
                    'section-5-title': item['section-5-title'],
                    'section-5-content': item['section-5-content'],
                    'section-6-title': item['section-6-title'],
                    'section-6-content': item['section-6-content'],
                    'section-7-title': item['section-7-title'],
                    'section-7-content': item['section-7-content'],
                    'section-8-title': item['section-8-title'],
                    'section-8-content': item['section-8-content'],
                    'section-9-title': item['section-9-title'],
                    'section-9-content': item['section-9-content'],
                    'section-10-title': item['section-10-title'],
                    'section-10-content': item['section-10-content'],
                    'related-pages': item['related-pages'],
                    permalink
                }
            });

            const updatedArticle = await axios.patch(`${airtableApiEndpoint}Content/${article.id}?api_key=${airtableApiKey}`, {
                fields: {
                    'Updated?': true
                }
            });
            console.log('UPDATES:', updatedItem.name, " - ", updatedArticle.data.fields.Title);
        }

    } catch (e) {
        console.log('ERROR:', e)
    }
}


//ON PUBLISH IN AIRTABLE, CREATE NEW PAGE IN WEBFLOW



//ON PUBLISH IN WEBFLOW, UPDATE THE RECORDS IN AIRTABLE



//CREATE GOOGLE DOCS FROM PUBLISHED DATA



// addArticleId();

