const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {marked} = require('marked');
require("dotenv").config(); 
const passport = require('passport');


const isLoggedIn = (req,res,next)=>{
    // console.log(req.originalUrl);
    // console.log(req.xhr);
    if(req.xhr && !req.isAuthenticated()){
        return res.status(401).json({msg:'you need to login first'});
    }
    
    if(!req.isAuthenticated()){
        req.flash('error' , 'you need to login first');
        return res.redirect('/login');
    }
    next();
} 


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


async function getGeminiResponse(message, product) {
  try {
    // console.log(message);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
      systemInstruction: `You are a helpful assistant that provides information about products. If the user asks about ${product.name}, provide details about it. If the user asks about a different product, inform them that only information about ${product.name} is available in this chat and first try to use ${product} for responding for requests like price, etc. if not available in ${product} then use the your thinking.`,
    });
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();
    const markdownText=marked.parse(text);

    // console.log("Gemini Raw Response:", text); 

    return markdownText;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error.response) {
      console.error("API Error Status:", error.response.status);
      console.error("API Error Text:", error.response.statusText);
      console.error("API Error Details:", error.errorDetails);
    }
    throw new Error("Failed to get response from AI model."); 
  }
}

router.post('/products/:productid/chatbot', isLoggedIn, async (req, res) => {
  try {
    const { productid } =await req.params;
    const { message } =await req.body; 
    // console.log(message);
    const product = await Product.findById(productid);
    if (!product) {
      return res.status(404).json({ error: 'Product Not Found' }); 
    }

    const aiResponse = await getGeminiResponse(message, product);

    res.status(200).json({ response: aiResponse }); 
  } catch (e) {
    console.error("Error in chatbot route:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" }); 
  }
});

module.exports = router; 