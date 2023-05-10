
const flightScanner = require('../');

const searchOptions = {
  from: 'PDX',
  to: 'JFK',
  departureDate: '2023-05-09'
};

(async () => {
  try {
    const flights = await flightScanner(searchOptions);
    console.log(flights);
  }
  catch(err) {
    console.error(err);
  }
})();

