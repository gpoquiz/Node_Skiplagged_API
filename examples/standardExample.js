
const flightScanner = require('../');

const flightOptions = {
   from: [
    'AMS',
    'ATH',
    'BCN',
    'BER',
    'BRU',
    'BUD',
    'CDG',
    'CPH',
    'DUB',
    'FCO',
    'FRA',
    'GVA',
    'IST',
    'LHR',
    'LIS',
    'MAD',
    'MUC',
    'OSL',
    'PRG',
    'TXL',
    'VIE',
    'WAW',
    'ZRH'
  ],
  to: 'ORD',
  departureDate: '2023-06-28',
  sort: 'duration',
  resultsCount: 99
};

flightScanner(flightOptions).catch(console.error).then(res=>console.log(res));

