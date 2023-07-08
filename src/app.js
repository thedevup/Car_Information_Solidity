import detectEthereumProvider from '@metamask/detect-provider';
import CarInformation from '../build/contracts/CarInformation.json';
// Stil going to work on it later
//import IPFS from 'ipfs-http-client';


const App = {
  web3: null,
  account: null,
  carInformation: null,

  init: async function () {
    await this.initWeb3();
    await this.loadBlockchainData();
    await this.displayCarsForSale();
    await this.displayUserCars();
    document.getElementById('addCarButton').addEventListener('click', App.handleRegisterCarForm.bind(App));

    // Adding a dummy car for debugin
    // await this.registerCar("somthing", "Nour", "Tesla", "model 3", "red");
    // await this.markCarForSale("somthing", 4563456);
    // await this.addMileage("somthing", 3456345);
  },

  initWeb3: async function () {
    const provider = await detectEthereumProvider();

    if (provider) {
      console.log('Ethereum provider found');
      this.web3 = new Web3(provider);
    } else {
      console.error('No Ethereum provider found. Please install MetaMask.');
      alert('No Ethereum provider found. Please install MetaMask.');
    }
  },

  loadBlockchainData: async function () {
    const accounts = await this.web3.eth.getAccounts();
    this.account = accounts[0];
    console.log('Account:', this.account);

    const networkId = await this.web3.eth.net.getId();
    const networkData = CarInformation.networks[networkId];
    // Update the "Connect Wallet" button text with a shortened wallet address
    const shortAddress = this.account.slice(0, 6) + '...' + this.account.slice(-4);
    document.getElementById('connectWalletBtn').innerText = shortAddress;

    if (networkData) {
      this.carInformation = new this.web3.eth.Contract(
        CarInformation.abi,
        networkData.address
      );
      await this.displayCarsForSale();
      console.log('CarInformation contract:', this.carInformation);
    } else {
      console.error('CarInformation contract not found on the current network.');
      alert('CarInformation contract not found on the current network.');
    }
  },

  connectWallet: async function () {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        await this.loadBlockchainData();

        // If the wallet is successfuly connected, the user will be redirected to the dashboard
        // The user can still add /dashboard to the link and see the dashboard template, so this can still be improved, idk probably use React
        window.location.replace('dashboard.html');
      } catch (error) {
        console.error('User rejected wallet connection:', error);
      }
    } else {
      console.error('No Ethereum provider found. Please install MetaMask.');
      alert('No Ethereum provider found. Please install MetaMask.');
    }
  },

  createCarCard: function (car) {
    const {
      licensePlate,
      chassisNumber,
      brand,
      carType,
      color,
      mileage,
      forSale,
      price,
      owner,
      mileageHistory,
      ownershipHistory
    } = car;

    const ownersCount = ownershipHistory.length;

    return `
      <div class="carCard">
        <img src="https://hips.hearstapps.com/hmg-prod/images/2023-ford-gt-mk-iv-02-1670543667.jpg" alt="Car Image">
        <div class="carCardTitle">${brand} - ${carType}</div>
        <button class="searchButtons detailButton"><b>Price</b> : ${price/(10**18)} ETH</button>
        <div class="carDetailButtons">
          <button class="searchButtons detailButton"><b>Color</b> : ${color}</button>
          <button class="searchButtons detailButton"><b>Previous Owner(s)</b> : ${ownersCount}</button>
          <button class="searchButtons detailButton"><b>Mileage</b> : ${mileage} KMs</button>
          <button class="searchButtons detailButton"><b>Plate</b> : ${licensePlate}</button>
          <button class="searchButtons detailButton"><b>Chassis</b> : ${chassisNumber}</button>
        </div>
        <button id="mileageHistoryBtn-${licensePlate}" class="searchButtons card-buttons" data-license="${licensePlate}">Mileage History</button>
        <div class="carCardDetails">
          <button class="searchButtons card-buttons" id="makeOfferBtn-${licensePlate}" data-license="${licensePlate}">Bid</button>
          <input class="searchButtons card-buttons-msg" type="text" placeholder="price" id="amountInput-${licensePlate}">
        </div>
      </div>
    `;
  },

  createUserCarCard: function (car) {
    const {
      licensePlate,
      chassisNumber,
      brand,
      carType,
      color,
      mileage,
      forSale,
      price,
      owner,
      mileageHistory,
      ownershipHistory
    } = car;

    const ownersCount = ownershipHistory.length;

    return `
      <div class="carCard">
        <img src="https://hips.hearstapps.com/hmg-prod/images/2023-ford-gt-mk-iv-02-1670543667.jpg" alt="Car Image">
        <div class="carCardTitle">${brand} - ${carType}</div>
        <div class="carDetailButtons">
          <button class="searchButtons detailButton"><b>Color</b> : ${color}</button>
          <button class="searchButtons detailButton"><b>Previous Owner(s)</b> : ${ownersCount}</button>
          <button class="searchButtons detailButton"><b>Mileage</b> : ${mileage} KMs</button>
          <button class="searchButtons detailButton"><b>Plate</b> : ${licensePlate}</button>
          <button class="searchButtons detailButton"><b>Chassis</b> : ${chassisNumber}</button>
        </div>
        <div class="carCardDetails">
          <button class="searchButtons card-buttons" id="addMileageBtn-${licensePlate}" data-license="${licensePlate}">Add Mileage</button>
          <input class="searchButtons card-buttons-msg" type="text" placeholder="KMs" id="mileageInput-${licensePlate}">
        </div>
        <div class="carCardDetails">
          <button class="searchButtons card-buttons" id="setForSaleBtn-${licensePlate}" data-license="${licensePlate}">Set for Sale</button>
          <input class="searchButtons card-buttons-msg" type="text" placeholder="price" id="priceInput-${licensePlate}">
        </div>
        <button class="searchButtons card-buttons offers" id="offersBtn-${licensePlate}">Offers</button>
        <button class="searchButtons card-buttons offers" style="background:red;" id="removeFromSaleBtn-${licensePlate}">Remove from Sale</button>
      </div>
    `;
  },

  displayCarsForSale: async function () {
    try {

      const licensePlates = await this.carInformation.methods.getCarsForSale().call();
      console.log(licensePlates);
      const carPromises = licensePlates.map((licensePlate) =>
        this.carInformation.methods.getCarInfo(licensePlate).call()
      );
      const carsData = await Promise.all(carPromises);

      const cars = carsData.map(carData => {
        return {
          licensePlate: carData[0],
          chassisNumber: carData[1],
          brand: carData[2],
          carType: carData[3],
          color: carData[4],
          mileage: carData[5],
          forSale: carData[6],
          price: carData[7],
          owner: carData[8],
          mileageHistory: carData[9],
          ownershipHistory: carData[10],
        };
      });

      // Display the cars for sale using the 'cars' array
      const carCards = cars.map((car) => this.createCarCard(car)).join('');
      document.querySelector('.carCards').innerHTML = carCards;

      cars.forEach((car) => {
        document
          .getElementById(`mileageHistoryBtn-${car.licensePlate}`)
          .addEventListener('click', () => {
            App.showMileageHistory(car.licensePlate);
          });

        document
          .getElementById(`makeOfferBtn-${car.licensePlate}`)
          .addEventListener('click', () => {
            const amountInput = document.getElementById(`amountInput-${car.licensePlate}`).value;

            // Here I convert from WEI to ETH
            App.makeOffer(car.licensePlate, App.web3.utils.toWei(amountInput, 'ether'));
          });
      });

      // Update the "Showing x Cars" text on the front page
      const carsCount = cars.length;
      document.querySelector('.searched-show').textContent = `Showing ${carsCount} Cars`;
    } catch (error) {
      console.error(error);
      alert("Error the cars that are for sale");
    }
  },

  displayUserCars: async function () {
    try {
      const licensePlates = await this.carInformation.methods.getCarsByOwner(this.account).call();
      console.log(licensePlates);
      const carPromises = licensePlates.map((licensePlate) =>
        this.carInformation.methods.getCarInfo(licensePlate).call()
      );
      const carsData = await Promise.all(carPromises);

      const cars = carsData.map(carData => {
        return {
          licensePlate: carData[0],
          chassisNumber: carData[1],
          brand: carData[2],
          carType: carData[3],
          color: carData[4],
          mileage: carData[5],
          forSale: carData[6],
          price: carData[7],
          owner: carData[8],
          mileageHistory: carData[9],
          ownershipHistory: carData[10],
        };
      });

      const carCards = cars.map((car) => this.createUserCarCard(car)).join('');
      document.querySelector('#userCars').innerHTML = carCards


      // Event listeners for when the buttons are clicked
      cars.forEach((car) => {
        document
          .getElementById(`addMileageBtn-${car.licensePlate}`)
          .addEventListener('click', () => {
            const mileageInput = document.getElementById(`mileageInput-${car.licensePlate}`).value;
            App.addMileage(car.licensePlate, mileageInput);
          });

        document
          .getElementById(`setForSaleBtn-${car.licensePlate}`)
          .addEventListener('click', () => {
            const priceInput = document.getElementById(`priceInput-${car.licensePlate}`).value;
            App.setCarForSale(car.licensePlate, App.web3.utils.toWei(priceInput, 'ether'));

          });

        document
          .getElementById(`offersBtn-${car.licensePlate}`)
          .addEventListener('click', () => {
            App.showOffers(car.licensePlate);
          });

        document
          .getElementById(`removeFromSaleBtn-${car.licensePlate}`)
          .addEventListener('click', () => {
            App.removeFromSale(car.licensePlate);
          });
        });
    } catch (error) {
      console.error(error);
      alert("Error fetching user's cars");
    }
  },

  addMileage: async function (licensePlate, mileage) {
    try {
      const result = await this.carInformation.methods
        .addMileage(licensePlate, mileage)
        .send({ from: this.account });
      console.log('Mileage added successfully:', result);
    } catch (error) {
      console.error('Error adding mileage:', error);
    }
  },

  removeFromSale: async function (licensePlate) {
    try {
      const result = await this.carInformation.methods
        .notForSale(licensePlate)
        .send({ from: this.account });
      console.log('Car is set as not for sale successfully:', result);
    } catch (error) {
      console.error('Error setting the car as not for sale:', error);
    }
  },

  setCarForSale: async function (licensePlate, price) {
    try {
      const result = await this.carInformation.methods
        .markForSale(licensePlate, price)
        .send({ from: this.account });
      console.log('Car set for sale successfully:', result);
    } catch (error) {
      console.error('Error setting car for sale:', error);
    }
  },

  makeOffer: async function (licensePlate, amount) {
    try {
      const result = await this.carInformation.methods
        .makeOffer(licensePlate, amount)
        .send({ from: this.account, value: amount });
      console.log('Bid sent successfully:', result);
    } catch (error) {
      console.error('Error making a bid:', error);
    }
  },

  acceptOffer: async function (licensePlate, index) {
    try {
      const result = await this.carInformation.methods
        .acceptOffer(licensePlate, index)
        .send({ from: this.account });
      console.log('Offer accepted successfully:', result);
    } catch (error) {
      console.error('Error accepting offer:', error);
    }
  },

  showOffers: async function (licensePlate) {
    try {
      const offers = await this.carInformation.methods.getOffers(licensePlate).call();
      console.log('Offers:', offers);

      const offersList = document.querySelector('.offers-list');
      offersList.innerHTML = '';

      offers.forEach((offer, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `Bidder: ${offer.buyer}, Amount: ${offer.amount/(10**18)} ETH `;

        const acceptButton = document.createElement('button');
        acceptButton.textContent = 'Accept';
        acceptButton.style.backgroundColor = 'green';
        acceptButton.style.color = 'white';
        acceptButton.addEventListener('click', () => {
          App.acceptOffer(licensePlate, index);
        });

        listItem.appendChild(acceptButton);
        offersList.appendChild(listItem);
      });

      const popup = document.getElementById('offersPopup');
      const closeButton = document.querySelector('.close');
      popup.style.display = 'block';

      closeButton.onclick = function () {
        popup.style.display = 'none';
      };
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  },


  setCarNotForSale: async function (licensePlate) {
    try {
      const result = await this.carInformation.methods
        .markNotForSale(licensePlate)
        .send({ from: this.account });
      console.log('Car set as not for sale successfully:', result);
    } catch (error) {
      console.error('Error setting car as not for sale:', error);
    }
  },


  showMileageHistory: async function (licensePlate) {
    try {
      const mileageHistory = await this.carInformation.methods.getMileageHistory(licensePlate).call();
      console.log('Mileage history:', mileageHistory);

      // display mileage history in as an allert notification
      alert(`Mileage history for ${licensePlate}: ${mileageHistory.join(', ')}`);
    } catch (error) {
      console.error('Error fetching mileage history:', error);
    }
  },

  registerCar: async function (licensePlate, chassisNumber, brand, carType, color) {
    try {
      const result = await this.carInformation.methods
        .registerCar(licensePlate, chassisNumber, brand, carType, color)
        .send({ from: this.account });
      console.log('Car registered successfully:', result);
    } catch (error) {
      console.error('Error registering car:', error);
    }
  },

  handleRegisterCarForm: async function (event) {
    event.preventDefault();

    const licensePlate = document.getElementById('licensePlate').value;
    const chassisNumber = document.getElementById('chassisNumber').value;
    const brand = document.getElementById('brand').value;
    const carType = document.getElementById('carType').value;
    const color = document.getElementById('color').value;

    await this.registerCar(licensePlate, chassisNumber, brand, carType, color);
    alert("Car registered successfully");

    // Clear the form after it has been submitted
    const form = document.getElementById('registerCarForm');
    form.reset();
  },

  markCarForSale: async function (licensePlate, price) {
    try {
      const result = await this.carInformation.methods
        .markForSale(licensePlate, price)
        .send({ from: this.account });
      console.log('Car marked for sale successfully:', result);
    } catch (error) {
      console.error('Error marking car for sale:', error);
    }
  },

};

window.App = App;

window.addEventListener('load', async () => {
  await App.init();
});
