// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ShibariumHome {
    address private contractOwner;

    mapping(address => uint[5]) public placeNft;

    constructor(){
        contractOwner = msg.sender;
    }

    function setNft(uint placeId, uint tokenId) public {
        require(placeId < 5 && placeId >=0, "Inexistent place");
        require(tokenId > 0, "Token Id need to be positive integer");
        placeNft[msg.sender][placeId] = tokenId;
    }

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Caller is not owner");
        _;
    }
} 