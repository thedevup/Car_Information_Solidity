// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

contract CarInformation {
    struct Car {
        string licensePlate;
        string chassisNumber;
        string brand;
        string carType;
        string color;
        uint256 mileage;
        uint256[] mileageHistory;
        bool forSale;
        uint256 price;
        address payable owner;
        address[] ownershipHistory;
        string[] pictures;
    }

    struct Offer {
        address buyer;
        uint256 amount;
    }

    string[] private carsForSale;

    mapping(string => Car) private cars;
    mapping(string => Offer[]) private offers;

    // Associate each owner's address with an array of their registered car license plates
    mapping(address => string[]) private ownerCars;

    event CarRegistered(string licensePlate, string chassisNumber, address owner);
    event MileageUpdated(string licensePlate, uint256 mileage);
    event CarForSale(string licensePlate, uint256 price);
    event CarSold(string licensePlate, address buyer, uint256 price);

    // Only the car owner cann perform some specific actions
    modifier onlyOwner(string memory _licensePlate) {
        require(cars[_licensePlate].owner == msg.sender, "Only the car owner can perform this action");
        _;
    }

    function registerCar(string memory _licensePlate, string memory _chassisNumber, string memory _brand, string memory _carType, string memory _color) public {
        require(bytes(_licensePlate).length > 0, "THe license plate cannot be empty");
        require(bytes(_chassisNumber).length > 0, "The chassis number cannot be empty");
        require(bytes(_brand).length > 0, "The car brand cannot be empty");
        require(bytes(_carType).length > 0, "The car type cannot be empty");
        require(bytes(_color).length > 0, "The color of the car cannot be empty");

        // Here we only check if that car ha been registered by that one person not in the whole dapp
        require(cars[_licensePlate].owner == address(0), "Car with this license plate already registered");

        address[] memory ownershipHistory = new address[](1);
        ownershipHistory[0] = msg.sender;

        Car memory newCar = Car(_licensePlate, _chassisNumber, _brand, _carType, _color, 0, new uint[](0), false, 0, payable(msg.sender), ownershipHistory, new string[](0));

        cars[_licensePlate] = newCar;
        ownerCars[msg.sender].push(_licensePlate);

        emit CarRegistered(_licensePlate, _chassisNumber, msg.sender);
    }

    function addMileage(string memory _licensePlate, uint256 _mileage) public onlyOwner(_licensePlate){
        require(_mileage > cars[_licensePlate].mileage, "New mileage should be higher than the previous value");
        require(cars[_licensePlate].owner != address(0), "Car with this license plate does not exist");
        require(_mileage > 0, "Mileage should be a positive integer");

        cars[_licensePlate].mileageHistory.push(cars[_licensePlate].mileage);
        cars[_licensePlate].mileage = _mileage;

        emit MileageUpdated(_licensePlate, _mileage);
    }

    function getCarInfo(string memory _licensePlate) public view returns (string memory, string memory, string memory, string memory, string memory, uint256, bool, uint256, address, uint256[] memory, address[] memory) {
        Car memory car = cars[_licensePlate];
        return (car.licensePlate, car.chassisNumber, car.brand, car.carType, car.color, car.mileage, car.forSale, car.price, car.owner, car.mileageHistory, car.ownershipHistory);
    }

    // Might change later
    function addPicture(string memory _licensePlate, string memory _ipfsHash) public onlyOwner(_licensePlate) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");

        cars[_licensePlate].pictures.push(_ipfsHash);
    }

    // A license plate is only pushed after we check if the car is not marker for sale
    function markForSale(string memory _licensePlate, uint256 _price) public onlyOwner(_licensePlate) {
        require(_price > 0, "The price should be greater than zero");

        if (!cars[_licensePlate].forSale) {
            carsForSale.push(_licensePlate);
        }

        cars[_licensePlate].forSale = true;
        cars[_licensePlate].price = _price;

        emit CarForSale(_licensePlate, _price);
    }


    function notForSale(string memory _licensePlate) public onlyOwner(_licensePlate) {
        cars[_licensePlate].forSale = false;
        cars[_licensePlate].price = 0;

        removeCarFromSale(_licensePlate);
    }

    // Helpper function to remove a car carsForSaleAfter
    function removeCarFromSale(string memory _licensePlate) private {
        for (uint256 i = 0; i < carsForSale.length; i++) {
            if (keccak256(abi.encodePacked(carsForSale[i])) == keccak256(abi.encodePacked(_licensePlate))) {
                carsForSale[i] = carsForSale[carsForSale.length - 1];
                carsForSale.pop();
                break;
            }
        }
    }

    // Helper funtion to remove a car from ownerCars
    function removeCarFromOwnerCars(address _owner, string memory _licensePlate) private {
        for (uint256 i = 0; i < ownerCars[_owner].length; i++) {
            if (keccak256(abi.encodePacked(ownerCars[_owner][i])) == keccak256(abi.encodePacked(_licensePlate))) {
                ownerCars[_owner][i] = ownerCars[_owner][ownerCars[_owner].length - 1];
                ownerCars[_owner].pop();
                break;
            }
        }
    }

    // not needed anymore since we let car buyer can make an offer, and the seller accepts the offer he preffers

    /*
    function buyCar(string memory _licensePlate) public payable {
        Car storage car = cars[_licensePlate];
        require(car.forSale == true, "Car is not for sale");
        require(cars[_licensePlate].owner != address(0), "Car with this license plate does not exist");
        require(msg.value >= car.price, "Insufficient payment");

        car.ownershipHistory.push(car.owner);
        car.owner.transfer(msg.value);
        car.owner = payable(msg.sender);
        car.forSale = false;
        removeCarFromSale(_licensePlate);
        emit CarSold(_licensePlate, msg.sender, msg.value);
    }
    */

    function makeOffer(string memory _licensePlate, uint256 _amount) public payable {
        Car storage car = cars[_licensePlate];
        require(car.owner != address(0), "A car with this license plate does not exist");
        require(car.forSale, "A car is not for sale");
        require(msg.value == _amount, "Offer amount must match the sent value");

        // Push the new offer to the array of offers for the car
        offers[_licensePlate].push(Offer(msg.sender, _amount));
    }

    function acceptOffer(string memory _licensePlate, uint256 _index) public onlyOwner(_licensePlate) {
        require(_index < offers[_licensePlate].length, "Invalid offer index");
        Offer storage offer = offers[_licensePlate][_index];
        require(offer.buyer != address(0), "No offer found for this car");

        // If the offer is accepted, the amount is transferred from the smart contract to the owner
        cars[_licensePlate].owner.transfer(offer.amount);
        cars[_licensePlate].ownershipHistory.push(cars[_licensePlate].owner);

        // Update ownerCars mapping for the seller
        removeCarFromOwnerCars(cars[_licensePlate].owner, _licensePlate);

        cars[_licensePlate].owner = payable(offer.buyer);
        cars[_licensePlate].forSale = false;

        // Update ownerCars mapping for the buyer
        ownerCars[offer.buyer].push(_licensePlate);

        removeCarFromSale(_licensePlate);
        emit CarSold(_licensePlate, offer.buyer, offer.amount);

        // Remove the accepted offer from the offers array
        offers[_licensePlate][_index] = offers[_licensePlate][offers[_licensePlate].length - 1];
        offers[_licensePlate].pop();
    }

    // Not needed anymore since the owner can just accept one offer, and the others get automatically declined

    /*
    function declineOffer(string memory _licensePlate, uint256 _index) public onlyOwner(_licensePlate) {
        require(_index < offers[_licensePlate].length, "Invalid offer index");
        Offer storage offer = offers[_licensePlate][_index];
        require(offer.buyer != address(0), "No offer found for this car");

        payable(offer.buyer).transfer(offer.amount);

        // Remove the declined offer from the offers array
        offers[_licensePlate][_index] = offers[_licensePlate][offers[_licensePlate].length - 1];
        offers[_licensePlate].pop();
    }
    */

    function getOffers(string memory _licensePlate) public view returns (Offer[] memory) {
        return offers[_licensePlate];
    }

    function getCarsForSale() public view returns (string[] memory) {
        return carsForSale;
    }

    function getCarsByOwner(address _owner) public view returns (string[] memory) {
        return ownerCars[_owner];
    }

    function getMileageHistory(string memory _licensePlate) public view returns (uint256[] memory) {
        Car memory car = cars[_licensePlate];
        require(car.owner != address(0), "A car with this license plate does not exist");
        return car.mileageHistory;
    }

    function getOwnershipHistory(string memory _licensePlate) public view returns (address[] memory) {
        Car memory car = cars[_licensePlate];
        require(car.owner != address(0), "A car with this license plate does not exist");
        return car.ownershipHistory;
    }
}
