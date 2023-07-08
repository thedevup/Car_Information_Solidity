const CarInformation = artifacts.require("CarInformation");

module.exports = function (deployer) {
  deployer.deploy(CarInformation);
};
