class Offie {
    constructor() {
        this.api_wrapper = undefined;
        this.results = undefined;
        this.utility = undefined;
        this.view = undefined;
        this.settings = undefined;
    }

    init() {
        try {
            let api_wrapper = new ApiWrapper(),
                results = new Results(),
                utility = new Utility(),
                view = new View(),
                settings = new Settings();

            this.api_wrapper = api_wrapper;
            this.results = results;
            this.utility = utility;
            this.view = view;
            this.settings = settings;

            this.api_wrapper.results = results;
            this.api_wrapper.utility = utility;

            this.results.api_wrapper = api_wrapper;
            this.results.utility = utility;
            this.results.view = view;

            this.view.utility = utility;
            this.view.settings = settings;
            this.view.api_wrapper = api_wrapper;

            this.utility.api_wrapper = api_wrapper;
            this.utility.results = results;
            this.utility.view = view;
            this.utility.settings = settings;

            this.settings.view = view;

            return this;
        }
        catch(error) {
            console.error(error);
            return false;
        }
    }
}

class Settings {
    constructor() {
        this.language = 'eng';
        this.units = 'miles';
        this.theme = 'light';
        this.showMap = true;
        this.view = undefined;
    }

    updateSettings() {
        this.language = document.getElementById('language-select').value;
        let unitRadios = document.getElementsByName('units');
        unitRadios.forEach(function(a) {
            if(a.checked) {
                this.units = a.value;
            }
        }.bind(this));

        if(document.getElementById('darkmode').checked === true)
            this.theme = 'dark';
        else
            this.theme = 'light';

        this.view.changeStyle();

        return this;
    }
}

class ApiWrapper {
    constructor() {
        this.map = undefined;
        this.service = undefined;
        this.geocoder = undefined;
        this.results = undefined;
        this.utility = undefined;
        this.storeTypes = ['convenience_store', 'gas_station', 'liquor_store', 'supermarket'];
    }

    runSearch() {
        if(document.getElementById("adrBox").value === "") {
            alert("Please enter an address before searching. Alternatively, use the geolocation feature.");
            return false;
        }
        else {
            document.getElementById('results-container').innerHTML = "";
            this.geocodeAddress(document.getElementById('adrBox').value);
            return true;
        }
    }

    geocodeAddress(address) {
        let latlng = {lat: 0, lng: 0},
            geocodeComplete = new Promise (function(resolve, reject) {
                    this.geocoder.geocode({'address': address}, function(results, status) {
                        if(status === 'OK') {
                            console.log(results);
                            console.log(latlng);
                            latlng = {lat: results[0].geometry.bounds.ma.j, lng: results[0].geometry.bounds.ga.j};
                            console.log("Geocode successful: " + latlng.lat + ", " + latlng.lng);
                            resolve(latlng);
                        }
                        else {
                            console.log("Geocode ERROR: " + status);
                            latlng = "Geocode ERROR: " + status;
                            reject(status);
                        }
                    });
                }.bind(this)
            );

        geocodeComplete
            .then((fulfilled) => {
                console.log("geocode complete: " + fulfilled);
                this.utility.userLoc = latlng;
                this.map.panTo(this.utility.userLoc)
                this.findOpenStores(latlng, 1000);
            })
            .catch((error) => {
                console.log(error);
                console.log("Geocode incomplete");
            });

        return latlng;
    }

    findOpenStores(location, radius) {
        for(let p of this.storeTypes) {
            if (p !== undefined) {
                console.log("Searching for... : " + p);
                this.service.nearbySearch({
                    location: location,
                    radius: radius,
                    openNow: true,
                    type: p
                }, this.results.processResults.bind(this.results));
            }
        }
    }
}

class Results {
    constructor() {
        this.resultsArray = [];
        this.timesProcessed = 0;
        this.utility = undefined;
        this.view = undefined;
        this.api_wrapper = undefined;
    }

    processResults(results, status) {
        if(status === google.maps.places.PlacesServiceStatus.OK) {
            for(let r in results) {
                let latlng = {lat: results[r].geometry.location.lat(), lng: results[r].geometry.location.lng()};
                let resultToAdd = new Shop( results[r].name,
                    results[r].vicinity,
                    latlng,
                    results[r].rating,
                    results[r].place_id,
                    this.utility.getDistance(latlng)
                );


                let found = false;
                if(this.resultsArray.length > 0) {
                    for (let j = 0; j < this.resultsArray.length; j++) {
                        if (this.resultsArray[j].placeId === resultToAdd.placeId) {
                            found = true;
                            break;
                        }
                    }
                    if(found === false) {
                        this.resultsArray.push(resultToAdd);
                    }
                }
                else {
                    this.resultsArray.push(resultToAdd);
                }
            }

            this.timesProcessed++;
            if(this.timesProcessed === this.api_wrapper.storeTypes.length) {
                this.view.populateResults(this.resultsArray, this.utility.getSortType());
                this.timesProcessed = 0;
            }
        }
        else {
            console.log("ERROR: PlacesServiceStatus - " + status);
        }
    }
}

class Shop {
    constructor(name, address, latlng, rating, placeId, distance) {
        this.name = name;
        this.address = address;
        this.latlng = latlng;
        this.rating = rating;
        this.placeId = placeId;
        this.distance = distance;
    }
}

class View {
    constructor() {
        this.results = undefined;
        this.utility = undefined;
        this.settings = undefined;
        this.api_wrapper = undefined;
    }

    populateResults(resultsArray, sortType) {
        document.getElementById('results-container').innerHTML = "";
        if(resultsArray === null) {
            resultsArray = this.results.resultsArray;
        }
        let count = 0;
        this.utility.sortResults(resultsArray, sortType);
        resultsArray.forEach(function(a) {
            count++;
            let resultsContainer = document.getElementById('results-container'),
                newElement = document.createElement("div"),
                newNode = resultsContainer.appendChild(newElement);


            newNode.setAttribute("id", a.placeId);
            newNode.setAttribute("class", "result");
            if(resultsArray.length === count)
                newNode.setAttribute("class", "result-last");

            let ratingStr = '';
            if(a.rating !== undefined)
                ratingStr = a.rating + " ★ : ";
            else
                ratingStr = " (no rating) : ";

            let unitsStr = '';
            if(this.settings.units = 'miles')
                unitsStr = 'miles away';
            else
                unitsStr = 'km away';

            let str = a.name +  ratingStr + a.distance.toFixed(2) + unitsStr + "</br>" + this.utility.getMapsUrl(a);
            let infoWindow = new google.maps.InfoWindow({
                content: str
            });
            let marker = new google.maps.Marker({
                position: a.latlng,
                map: this.api_wrapper.map,
                title: a.name
            });
            marker.addListener('click', function() {
                infoWindow.open(this.api_wrapper.map, marker);
            }.bind(this));
            newNode.innerHTML = str;
        }, this);
    }

    changeStyle() {
        let oldTheme = document.getElementById('css-theme'),
            newTheme = document.createElement('link');

        newTheme.setAttribute('rel', 'stylesheet');
        newTheme.setAttribute('type', 'text/css');
        newTheme.setAttribute('id', 'css-theme');

        if(oldTheme.href.includes('dark'))
            newTheme.setAttribute('href', 'css/light.css');
        else
            newTheme.setAttribute('href', 'css/dark.css');

        try {
            oldTheme.parentNode.replaceChild(newTheme, oldTheme);
            return newTheme;
        }
        catch(error) {
            console.log("ERROR: Could not change style - " + error);
            return error;
        }

    }
}

class Utility {
    constructor() {
        this.userLoc = {lat: 0, lng: 0};
        this.api_wrapper = undefined;
        this.results = undefined;
        this.view = undefined;
        this.settings = undefined;
    }

    sortChange(sortType) {
        if(this.results.resultsArray !== []) {
            this.view.populateResults(this.results.resultsArray, sortType);
        }
    }

    getSortType() {
        return document.getElementById('sort-dropdown').value;
    }

    geolocate() {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                let latlng = {lat: position.coords.latitude, lng: position.coords.longitude};
                this.userLoc = latlng;
                this.api_wrapper.findOpenStores(latlng, 1000);
            }.bind(this));
        } else {
            alert("Your browser doesn't support location search.");
        }
    }

    static convertDegreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    getDistance(shopLoc) {
        let radius = 6378,
            lat = Utility.convertDegreesToRadians(this.userLoc.lat - shopLoc.lat),
            lng = Utility.convertDegreesToRadians(this.userLoc.lng - shopLoc.lng);

        let a =   Math.sin(lat / 2)
            * Math.sin(lat / 2)
            + Math.cos(Utility.convertDegreesToRadians(this.userLoc.lat))
            * Math.cos(Utility.convertDegreesToRadians(this.userLoc.lat))
            * Math.sin(lng / 2)
            * Math.sin(lng / 2);

        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        let distance = radius * c;
        if(this.settings.units = 'miles') {
            distance = distance * 0.62137;
        }
        return distance;
    }

    getMapsUrl(store) {
        let url = "https://www.google.com/maps/search/?api=1&query=",
            linkText = store.address;

        url += store.name + "&query_place_id=" + store.placeId;

        return linkText.link(url);
    }

    sortResults(array, sortBy) {
        if(sortBy === 'distance') {
            array.sort(function(a,b) {
                return a.distance - b.distance;
            });
        }
        else if(sortBy === 'rating') {
            array.sort(function(a,b) {
                if(a.rating === b.rating) {
                    return b.distance - a.distance;
                }
                return b.rating - a.rating;
            });
        }
        else if(sortBy === 'name') {
            array.sort(function(a,b) {
                return a.name - b.name;
            });
        }
    }
}