// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IAARTCollection.sol";

contract AARTMarket is Ownable {
    //--------------------------------------------------------------------
    // VARIABLES

    enum ListingStatus {
        Active,
        Sold,
        Canceled
    }

    enum AuctionStatus {
        Open,
        Close,
        Ended,
        Canceled
    }

    struct Listing {
        uint256 id;
        uint256 tokenId;
        address seller;
        address paymentToken;
        uint256 buyPrice;
        ListingStatus status;
    }

    struct Auction {
        uint256 id;
        uint256 tokenId;
        address seller;
        address paymentToken;
        address highestBidder;
        uint256 highestBid;
        uint256 directBuyPrice;
        uint256 startPrice;
        uint128 startTime;
        uint128 endTime;
        AuctionStatus status;
    }

    Listing[] private _listings;
    Auction[] private _auctions;

    mapping(uint256 => mapping(address => uint256)) auctionBidderAmounts;

    IAARTCollection private nftContract;

    //--------------------------------------------------------------------
    // EVENTS

    event ItemListed(uint256 listingId, address seller, uint256 tokenId);
    event ItemSold(uint256 listingId, address buyer);
    event ItemCanceled(uint256 listingId);
    event AuctionStarted(
        uint256 auctionId,
        address seller,
        uint256 tokenId,
        uint256 startTime
    );
    event NewBid(uint256 auctionId, address bidder, uint256 bidAmount);
    event AuctionDirectBuy(uint256 auctionId, address buyer);
    event AuctionCanceled(uint256 auctionId);
    event AuctionEnded(uint256 auctionId, address buyer);
    event RoyaltyPaid(uint256 tokenId, address receiver, uint256 amount);

    //--------------------------------------------------------------------
    // ERRORS

    error AARTMarket_InvalidToken(uint256 tokenId);
    error AARTMarket_ItemNotApproved(uint256 tokenId);
    error AARTMarket_AddressZero();
    error AARTMarket_OnlySeller(uint256 id);
    error AARTMarket_InvalidAuctionPeriod(uint256 endTime, uint256 startTime);
    error AARTMarket_InvalidStartTime(uint256 startTime);
    error AARTMarket_InvalidStartPrice();
    error AARTMarket_InvalidDirectBuyPrice(uint256 directBuyPrice);
    error AARTMarket_AuctionNotOpen(uint256 auctionId);
    error AARTMarket_AuctionEnded(uint256 auctionId);
    error AARTMarket_AlreadyHighestBid(uint256 auctionId);
    error AARTMarket_InsufficientBid(uint256 auctionId);
    error AARTMarket_InsufficientAmount(
        uint256 auctionId,
        uint256 directBuyPrice
    );
    error AARTMarket_IsHighestBidder(uint256 auctionId);
    error AARTMarket_HasNoBid(uint256 auctionId);
    error AARTMarket_AuctionPeriodNotEnded(uint256 auctionId, uint256 endTime);

    //--------------------------------------------------------------------
    // CONSTRUCTOR

    constructor(address _nftAddress) {
        nftContract = IAARTCollection(_nftAddress);
    }

    //--------------------------------------------------------------------
    // DIRECT SALE LOGIC

    function listItem(
        uint256 _tokenId,
        address _paymentToken,
        uint256 _buyPrice
    ) external returns (uint256 listingId) {
        // check that the user is the owner of the token
        // also checks that token is from the AART collection
        if (nftContract.ownerOf(_tokenId) != msg.sender)
            revert AARTMarket_InvalidToken(_tokenId);
        // check that the user approved this contract to transfer token
        if (nftContract.getApproved(_tokenId) != address(this))
            revert AARTMarket_ItemNotApproved(_tokenId);
        if (_paymentToken != address(0)) revert AARTMarket_AddressZero();

        listingId = _listings.length;

        Listing storage listingItem = _listings[listingId];

        listingItem.id = listingId;
        listingItem.tokenId = _tokenId;
        listingItem.seller = msg.sender;
        listingItem.paymentToken = _paymentToken;
        listingItem.buyPrice = _buyPrice;
        listingItem.status = ListingStatus.Active;

        emit ItemListed(listingId, msg.sender, _tokenId);
    }

    function cancelListing(uint256 _listingId) external {
        if (msg.sender != _listings[_listingId].seller)
            revert AARTMarket_OnlySeller(_listingId);

        _listings[_listingId].status = ListingStatus.Canceled;

        emit ItemCanceled(_listingId);
    }

    function buyItem(uint256 _listingId) external payable {
        Listing memory item = _listings[_listingId];

        // handle NFT royalty payment
        _handleRoyalties(
            item.tokenId,
            item.seller,
            msg.sender,
            item.paymentToken,
            item.buyPrice
        );

        // transfer nft to buyer
        nftContract.safeTransferFrom(item.seller, msg.sender, item.tokenId);

        // update listing status
        _listings[_listingId].status = ListingStatus.Sold;

        emit ItemSold(_listingId, msg.sender);
    }

    //--------------------------------------------------------------------
    // AUCTION LOGIC

    function startAuction(
        uint256 _tokenId,
        address _paymentToken,
        uint256 _directBuyPrice,
        uint256 _startPrice,
        uint128 _startTime,
        uint128 _endTime
    ) external returns (uint256 auctionId) {
        // check that the user is the owner of the token
        // also checks that token is from the AART collection
        if (nftContract.ownerOf(_tokenId) != msg.sender)
            revert AARTMarket_InvalidToken(_tokenId);
        if (_paymentToken != address(0)) revert AARTMarket_AddressZero();
        if (_endTime <= _startTime)
            revert AARTMarket_InvalidAuctionPeriod(_endTime, _startTime);
        if (_startTime < block.timestamp)
            revert AARTMarket_InvalidStartTime(_startTime);
        if (_startPrice == 0) revert AARTMarket_InvalidStartPrice();
        if (_directBuyPrice <= _startPrice)
            revert AARTMarket_InvalidDirectBuyPrice(_directBuyPrice);

        auctionId = _auctions.length;

        Auction storage _auction = _auctions[auctionId];

        _auction.id = auctionId;
        _auction.tokenId = _tokenId;
        _auction.seller = msg.sender;
        _auction.paymentToken = _paymentToken;
        _auction.directBuyPrice = _directBuyPrice;
        _auction.startPrice = _startPrice;
        _auction.startTime = uint128(_startTime);
        _auction.endTime = uint128(_endTime);
        _auction.status = AuctionStatus.Open;

        // transfer nft to this contract
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        emit AuctionStarted(auctionId, msg.sender, _tokenId, _startTime);
    }

    function bid(uint256 _auctionId, uint256 _amount) external payable {
        if (_auctions[_auctionId].status != AuctionStatus.Open)
            revert AARTMarket_AuctionNotOpen(_auctionId);
        if (block.timestamp > _auctions[_auctionId].endTime)
            revert AARTMarket_AuctionEnded(_auctionId);
        if (msg.sender == _auctions[_auctionId].highestBidder)
            revert AARTMarket_AlreadyHighestBid(_auctionId);

        uint256 oldBidAmount = auctionBidderAmounts[_auctionId][msg.sender];
        if (oldBidAmount + _amount <= _auctions[_auctionId].highestBid)
            revert AARTMarket_InsufficientBid(_auctionId);

        auctionBidderAmounts[_auctionId][msg.sender] += _amount;

        IERC20(_auctions[_auctionId].paymentToken).transferFrom(
            msg.sender,
            address(this),
            _amount
        );

        _auctions[_auctionId].highestBidder = msg.sender;
        _auctions[_auctionId].highestBid = oldBidAmount + _amount;

        emit NewBid(_auctionId, msg.sender, oldBidAmount + _amount);
    }

    function directBuyAuction(uint256 _auctionId, uint256 _amount)
        external
        payable
    {
        Auction memory _auction = _auctions[_auctionId];

        if (_auction.status != AuctionStatus.Open)
            revert AARTMarket_AuctionNotOpen(_auctionId);
        if (block.timestamp > _auction.endTime)
            revert AARTMarket_AuctionEnded(_auctionId);
        if (_amount != _auction.directBuyPrice)
            revert AARTMarket_InsufficientAmount(
                _auctionId,
                _auction.directBuyPrice
            );

        // handle NFT royalty payment
        _handleRoyalties(
            _auction.tokenId,
            _auction.seller,
            msg.sender,
            _auction.paymentToken,
            _auction.directBuyPrice
        );

        _auctions[_auctionId].status = AuctionStatus.Ended;

        // transfer nft to the buyer
        nftContract.safeTransferFrom(
            address(this),
            msg.sender,
            _auction.tokenId
        );

        emit AuctionDirectBuy(_auctionId, msg.sender);
    }

    function withdrawBid(uint256 _auctionId) external {
        if (_auctions[_auctionId].status == AuctionStatus.Open) {
            if (msg.sender == _auctions[_auctionId].highestBidder)
                revert AARTMarket_IsHighestBidder(_auctionId);
        }
        uint256 bidAmount = auctionBidderAmounts[_auctionId][msg.sender];

        if (bidAmount == 0) revert AARTMarket_HasNoBid(_auctionId);

        auctionBidderAmounts[_auctionId][msg.sender] = 0;

        IERC20(_auctions[_auctionId].paymentToken).transferFrom(
            msg.sender,
            address(this),
            bidAmount
        );
    }

    function cancelAuction(uint256 _auctionId) external {
        if (_auctions[_auctionId].status != AuctionStatus.Open)
            revert AARTMarket_AuctionNotOpen(_auctionId);

        _auctions[_auctionId].status = AuctionStatus.Canceled;

        // transfer nft to this contract
        nftContract.safeTransferFrom(
            address(this),
            msg.sender,
            _auctions[_auctionId].tokenId
        );

        emit AuctionCanceled(_auctionId);
    }

    function endAuction(uint256 _auctionId) external {
        Auction memory _auction = _auctions[_auctionId];

        if (block.timestamp <= _auction.endTime)
            revert AARTMarket_AuctionPeriodNotEnded(
                _auctionId,
                _auction.endTime
            );

        address buyer;
        if (_auction.highestBidder != address(0)) {
            buyer = _auction.highestBidder;

            // handle NFT royalty payment
            _handleRoyalties(
                _auction.tokenId,
                _auction.seller,
                _auction.highestBidder,
                _auction.paymentToken,
                _auction.highestBid
            );

            _auctions[_auctionId].status = AuctionStatus.Ended;

            // transfer nft to the highest bidder
            nftContract.safeTransferFrom(
                address(this),
                buyer,
                _auction.tokenId
            );
        } else {
            _auctions[_auctionId].status = AuctionStatus.Ended;

            // transfer nft back to the seller
            nftContract.safeTransferFrom(
                address(this),
                _auction.seller,
                _auction.tokenId
            );
        }

        emit AuctionEnded(_auctionId, buyer);
    }

    //--------------------------------------------------------------------
    // INTERNAL FUNCTIONS

    function _handleRoyalties(
        uint256 tokenId,
        address seller,
        address buyer,
        address paymentToken,
        uint256 salePrice
    ) internal {
        (address royaltyReceiver, uint256 royaltyAmount) = nftContract
            .royaltyInfo(tokenId, salePrice);

        if (seller != royaltyReceiver) {
            IERC20(paymentToken).transferFrom(
                buyer,
                royaltyReceiver,
                royaltyAmount
            );

            IERC20(paymentToken).transferFrom(
                buyer,
                seller,
                salePrice - royaltyAmount
            );

            emit RoyaltyPaid(tokenId, royaltyReceiver, royaltyAmount);
        } else {
            IERC20(paymentToken).transferFrom(buyer, seller, salePrice);
        }
    }

    //--------------------------------------------------------------------
    // VIEW FUNCTIONS

    function getListings() external view returns (Listing[] memory) {
        return _listings;
    }

    function getAuctions() external view returns (Auction[] memory) {
        return _auctions;
    }
}
