const mtg = require('mtgsdk')
const fs = require('fs')
const cliProgress = require('cli-progress');
const { table } = require('table');

const usage = () => {
  console.log("usage: one of the following")
  console.log("node mtget --deck <deckname.json>")
  console.log("npm run mtget -- --deck <deckname.json>")
  process.exit(0)
}
const getDeck = () => {
  const deckIndex = process.argv.indexOf('--deck');
  let customValue;

  if (deckIndex < 0) {
    usage()
  }
  customValue = process.argv[deckIndex + 1];
  const deckFileName = (customValue || 'deck');

  if (deckFileName.indexOf('json') < 0) {
    usage()
  }

  try {
    return JSON.parse(fs.readFileSync(deckFileName, 'utf8'))
  } catch (e) {
    console.log("specified deck file not found")
    usage()
  }
}
async function getCardListData(deck) {

  console.log("Fetching card data. This WILL take a (long) while")
  const loadingBar = new cliProgress.SingleBar({
    hideCursor: true
  }, cliProgress.Presets.shades_classic);
  loadingBar.start(deck.length, 0);

  let errors = [], notFound = [], cards = {}

  for (const card of deck) {
    await mtg.card.where({name: card})
      .then(results => {
        loadingBar.increment()
        if (!results.length) {
          notFound.push(card)
        } else {
          cards[card] = results[0]['legalities']
        }
      }).catch(() => {
          loadingBar.increment()
          errors.push(card)
        }
      )
  }

  loadingBar.stop()

  if (errors.length) {
    console.log("There was an error fetching the following cards")
    console.log(errors)
  }
  if (notFound.length) {
    console.log("The following cards were not found")
    console.log(notFound)
  }

  return cards
}

getCardListData(getDeck()).then((cardList) => {
  // leave card list with only legal formats
  let formats = []

  for (const [card, legalities] of Object.entries(cardList)) {
    const cardLegality = legalities.filter((legality) => {
      return legality['legality'] === 'Legal'
    })
    cardList[card] = cardLegality

    cardLegality.forEach((legality) => {
      formats.push(legality.format)
    })
  }
  formats = formats.filter((item, index) => formats.indexOf(item) === index);

  const tableData = [];

  tableData.push([""].concat(formats))

  for (const [card, legalities] of Object.entries(cardList)) {
    const cardLegality = []
    formats.forEach((format)=>{
      const filteredLegality = legalities.filter(legality=>legality.format === format)
      cardLegality.push(filteredLegality.length?"X":"")
    })
    tableData.push([card].concat(cardLegality))
  }

  const tableConfig = {
    columnDefault: {
      alignment: 'center'
    }
  };
  console.log(table(tableData, tableConfig));
})

