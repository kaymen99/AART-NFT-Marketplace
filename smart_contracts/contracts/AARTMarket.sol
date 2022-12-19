// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./interfaces/IAARTCollection.sol";

contract AARTMarket is IERC721Receiver {
    enum ListingStatus {
        Active,
        Sold,
        Canceled
    }

    enum AuctionStatus {
        Open,
        Closed,
        Ended,
        DirectBuy,
        Canceled
    }

    struct Listing {
        uint256 id;
        uint256 tokenId;
        address seller;
        address paymentToken; // set to address(0) for MATIC
        uint256 buyPrice;
        ListingStatus status;
    }

    struct Auction {
        uint256 id;
        uint256 tokenId;
        address seller;
        address paymentToken; // set to address(0) for MATIC
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

    mapping(uint256 => mapping(address => uint256))
        private auctionBidderAmounts;

    IAARTCollection private immutable nftContract;

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
    error AARTMarket_ListingNotActive(uint256 listingId);
    error AARTMarket_InvalidAuctionPeriod(uint256 endTime, uint256 startTime);
    error AARTMarket_InvalidStartTime(uint256 startTime);
    error AARTMarket_InvalidStartPrice();
    error AARTMarket_InvalidDirectBuyPrice(uint256 directBuyPrice);
    error AARTMarket_AuctionNotOpen(uint256 auctionId);
    error AARTMarket_AlreadyHighestBid(uint256 auctionId);
    error AARTMarket_InsufficientBid(uint256 auctionId);
    error AARTMarket_InsufficientAmount();
    error AARTMarket_IsHighestBidder(uint256 auctionId);
    error AARTMarket_HasNoBid(uint256 auctionId);
    error AARTMarket_AuctionPeriodNotEnded(uint256 auctionId, uint256 endTime);
    error AARTMarket_CancelImpossible(uint256 auctionId);
    error TransferFailed();

    constructor(address _nftAddress) {
        if (_nftAddress == address(0)) revert AARTMarket_AddressZero();
        nftContract = IAARTCollection(_nftAddress);
    }

    // ************************** //
    //      DIRECT SALE LOGIC     //
    // ************************** //

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

        listingId = _listings.length;

        Listing memory listingItem;
        listingItem.id = listingId;
        listingItem.tokenId = _tokenId;
        listingItem.seller = msg.sender;
        listingItem.paymentToken = _paymentToken;
        listingItem.buyPrice = _buyPrice;
        listingItem.status = ListingStatus.Active;

        _listings.push(listingItem);

        emit ItemListed(listingId, msg.sender, _tokenId);
    }

    function buyItem(uint256 _listingId) external payable {
        Listing memory item = _listings[_listingId];

        if (item.status != ListingStatus.Active)
            revert AARTMarket_ListingNotActive(_listingId);

        // handle payment
        _handleSalePayment(
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

    function cancelListing(uint256 _listingId) external {
        if (msg.sender != _listings[_listingId].seller)
            revert AARTMarket_OnlySeller(_listingId);
        if (_listings[_listingId].status != ListingStatus.Active)
            revert AARTMarket_ListingNotActive(_listingId);

        _listings[_listingId].status = ListingStatus.Canceled;

        emit ItemCanceled(_listingId);
    }

    // ********************** //
    //      AUCTION LOGIC     //
    // ********************** //

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
        if (_endTime <= _startTime)
            revert AARTMarket_InvalidAuctionPeriod(_endTime, _startTime);
        if (_startTime < block.timestamp)
            revert AARTMarket_InvalidStartTime(_startTime);
        if (_startPrice == 0) revert AARTMarket_InvalidStartPrice();
        if (_directBuyPrice <= _startPrice)
            revert AARTMarket_InvalidDirectBuyPrice(_directBuyPrice);

        auctionId = _auctions.length;

        Auction memory _auction;
        _auction.id = auctionId;
        _auction.tokenId = _tokenId;
        _auction.seller = msg.sender;
        _auction.paymentToken = _paymentToken;
        _auction.directBuyPrice = _directBuyPrice;
        _auction.startPrice = _startPrice;
        _auction.startTime = uint128(_startTime);
        _auction.endTime = uint128(_endTime);
        _auction.status = AuctionStatus.Open;

        _auctions.push(_auction);

        // transfer nft to this contract
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        emit AuctionStarted(auctionId, msg.sender, _tokenId, _startTime);
    }

    function bid(uint256 _auctionId, uint256 _amount) external payable {
        Auction memory _auction = _auctions[_auctionId];

        if (_auctionStatus(_auctionId) != AuctionStatus.Open)
            revert AARTMarket_AuctionNotOpen(_auctionId);
        if (msg.sender == _auction.highestBidder)
            revert AARTMarket_AlreadyHighestBid(_auctionId);

        if (_auction.paymentToken == address(0)) {
            _amount = msg.value;
        }

        uint256 oldBidAmount = auctionBidderAmounts[_auctionId][msg.sender];
        if (_auction.highestBidder != address(0)) {
            if (oldBidAmount + _amount <= _auction.highestBid)
                revert AARTMarket_InsufficientBid(_auctionId);
        } else {
            // case of the first bid
            if (_amount < _auction.startPrice)
                revert AARTMarket_InsufficientBid(_auctionId);
        }

        if (_auction.paymentToken != address(0)) {
            IERC20(_auction.paymentToken).transferFrom(
                msg.sender,
                address(this),
                _amount
            );
        }

        auctionBidderAmounts[_auctionId][msg.sender] += _amount;

        _auctions[_auctionId].highestBidder = msg.sender;
        _auctions[_auctionId].highestBid = oldBidAmount + _amount;

        emit NewBid(_auctionId, msg.sender, oldBidAmount + _amount);
    }

    function directBuyAuction(uint256 _auctionId) external payable {
        Auction memory _auction = _auctions[_auctionId];

        if (_auctionStatus(_auctionId) != AuctionStatus.Open)
            revert AARTMarket_AuctionNotOpen(_auctionId);

        // handle payment
        _handleSalePayment(
            _auction.tokenId,
            _auction.seller,
            msg.sender,
            _auction.paymentToken,
            _auction.directBuyPrice
        );

        _auctions[_auctionId].status = AuctionStatus.DirectBuy;

        // transfer nft to the buyer
        nftContract.safeTransferFrom(
            address(this),
            msg.sender,
            _auction.tokenId
        );

        emit AuctionDirectBuy(_auctionId, msg.sender);
    }

    function withdrawBid(uint256 _auctionId) external {
        if (_auctionStatus(_auctionId) == AuctionStatus.Open) {
            // if auction is open don't allow highest bidder withdrawal
            if (msg.sender == _auctions[_auctionId].highestBidder)
                revert AARTMarket_IsHighestBidder(_auctionId);
        }
        uint256 bidAmount = auctionBidderAmounts[_auctionId][msg.sender];

        if (bidAmount == 0) revert AARTMarket_HasNoBid(_auctionId);

        auctionBidderAmounts[_auctionId][msg.sender] = 0;

        address _paymentToken = _auctions[_auctionId].paymentToken;
        if (_paymentToken != address(0)) {
            IERC20(_paymentToken).transfer(msg.sender, bidAmount);
        } else {
            sendMatic(msg.sender, bidAmount);
        }
    }

    function endAuction(uint256 _auctionId) external {
        Auction memory _auction = _auctions[_auctionId];

        if (
            _auctionStatus(_auctionId) != AuctionStatus.Ended ||
            _auction.status != AuctionStatus.Open
        ) revert AARTMarket_AuctionPeriodNotEnded(_auctionId, _auction.endTime);

        address buyer;
        if (_auction.highestBidder != address(0)) {
            buyer = _auction.highestBidder;

            // handle payment
            _handleAuctionPayment(
                _auction.tokenId,
                _auction.seller,
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

    function cancelAuction(uint256 _auctionId) external {
        if (msg.sender != _auctions[_auctionId].seller)
            revert AARTMarket_OnlySeller(_auctionId);
        AuctionStatus state = _auctionStatus(_auctionId);
        if (state != AuctionStatus.Open && state != AuctionStatus.Closed)
            revert AARTMarket_CancelImpossible(_auctionId);

        _auctions[_auctionId].status = AuctionStatus.Canceled;

        // transfer nft back to seller
        nftContract.safeTransferFrom(
            address(this),
            msg.sender,
            _auctions[_auctionId].tokenId
        );

        emit AuctionCanceled(_auctionId);
    }

    // ************************ //
    //      Internal utils      //
    // ************************ //

    function sendMatic(address account, uint256 amount) internal {
        (bool success, ) = payable(account).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    function _handleSalePayment(
        uint256 tokenId,
        address seller,
        address buyer,
        address paymentToken,
        uint256 salePrice
    ) internal {
        (address royaltyReceiver, uint256 royaltyAmount) = nftContract
            .royaltyInfo(tokenId, salePrice);

        if (paymentToken != address(0)) {
            // Case 1 : ERC20 payment
            if (seller != royaltyReceiver && royaltyAmount != 0) {
                // pay NFT creator royalty in ERC20 token
                IERC20(paymentToken).transferFrom(
                    buyer,
                    royaltyReceiver,
                    royaltyAmount
                );
                // pay current item seller in ERC20 token
                IERC20(paymentToken).transferFrom(
                    buyer,
                    seller,
                    salePrice - royaltyAmount
                );

                emit RoyaltyPaid(tokenId, royaltyReceiver, royaltyAmount);
            } else {
                // seller is same as NFT creator so transfer directly
                IERC20(paymentToken).transferFrom(buyer, seller, salePrice);
            }
        } else {
            // Case 2 : Matic payment
            if (msg.value != salePrice) revert AARTMarket_InsufficientAmount();
            if (seller != royaltyReceiver && royaltyAmount != 0) {
                // pay NFT creator royalty in Matic
                sendMatic(royaltyReceiver, royaltyAmount);
                // pay current item seller in Matic
                sendMatic(seller, msg.value - royaltyAmount);
                emit RoyaltyPaid(tokenId, royaltyReceiver, royaltyAmount);
            } else {
                // seller is same as NFT creator so send directly
                sendMatic(seller, msg.value);
            }
        }
    }

    function _handleAuctionPayment(
        uint256 tokenId,
        address seller,
        address paymentToken,
        uint256 salePrice
    ) internal {
        (address royaltyReceiver, uint256 royaltyAmount) = nftContract
            .royaltyInfo(tokenId, salePrice);

        if (paymentToken != address(0)) {
            // Case 1 : ERC20 payment
            if (seller != royaltyReceiver && royaltyAmount != 0) {
                // pay NFT creator royalty in ERC20 token
                IERC20(paymentToken).transfer(royaltyReceiver, royaltyAmount);
                // pay current item seller in ERC20 token
                IERC20(paymentToken).transfer(
                    seller,
                    salePrice - royaltyAmount
                );

                emit RoyaltyPaid(tokenId, royaltyReceiver, royaltyAmount);
            } else {
                // seller is same as NFT creator so transfer directly
                IERC20(paymentToken).transfer(seller, salePrice);
            }
        } else {
            // Case 2 : Matic payment
            if (seller != royaltyReceiver && royaltyAmount != 0) {
                // pay NFT creator royalty in Matic
                sendMatic(royaltyReceiver, royaltyAmount);
                // pay current item seller in Matic
                sendMatic(seller, salePrice - royaltyAmount);
                emit RoyaltyPaid(tokenId, royaltyReceiver, royaltyAmount);
            } else {
                // seller is same as NFT creator so send directly
                sendMatic(seller, salePrice);
            }
        }
    }

    function _auctionStatus(uint256 auctionId)
        internal
        view
        returns (AuctionStatus)
    {
        Auction memory auction = _auctions[auctionId];
        if (
            auction.status == AuctionStatus.Canceled ||
            auction.status == AuctionStatus.DirectBuy
        ) {
            return auction.status;
        } else if (auction.startTime > block.timestamp) {
            return AuctionStatus.Closed;
        } else if (block.timestamp <= auction.endTime) {
            return AuctionStatus.Open;
        } else {
            return AuctionStatus.Ended;
        }
    }

    // ***************** //
    //      Getters      //
    // ***************** //

    function getNFTCollection() external view returns (address) {
        return address(nftContract);
    }

    function getListings() external view returns (Listing[] memory) {
        return _listings;
    }

    function getAuctions() external view returns (Auction[] memory) {
        return _auctions;
    }

    function getUserBidAmount(uint256 auctionId, address account)
        external
        view
        returns (uint256)
    {
        return auctionBidderAmounts[auctionId][account];
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
