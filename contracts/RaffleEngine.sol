// SPDX-License-Identifier: CC-BY-NC-4.0
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.7;
import "./WynToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
//import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/* 
    This is version 0.1 of Cadwyn Raffle Engine using Chainlink VRF 2.0 for randomness.
    This contract is intended to be used as a raffle engine for the Cadwyn platform.
    It allows users to create raffles with a fixed amount of tickets and a fixed prize amount.
    The raffle creator can set the amount of tickets, the prize amount and the ticket price.
    The raffle creator can also cancel the raffle at any time before it is finished.
    The raffle creator can't participate in their own raffle.
    The raffle creator can't cancel the raffle if it is already finished.
*/

contract RaffleEngine is Ownable, Pausable, VRFConsumerBaseV2 {

    VRFCoordinatorV2Interface immutable COORDINATOR;

    // Chainlink subscription ID.

    uint64 immutable s_subscriptionId;
    
    // The gas lane to use, which specifies the maximum gas price to bump to.
    // For a list of available gas lanes on each network,
    // see https://docs.chain.link/docs/vrf-contracts/#configurations

    bytes32 immutable s_keyHash;

    // Depends on the number of requested values that you want sent to the
    // fulfillRandomWords() function. Storing each word costs about 20,000 gas,
    // so 100,000 is a safe default for this example contract. Test and adjust
    // this limit based on the network that you select, the size of the request,
    // and the processing of the callback request in the fulfillRandomWords()
    // function.
    uint32 constant CALLBACK_GAS_LIMIT = 100_000;

    // For this example, retrieve 2 random values in one request.
    // Cannot exceed VRFCoordinatorV2.MAX_NUM_WORDS.
    uint32 constant NUM_WORDS = 1;

    uint16 constant REQUEST_CONFIRMATIONS = 3;

    uint256[] public s_randomWords;
    uint256 public s_requestId;
    //event ReturnedRandomness(uint256[] randomWords);

    struct Raffle {
        uint id;
        address creator;
        address[] tickets; // maybe in the future should be an ERC721
        uint16 ticketsSold;
        uint16 totalTickets;
        uint wynPrizeAmount;
        uint ticketPrice;
        address winner;
        bool isFinished;
        bool isSoldOut;
        bool isCancelled;
    }


    Raffle[] private raffles;
    //mapping (uint => Raffle) private raffleById;
    mapping (uint => address[]) private raffleTickets;
    mapping (address => uint[]) private userCreatedRaffles;
    mapping (uint => Raffle) private raffleById;
    mapping (uint => uint) private subscriptionIdToRaffleId;
    WynToken private wynToken;
    address private wynTokenAddress;
    uint private maxPrizeAmount;
    uint private minPrizeAmount;
    uint8 private minTickets;
    uint private minTicketPrice;
    uint private cancelationFee;

    //Events

    event RaffleCreated(address indexed owner, uint indexed _id, uint16 _totalTickets, uint _prizeAmount, uint _ticketPrice);
    event RaffleFinished(uint indexed _raffleId, address indexed _winner, uint _prizeAmount);
    event RaffleSoldOut(uint indexed _raffleId);
    event RaffleCancelled(uint indexed _raffleId, address indexed _cancelee);
    event NewTicketsBought(uint indexed _raffleId, address indexed _buyer, uint _amount, uint _ticketPrice, uint _totalPayed, uint _tickersLeft);


    constructor(
        address initialOwner, 
        address _wynTokenAddress, 
        uint64 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash)  VRFConsumerBaseV2(vrfCoordinator)  Ownable(initialOwner) {
        
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_keyHash = keyHash;
        s_subscriptionId = subscriptionId;
        wynToken = WynToken(_wynTokenAddress);
        maxPrizeAmount = wynToken.totalSupply();
        minTickets = 4;
        minPrizeAmount = 10 * 10 ** wynToken.decimals(); // 10 WYN
        minTicketPrice = 3 * 10 ** wynToken.decimals(); // 3 WYN
        cancelationFee = 1 * 10 ** wynToken.decimals(); // 1 WYN
    }

    // constructor() {
    //     _disableInitializers();
    // }

    function setMinTickets (uint8 _minTickets) public onlyOwner {
        minTickets = _minTickets;
    }
    
    function getMinTickets() public view returns (uint8) {
        return minTickets;
    }

    function setMinPrizeAmount(uint _minPrizeAmount) public onlyOwner {
        minPrizeAmount = _minPrizeAmount;
    }

    function getMinPrizeAmount() public view returns (uint) {
        return minPrizeAmount;
    }

    function setMaxPrizeAmount(uint _maxPrizeAmount) public onlyOwner {
        maxPrizeAmount = _maxPrizeAmount;
    }

    function getMaxPrizeAmount() public view returns (uint) {
        return maxPrizeAmount;
    }

    function setMinTicketPrice(uint _minTicketPrice) public onlyOwner {
        minTicketPrice = _minTicketPrice;
    }

    function getMinTicketPrice() public view returns (uint) {
        return minTicketPrice;
    }

    function setCancelationFee (uint8 _cancelationFee) public onlyOwner {
        cancelationFee = _cancelationFee;
    }

    function getCancelationFee() public view returns (uint) {
        return cancelationFee;
    }

    function createRaffle(uint16 _totalTickets, uint _prizeAmount, uint _ticketPrice) public whenNotPaused {
        uint nextId = raffles.length;
        Raffle memory raffle = Raffle({
            id: nextId,
            creator: msg.sender,
            tickets: new address[](0),
            ticketsSold: 0,
            totalTickets: _totalTickets,
            wynPrizeAmount: _prizeAmount,
            ticketPrice: _ticketPrice,
            winner: address(0),
            isSoldOut: false,
            isFinished: false,
            isCancelled: false
        });
        require(_totalTickets >= minTickets, "Max participants must be greater or equal than the global minimum participants");
        require(_prizeAmount > minPrizeAmount && _prizeAmount < maxPrizeAmount, "Prize amount must be greater than min prize amount and less than max prize amount");
        require(_ticketPrice >= minTicketPrice, "Ticket price must be greater or equal than the minimum global ticket price");
        require(wynToken.balanceOf(msg.sender) >= _prizeAmount, "Not enough WYN for prize");
        if(wynToken.allowance(msg.sender, address(this)) < _prizeAmount) {
            wynToken.approve(address(this), _prizeAmount);
        }
        wynToken.transferFrom(msg.sender, address(this), _prizeAmount);
        raffles.push(raffle);
        userCreatedRaffles[msg.sender].push(nextId);
        emit RaffleCreated(msg.sender, nextId, _totalTickets, _prizeAmount, _ticketPrice);
    }

    function getMyRaffles() public view returns (uint[] memory) {
        return userCreatedRaffles[msg.sender];
    }

    function buyTickets(uint raffleId, uint amount) public whenNotPaused {
        require(raffles[raffleId].isSoldOut == false, "Raffle is sold out");
        require(raffles[raffleId].creator != msg.sender, "You cannott participate in your own raffle");
        require(raffles[raffleId].isFinished == false, "Raffle is finished");
        require(raffles[raffleId].isCancelled == false, "Raffle was cancelled");
        require(amount > 0, "Amount must be greater than 0");
        require(raffles[raffleId].ticketsSold + amount <= raffles[raffleId].totalTickets, "Not enough tickets left, try buying less");
        uint myWynBalance = wynToken.balanceOf(msg.sender);
        uint totalAmount = raffles[raffleId].ticketPrice * amount;
        require( myWynBalance >= totalAmount, "Not enough WYN tokens");
        //require(raffles[raffleId].ticketsSold < raffles[raffleId].totalTickets, "Raffle is full");
        if(wynToken.allowance(msg.sender, address(this)) < totalAmount) {
            wynToken.approve(address(this), totalAmount);
        }
        wynToken.transferFrom(msg.sender, address(this), totalAmount);
        raffles[raffleId].tickets.push(msg.sender);
        raffles[raffleId].ticketsSold++;
        raffleTickets[raffleId].push(msg.sender);
        emit NewTicketsBought(raffleId, msg.sender, amount, raffles[raffleId].ticketPrice, totalAmount, raffles[raffleId].totalTickets - raffles[raffleId].ticketsSold);
        if(raffles[raffleId].ticketsSold == raffles[raffleId].totalTickets) {
            _finishRaffle(raffleId);
        }
    }
    function cancelRaffle(uint raffleId) public whenNotPaused {
        require(raffles[raffleId].isSoldOut == false, "Cannot cancel a sold out raffle");
        require(raffles[raffleId].creator == msg.sender, "You are not the creator of this raffle");
        require(raffles[raffleId].isFinished == false, "Raffle is finished");
        require(raffles[raffleId].isCancelled == false, "Raffle was already cancelled");
        raffles[raffleId].isCancelled = true;
        uint totalTickets = raffles[raffleId].ticketsSold;
        for(uint i = 0; i < totalTickets; i++) {
            wynToken.transfer(raffles[raffleId].tickets[i], raffles[raffleId].ticketPrice);
        }
        uint correctedPrizeAmount = raffles[raffleId].wynPrizeAmount - cancelationFee; // The creator gets the prize deposited minus the cancelation fee this is to incentivize creators to not cancel raffles
        wynToken.transfer(owner(), cancelationFee); // This is collected by the contract owner to avoid having wyn in the contract
        wynToken.transfer(msg.sender, correctedPrizeAmount);
        emit RaffleCancelled(raffleId, msg.sender);
    }
    
    /* This function does not finish the raffle right away it just sets the isSoldOut flag to true to stop the ticket sale. */
    function _finishRaffle(uint raffleId) private {   
        raffles[raffleId].isSoldOut = true;
        emit RaffleSoldOut(raffleId);
        //uint winnerIndex = uint(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % raffles[raffleId].ticketsSold;
        s_requestId = COORDINATOR.requestRandomWords( // request random number from Chainlink VRF
            s_keyHash,
            s_subscriptionId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            NUM_WORDS
        );
        subscriptionIdToRaffleId[s_requestId] = raffleId;
    }

    function getAllRaffleTicketsById(uint raffleId) public view returns (address[] memory) {
        return raffleTickets[raffleId];
    }

    /**
     * @notice Callback function used by VRF Coordinator
     *
     * @param requestId - id of the request
     * @param randomWords - array of random results from VRF Coordinator
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        uint raffleId = subscriptionIdToRaffleId[requestId];
        uint winnerIndex = randomWords[0] % raffles[raffleId].ticketsSold;
        raffles[raffleId].winner = raffles[raffleId].tickets[winnerIndex];
        wynToken.transfer(raffles[raffleId].winner, raffles[raffleId].wynPrizeAmount);
        uint accumulatedTicketWyns = raffles[raffleId].ticketPrice * raffles[raffleId].ticketsSold;
        wynToken.transfer(raffles[raffleId].creator, accumulatedTicketWyns);
        raffles[raffleId].isFinished = true;
        emit RaffleFinished(raffleId, raffles[raffleId].winner, raffles[raffleId].wynPrizeAmount);
        s_randomWords = randomWords;
    }
    

}