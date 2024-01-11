// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

interface IAARTMarket {
    // ********************** //
    //      Market enums      //
    // ********************** //

    enum ListingStatus {
        Active,
        Sold,
        Canceled
    }

    enum OfferStatus {
        Active,
        Ended
    }

    enum AuctionStatus {
        Open,
        Closed,
        Ended,
        DirectBuy,
        Canceled
    }

    // ********************** //
    //     Market structs     //
    // ********************** //

    struct Listing {
        uint256 tokenId;
        address seller;
        address paymentToken; // set to address(0) for MATIC
        uint256 buyPrice;
        ListingStatus status;
    }

    struct Offer {
        address offerer;
        uint256 price;
        address paymentToken; // set to address(0) for MATIC
        uint48 expireTime;
        OfferStatus status;
    }

    struct Auction {
        uint256 tokenId;
        address seller;
        address paymentToken; // set to address(0) for MATIC
        address highestBidder;
        uint48 startTime;
        uint48 endTime;
        uint256 highestBid;
        uint256 directBuyPrice;
        uint256 startPrice;
        AuctionStatus status;
    }

    function listItem(
        uint256 _tokenId,
        address _paymentToken,
        uint256 _buyPrice
    ) external returns (uint256 listingId);

    function buyItem(uint256 _listingId) external payable;

    function cancelListing(uint256 _listingId) external;

    function makeOffer(
        uint256 tokenId,
        address paymentToken,
        uint256 offerPrice,
        uint256 expirationTime
    ) external payable returns (uint256 offerId);

    function acceptOffer(uint256 tokenId, uint256 offerId) external;

    function cancelOffer(uint256 tokenId, uint256 offerId) external;

    function startAuction(
        uint256 _tokenId,
        address _paymentToken,
        uint256 _directBuyPrice,
        uint256 _startPrice,
        uint256 _startTime,
        uint256 _endTime
    ) external returns (uint256 auctionId);

    function bid(uint256 _auctionId, uint256 _amount) external payable;

    function directBuyAuction(uint256 _auctionId) external payable;

    function withdrawBid(uint256 _auctionId) external;

    function endAuction(uint256 _auctionId) external;

    function cancelAuction(uint256 _auctionId) external;

    function setFee(uint256 _fee) external;

    function addSupportedToken(address _token) external;
}
