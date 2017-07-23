const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2');
const translator = new LanguageTranslatorV2({
  username: process.env.WATSON_USERNAME,
  password: process.env.WATSON_PASSWORD,
  url: 'https://gateway.watsonplatform.net/language-translator/api/'
});

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const translateCurrier = (sourceLang) => (targetLang) => (toBeTranslated) => {
    return new Promise((resolve, reject) => {
        translator.translate({text: toBeTranslated, source: sourceLang, target: targetLang}, (err, result) => {
            if(err) {
                resolve(err);
            }else {
                const translatedText = result['translations'][0]['translation'];
                resolve(translatedText);
            }
        });
    });
};

const languageIdentifier = (text) => {
    return new Promise((resolve, reject) => {
        translator.identify({text: text}, (err, language) => {
            resolve(language.languages[0].language);
        });
    });
}

const fromEnglish = translateCurrier('en');
/*
languages that work so far:
    - es, de, fr, it, ja, ko, pt (portuguese), 
*/

app.post('/:lang', (req, res) => {
    const targetLanguage = req.params.lang;
    const textToTranslate = req.body.text;
    if(targetLanguage !== 'en') {
        const fromEnglishToTargetLanguage = fromEnglish(targetLanguage);
        const responseFromTranslator = fromEnglishToTargetLanguage(textToTranslate);
        responseFromTranslator.then((responseText) => {
            res.send({
                'text': responseText,
                'response_type': 'in_channel'
            });
        });
    }else {
        const detectedLanguage = languageIdentifier(textToTranslate);
        detectedLanguage.then(sourceLang => {
            const translateToEnglish = translateCurrier(sourceLang)('en');
            return translateToEnglish(textToTranslate)
        })
        .then(translatedText => {
            res.send({
                'text': translatedText,
                'response_type': 'in_channel'
            });
        })
    }
});

app.listen(process.env.PORT || 3001, () => console.log(`listening on ${process.env.PORT}`));
