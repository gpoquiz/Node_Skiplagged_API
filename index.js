const airports = require('airport-codes')

module.exports = async function (flightOptions = {}) {
    flightOptions.resultsCount =
        flightOptions.resultsCount > -1
            ? flightOptions.resultsCount || Infinity
            : 1 //Number of results to display, Skiplagged has their own limit
    flightOptions.partialTrips = flightOptions.partialTrips || false //Example: Orlando -> San Fran -> Tokyo (Actual Stop) -> Hong Kong

    flightOptions.sort = flightOptions.sort || 'cost' //cost || duration || path
    const { from, to, departureDate, returnDate, sort = 'cost' } = flightOptions
    if (!from) {
        throw '"from" is a required field!'
    }
    if (!to) {
        throw '"to" is a required field!'
    }
    if (!departureDate) {
        throw '"departureDate" is a required field!'
    }

    const webCall = []
    const urls = []
    const data = []
    const jsonData = []
    flightOptions.from.forEach((from) => {
        flightOptions.to.forEach((to) => {
            const url = `https://skiplagged.com/api/search.php?from=${from}&to=${to}&depart=${departureDate}&sort=${sort}${
                returnDate ? `&return=${returnDate}` : ''
            }`
            webCall.push(
                fetch(url, { method: 'GET' }).then((response) => {
                    if (response.ok) {
                        // add URL to this array
                        data.push(response.json())
                        urls.push({ code: from, to })
                    } else console.log(response)
                })
            )
        })
    })
    await Promise.allSettled(webCall).then((results) =>
        results.forEach((result) => {
            console.log(result)
        })
    )
    await Promise.allSettled(data).then((results) =>
        results.forEach((result) => {
            let x = results
            if (result.status != 'rejected' && result.value.success != false)
                jsonData.push(result.value)
            else console.error(result)
        })
    )

    /// TODO - change to to accept array
    const {
        attributes: { city: toCityName },
    } = airports.findWhere({ iata: to })
    const { resultsCount, partialTrips, maxDurationSeconds } = flightOptions
    const flights = []
    jsonData.forEach((flightData) =>
        flightData.depart.forEach((flight, count) => {
            if (count >= resultsCount && flights.length >= resultsCount) return
            const [priceArray, , flight_key_long, key] = flight
            const [pricePennies] = priceArray

            const flightKey = flightData.flights[key]
            const [legs, flightDurationSeconds] = flightKey

            const currentFlight = {
                price: '$' + (pricePennies / 100).toFixed(2),
                price_pennies: pricePennies,
                duration: parseDurationInt(flightDurationSeconds),
                durationSeconds: flightDurationSeconds,
                departureTime: '',
                arrivalTime: '',
                legs: [],
                flight_key: key,
                flight_key_long,
            }

            for (let i = 0; i < legs.length; i++) {
                const [
                    flightCode,
                    departAirport,
                    departeDatetime,
                    arriveAirport,
                    arriveDatetime,
                ] = legs[i]
                const departureZone = airports
                    .findWhere({ iata: departAirport })
                    .get('tz')

                // TODO - write explanation, possible prune
                const {
                    attributes: { city: arriveCityName },
                } = airports.findWhere({ iata: arriveAirport })
                if (
                    // TODO - what does this do
                    arriveCityName !== toCityName &&
                    partialTrips === true &&
                    i === legs.length - 1
                ) {
                    return
                }

                const durationSeconds = findTimestampDifference(
                    departeDatetime,
                    arriveDatetime
                )
                const duration = parseDurationInt(durationSeconds)
                const airline = flightData.airlines[flightCode.substring(0, 2)]
                const departureAirport = airports.findWhere({
                    iata: departAirport,
                })
                const arrivalAirport = airports.findWhere({
                    iata: arriveAirport,
                })
                const departingFrom =
                    departureAirport.get('name') +
                    ', ' +
                    departAirport +
                    ', ' +
                    departureAirport.get('city') +
                    ', ' +
                    departureAirport.get('country')
                const arrivingAt =
                    arrivalAirport.get('name') +
                    ', ' +
                    arriveAirport +
                    ', ' +
                    arrivalAirport.get('city') +
                    ', ' +
                    arrivalAirport.get('country')
                const departureTime = Date.parse(
                    legs[i][2],
                    'dddd, MMMM Do YYYY, hh:mma'
                )
                const arrivalTime = Date.parse(
                    arriveDatetime,
                    'dddd, MMMM Do YYYY, hh:mma'
                )

                const current_leg = {
                    airline,
                    flightCode,
                    duration,
                    durationSeconds,
                    departingFrom,
                    departureTime,
                    departeDatetime,
                    arrivingAt,
                    arrivalTime,
                    arriveDatetime,
                }
                if (i > 0) {
                    current_leg.layoverSeconds = findTimestampDifference(
                        currentFlight.legs[i - 1].arriveDatetime,
                        departeDatetime
                    )
                    current_leg.layover = parseDurationInt(
                        current_leg.layoverSeconds
                    )
                }
                if (i === 0) {
                    currentFlight.departureTime = departureTime
                } else if (i === legs.length - 1) {
                    currentFlight.arrivalTime = arrivalTime
                }

                currentFlight.legs.push(current_leg)
            }

            let firstLeg = currentFlight.legs[0]
            let lastLeg = currentFlight.legs.slice(-1)[0]
            currentFlight.departureTime = firstLeg.departureTime
            currentFlight.arrivalTime = lastLeg.departureTime
            if (
                findTimestampDifference(
                    firstLeg.departeDatetime,
                    lastLeg.arriveDatetime
                ) > maxDurationSeconds
            )
                return

            flights.push(currentFlight)
        })
    )

    return flights
}

function parseDurationInt(duration) {
    const minutes = Math.round(duration / 60)
    let durationString = ''

    let minutesString =
        minutes !== 0 ? minutes + ' Minute' + (minutes > 1 ? 's' : '') : ''

    if (minutes >= 60) {
        const minutesR = minutes % 60
        const hours = (minutes - minutesR) / 60

        let hoursString =
            hours !== 0 ? hours + ' Hour' + (hours > 1 ? 's ' : ' ') : ''

        minutesString =
            minutes - hours * 60 !== 0
                ? minutes -
                  hours * 60 +
                  ' Minute' +
                  (minutes - hours * 60 > 1 ? 's' : '')
                : ''

        if (hours >= 24) {
            const hoursR = hours % 24
            const days = (hours - hoursR) / 24

            hoursString =
                hours - days * 24 !== 0
                    ? hours -
                      days * 24 +
                      ' Hour' +
                      (hours - days * 24 > 1 ? 's ' : ' ')
                    : ''

            durationString =
                days +
                ' Day' +
                (days > 1 ? 's ' : ' ') +
                hoursString +
                minutesString
        } else {
            durationString = hoursString + minutesString
        }
    } else {
        durationString = minutesString
    }

    return durationString
}

function findTimestampDifference(startTimestamp, endTimestamp) {
    return (Date.parse(endTimestamp) - Date.parse(startTimestamp)) / 1000
}
