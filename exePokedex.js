// The things I need for my request
const axios = require('axios');
const { Client } = require("@notionhq/client");

// I create a new client
const notion = new Client({auth:process.env.Notion_Key})

const pokeArray = [];
const numberOfPokemon = 10; 

async function getPokemon(){

    for (let i = 2; i<numberOfPokemon; i++)
    {
        // We use axios to fetch the data from PokeApi (callAPI)
        await axios.get(`https://pokeapi.co/api/v2/pokemon/${i}`).then((poke) => {
        //Example to get the name
        // const name = poke.data.name;
        // console.log(name);
        // console.log(poke);        
            
        // Due to multiple changes, we make a condition to give a value for sprite: if it doesn't existe, take the artwork, else use this path
        const sprite = (!poke.data.sprites.front_default) ? poke.data.sprites.other["official-artwork"].front_default : poke.data.sprites.front_default;

        // Pokemons can have multiple types so we have to create an array with all the types
        const typesArray = [];

        for (let type of poke.data.types) {
            const typeObj = {
                "name": type.type.name,
            }
            typesArray.push(typeObj);
        }
        
        // We want the name to be formatted for all the table
            // 1. We want all the things between the "/"

        const formatedName = poke.data.species.name
            .split("-")
            .map((name)=>{
                return name[0].toUpperCase() + name.substring(1);
            })
            .join(" ")
            .replace("Mr","Mr.")

        // We want a link to the wiki (https://bulbapedia.bulbagarden.net/wiki/Bulbasaur_(Pok%C3%A9mon))
        const bulbUrl = `https://bulbapedia.bulbagarden.net/wiki/${formatedName.replace(' ','_')}_(Pokémon)`

        //We want to get the data for all the Pokemons, so we put an object

        const pokeData = {
            "name": formatedName,
            "number": poke.data.id,
            "hp": poke.data.stats[0].base_stat,
            "height": poke.data.height,
            "weight": poke.data.weight,
            "attack":poke.data.stats[1].base_stat,
            "defense":poke.data.stats[2].base_stat,
            "special_attack":poke.data.stats[3].base_stat,
            "special_defense":poke.data.stats[4].base_stat,
            "speed":poke.data.stats[5].base_stat,
            "sprite": sprite, //we make a const because a lot of changes everytime there is a ew generation
            "artwork":poke.data.sprites.other["official-artwork"].front_default,
            "types":typesArray,
            "bulbUrl":bulbUrl,
        }

        pokeArray.push(pokeData);
        console.log(`Fetching ${pokeData.name} from PokeAPI.`);
        })
        .catch((error) => {
            console.log(error);
        })
    }
    for (let pokemon of pokeArray){ 
        const flavor = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.number}`)
        .then((flavor)=>{
            // console.log(flavor);// for debug
            const flavorText = flavor.data.flavor_text_entries
            .find(({language: {name}}) => name === "en").flavor_text //on doit chercher une valeur dans un objet, lui même situé dans un objet
            .replace(/\n|\r|\f/g," "); //The result isn't a nice string, so we will work it out removing return line ;
            
            console.log(flavorText);//for debug

            pokemon["flavor-text"] = flavorText; //we add it in the pokemon object
            
            const category = flavor.data.genera
            .find(({language: {name}}) => name === "en").genus;
            console.log(category);//for debug
        
            pokemon.category= category; // we add it in the object pokemon

            const generation = flavor.data.generation.name
            .split("-") //the data is generation-i : we only want i and pass it in uppercase for roman number
            .pop()
            .toUpperCase();
            console.log(generation);//for debug

            pokemon.generation = generation;
        })
    }

    createNotionPage();
}

getPokemon();

// We create an async function to push the data in the Notion Page, 
//respecting the way Notion wants it to work
//see:https://developers.notion.com/reference/property-value-object

async function createNotionPage(){
    for(let pokemon of pokeArray)
        {
        // console.log("Sending data to Notion");//for debug
        const response = await notion.pages.create(
        {
            "parent":{
                "type":"database_id",
                "database_id":process.env.Notion_Database_Id
            },
            "cover":{
                "type":"external",
                "external":{
                    "url":pokemon.artwork,
                }
            },
            "icon":{
                "type":"external",
                "external":{
                    "url":pokemon.sprite,
                }
            },
            "properties":{
                // The name of the properties have to match the ones in the Notion Doc
                "Name":{"title":[{
                            "type":"text",
                            "text":{"content":pokemon.name}
                            }]
                        },
                "No":{"number":pokemon.number},
                "HP":{"number":pokemon.hp},
                "Height":{"number":pokemon.height},
                "Weight":{"number":pokemon.weight},
                "Attack":{"number":pokemon.attack},
                "Defense":{"number":pokemon.defense},
                "Sp. Attack":{"number":pokemon.special_attack},
                "Sp. Defense":{"number":pokemon.special_defense},
                "Speed":{"number":pokemon.speed},
                "Type":{"multi_select":pokemon.types},
                "Generation" : {"select": {"name":pokemon.generation}},
                "Category":{"rich_text": [{
                                "type":"text",
                                "text": {"content": pokemon.category},
                                }]
                            },
            },
            "children":[
                {
                    "object":"block",
                    "type" :"quote",
                    "quote":{
                        "rich_text":[
                            {
                                "type":"text",
                                "text":{
                                    "content":pokemon["flavor-text"],
                                },
                            },
                        ]
                    },
                },
                {
                    "object":"block",
                    "type" :"paragraph",
                    "paragraph":{
                        "rich_text":[
                            {
                                "type":"text",
                                "text":{
                                    "content": "Find more info on this pokémon on the website below:"
                                },
                            },
                        ]
                    },
                },
                {
                    "object":"block",
                    "type":"bookmark",
                    "bookmark":{
                        "url":pokemon.bulbUrl,
                    },
                },
            ]

        })
        // console.log(response); //To check the data that is sent to Notion
    }
}