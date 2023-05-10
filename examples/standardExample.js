const flightScanner = require("../");
const fs = require('fs');

const flightOptions = {
  from: [
    "AMS",
    "ATH",
    "BCN",
    "BER",
    "BRU",
    "BUD",
    "CDG",
    "CPH",
    "DUB",
    "FCO",
    "FRA",
    "GVA",
    "IST",
    "LHR",
    "LIS",
    "MAD",
    "MUC",
    "OSL",
    "PRG",
    // "TXL", Old
    "VIE",
    "WAW",
    "ZRH",
  ],
  to: "ORD",
  departureDate: "2023-06-28",
  sort: "cost",
  resultsCount: 0,
  partialTrips: true,
  maxDurationSeconds: 64800 // max length of flight in seconds (including layover)


};

let comparator = (a, b) => a.price_pennies - b.price_pennies;
flightScanner(flightOptions)
  .catch(console.error)
  .then((res) => {
    res.sort(comparator);
    let temp = res.slice(0, 10);
    temp.forEach(flight=>
      {
        console.log(flight.price + '----' + flight.duration);
        flight.legs.forEach((leg) =>{
            console.log('\t' + leg.departingFrom + '-' + leg.arrivingAt);
            console.log('\t\tLayover: ' + leg.layover);
            console.log('\t\Duration: ' + leg.duration);
        });
      });
      let content = 'Price\tDuration\tFrom\tDuration\tTo\tLayover\tFrom\tDuration\tTo\tLayover\tFrom\tDuration\tTo\tLayover\n';
      res.forEach(flight=>
        {
          content+=(flight.price + '\t' + flight.duration + '\t');
          flight.legs.forEach((leg) =>{
              content+=((leg.layover ? (leg.layover + '\t') : '') + leg.departingFrom + '\t' + leg.duration + '\t' + leg.arrivingAt +'\t');
        });
        content+='\n';
    });
    fs.writeFile('./skiplaggedOutput.txt', content, err => {
      if (err) {
        console.error(err);
      }
      console.log('Success');
      // file written successfully
    });
  });
