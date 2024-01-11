// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./interfaces/IAARTCollection.sol";
import "./interfaces/IAARTMarket.sol";
import "./utils/AARTErrors.sol";
import "./utils/AARTEvents.sol";
import "./lib/PaymentLib.sol";

/// @title AART NFT marketplace
/// @author kaymen99
/// @notice marketplace that supports direct sales, offers, and auctions for all the AART NFT collection tokens.
contract AARTMarket is
    IAARTMarket,
    AARTErrors,
    AARTEvents,
    Ownable,
    IERC721Receiver
{
    uint256 private constant PRECISION = 1e3;
    uint256 private constant MAX_FEE = 30; // 3% is maximum trade fee

    Listing[] private _listings;
    Auction[] private _auctions;

    // supported ERC20 tokens
    address[] public supportedERC20tokens;
    mapping(address => bool) private _erc20Tokensmapping;

    // tokenId => offer
    mapping(uint256 => Offer[]) private _offers;

    // auctionId => user => bid amount
    mapping(uint256 => mapping(address => uint256))
        private auctionBidderAmounts;

    IAARTCollection private immutable nftContract;

    uint256 public fee = 10; // 1%
    address private feeRecipient;

    constructor(address _nftAddress) {
        if (_nftAddress == address(0)) revert AARTMarket_AddressZero();
        nftContract = IAARTCollection(_nftAddress);
        feeRecipient = msg.sender;
    }

    // ************************** //
    //      Direct Sale Logic     //
    // ************************** //

    /**
     * @dev Lists an NFT for sale in the marketplace.
     * @dev caller must be NFT owner and payment token must be allowed.
     * @param _tokenId The ID of the NFT to be listed.
     * @param _paymentToken address of token used for payment, address(0) for ETH.
     * @param _buyPrice The sale price of the NFT.
     * @return listingId The ID of the created listing.
     */
    function listItem(
        uint256 _tokenId,
        address _paymentToken,
        uint256 _buyPrice
    ) external returns (uint256 listingId) {
        // check that token is allowed
        _allowedToken(_paymentToken);
        _isAARTTokenOwner(_tokenId, msg.sender);

        // check that the user approved this contract to transfer token
        if (nftContract.getApproved(_tokenId) != address(this))
            revert AARTMarket_ItemNotApproved(_tokenId);

        listingId = _listings.length;
        _listings.push();

        Listing storage listingItem = _listings[listingId];
        listingItem.tokenId = _tokenId;
        listingItem.seller = msg.sender;
        listingItem.paymentToken = _paymentToken;
        listingItem.buyPrice = _buyPrice;
        listingItem.status = ListingStatus.Active;

        emit ItemListed(listingId, msg.sender, _tokenId);
    }

    /**
     * @dev Purchases an NFT listed for sale in the marketplace.
     * @param _listingId The ID of the listing to be purchased.
     */
    function buyItem(uint256 _listingId) external payable {
        Listing memory item = _listings[_listingId];

        if (item.status != ListingStatus.Active)
            revert AARTMarket_ListingNotActive(_listingId);

        if (item.paymentToken == address(0) && msg.value != item.buyPrice)
            revert AARTMarket_InsufficientAmount();

        // handle payment
        _handlePayment(
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

    /**
     * @dev Cancels an NFT listing, called by the seller.
     * @param _listingId The ID of the listing to be canceled.
     */
    function cancelListing(uint256 _listingId) external {
        if (msg.sender != _listings[_listingId].seller)
            revert AARTMarket_OnlySeller(_listingId);
        if (_listings[_listingId].status != ListingStatus.Active)
            revert AARTMarket_ListingNotActive(_listingId);

        _listings[_listingId].status = ListingStatus.Canceled;

        emit ItemCanceled(_listingId);
    }

    // ********************** //
    //      Offers Logic      //
    // ********************** //

    /**
     * @dev Creates an offer for an NFT.
     * @dev must use allowed token for payment.
     * @param _tokenId The ID of the NFT to make an offer on.
     * @param _paymentToken The token used to buy NFT, set address(0) for ETH.
     * @param _offerPrice The price offered for the NFT.
     * @param _expirationTime The expiration time of the offer.
     * @return offerId The ID of the created offer.
     */
    function makeOffer(
        uint256 _tokenId,
        address _paymentToken,
        uint256 _offerPrice,
        uint256 _expirationTime
    ) external payable returns (uint256 offerId) {
        // check that token is allowed
        _allowedToken(_paymentToken);

        if (nftContract.ownerOf(_tokenId) == address(0)) revert();
        if (_expirationTime <= block.timestamp)
            revert AARTMarket_InvalidExpirationTime();
        if (_paymentToken == address(0)) {
            // can not approve MATIC so offerer is obliged to escrow offerPrice to this contract
            // the fund can be withdrawn by canceling the offer
            if (msg.value != _offerPrice)
                revert AARTMarket_InsufficientAmount();
        } else {
            // check that the offerer has approved offerPrice amount of paymetToken to this contract
            if (
                IERC20(_paymentToken).allowance(msg.sender, address(this)) <
                _offerPrice
            ) revert AARTMarket_OfferAmountNotApproved();
        }

        offerId = _offers[_tokenId].length;
        _offers[_tokenId].push();

        Offer storage offer = _offers[_tokenId][offerId];
        offer.offerer = msg.sender;
        offer.paymentToken = _paymentToken;
        offer.price = _offerPrice;
        offer.expireTime = uint48(_expirationTime);
        offer.status = OfferStatus.Active;

        emit NewOffer(offerId, _tokenId, msg.sender);
    }

    /**
     * @dev Accepts an offer for an NFT.
     * @dev callable by the NFT owner.
     * @param _tokenId The ID of the NFT for which the offer is accepted.
     * @param _offerId The ID of the offer to be accepted.
     */
    function acceptOffer(uint256 _tokenId, uint256 _offerId) external {
        Offer storage offer = _offers[_tokenId][_offerId];

        _isAARTTokenOwner(_tokenId, msg.sender);
        if (_offerStatus(_tokenId, _offerId) != OfferStatus.Active)
            revert AARTMarket_OfferNotActive(_offerId, _tokenId);

        // handle payment like a normal sale
        _handlePayment(
            _tokenId,
            msg.sender,
            offer.offerer,
            offer.paymentToken,
            offer.price
        );

        offer.status = OfferStatus.Ended;

        // transfer nft to this contract
        nftContract.safeTransferFrom(msg.sender, offer.offerer, _tokenId);

        emit OfferAccepted(_offerId, _tokenId, msg.sender);
    }

    /**
     * @dev Cancels an offer on NFT, callable by the offerer.
     * @param _tokenId The ID of the NFT for which the offer is canceled.
     * @param _offerId The ID of the offer to be canceled.
     */
    function cancelOffer(uint256 _tokenId, uint256 _offerId) external {
        Offer storage offer = _offers[_tokenId][_offerId];

        if (msg.sender != offer.offerer)
            revert AARTMarket_OnlyOfferer(_offerId, _tokenId);
        if (_offerStatus(_tokenId, _offerId) != OfferStatus.Active)
            revert AARTMarket_OfferNotActive(_offerId, _tokenId);

        offer.status = OfferStatus.Ended;

        if (offer.paymentToken == address(0)) {
            // return MATIC amount escowed when creating offer to offerer
            PaymentLib.transferNativeToken(offer.offerer, offer.price);
        }

        emit OfferCanceled(_offerId, _tokenId);
    }

    // ********************** //
    //      Auction Logic     //
    // ********************** //

    /**
     * @dev Starts an auction for an NFT.
     * @dev caller must be NFT owner and payment token must be allowed.
     * @param _tokenId The ID of the NFT to be auctioned.
     * @param _paymentToken The token used for the auction payment, set address(0) for ETH.
     * @param _directBuyPrice The direct buy price for the NFT.
     * @param _startPrice The starting bid price for the auction.
     * @param _startTime The start time of the auction.
     * @param _endTime The end time of the auction.
     * @return auctionId The ID of the created auction.
     */
    function startAuction(
        uint256 _tokenId,
        address _paymentToken,
        uint256 _directBuyPrice,
        uint256 _startPrice,
        uint256 _startTime,
        uint256 _endTime
    ) external returns (uint256 auctionId) {
        // check that token is allowed
        _allowedToken(_paymentToken);
        _isAARTTokenOwner(_tokenId, msg.sender);
        _startTime = _startTime < block.timestamp
            ? uint48(block.timestamp)
            : uint48(_startTime);

        if (_endTime <= _startTime)
            revert AARTMarket_InvalidAuctionPeriod(_endTime, _startTime);
        if (_startPrice == 0) revert AARTMarket_InvalidStartPrice();
        if (_directBuyPrice <= _startPrice)
            revert AARTMarket_InvalidDirectBuyPrice(_directBuyPrice);

        auctionId = _auctions.length;
        _auctions.push();

        Auction storage _auction = _auctions[auctionId];
        _auction.tokenId = _tokenId;
        _auction.seller = msg.sender;
        _auction.paymentToken = _paymentToken;
        _auction.directBuyPrice = _directBuyPrice;
        _auction.startPrice = _startPrice;
        _auction.startTime = uint48(_startTime);
        _auction.endTime = uint48(_endTime);
        _auction.status = AuctionStatus.Open;

        // transfer nft to this contract
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        emit AuctionStarted(auctionId, msg.sender, _tokenId, _startTime);
    }

    /**
     * @dev Places a bid in an ongoing auction.
     * @param _auctionId The ID of the auction in which to place a bid.
     * @param _amount The bid amount.
     */
    function bid(uint256 _auctionId, uint256 _amount) external payable {
        Auction storage _auction = _auctions[_auctionId];

        if (_auctionStatus(_auctionId) != AuctionStatus.Open)
            revert AARTMarket_AuctionNotOpen(_auctionId);
        if (msg.sender == _auction.highestBidder)
            revert AARTMarket_AlreadyHighestBid(_auctionId);

        address token = _auction.paymentToken;
        if (token == address(0)) {
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
        if (token != address(0)) {
            IERC20(token).transferFrom(msg.sender, address(this), _amount);
        }

        auctionBidderAmounts[_auctionId][msg.sender] = oldBidAmount + _amount;
        _auction.highestBidder = msg.sender;
        _auction.highestBid = oldBidAmount + _amount;

        emit NewBid(_auctionId, msg.sender, oldBidAmount + _amount);
    }

    /**
     * @dev Directly buys an NFT in an ongoing auction.
     * @dev must provide exact direct buy price
     * @param _auctionId The ID of the auction for the direct buy.
     */
    function directBuyAuction(uint256 _auctionId) external payable {
        Auction storage _auction = _auctions[_auctionId];

        if (_auctionStatus(_auctionId) != AuctionStatus.Open)
            revert AARTMarket_AuctionNotOpen(_auctionId);

        uint256 tokenId = _auction.tokenId;
        address token = _auction.paymentToken;
        uint256 price = _auction.directBuyPrice;
        if (token == address(0) && msg.value != price)
            revert AARTMarket_InsufficientAmount();

        // handle payment
        _handlePayment(tokenId, _auction.seller, msg.sender, token, price);

        _auction.status = AuctionStatus.DirectBuy;

        // transfer nft to the buyer
        nftContract.safeTransferFrom(address(this), msg.sender, tokenId);

        emit AuctionDirectBuy(_auctionId, msg.sender);
    }

    /**
     * @dev Withdraws a bid placed in an auction.
     * @dev highest bidder is not allowed to withdraw bid.
     * @param _auctionId The ID of the auction from which to withdraw the bid.
     */
    function withdrawBid(uint256 _auctionId) external {
        if (_auctions[_auctionId].status == AuctionStatus.Open) {
            // if auction is open don't allow highest bidder withdrawal
            if (msg.sender == _auctions[_auctionId].highestBidder)
                revert AARTMarket_IsHighestBidder(_auctionId);
        }
        uint256 bidAmount = auctionBidderAmounts[_auctionId][msg.sender];
        if (bidAmount == 0) revert AARTMarket_HasNoBid(_auctionId);
        auctionBidderAmounts[_auctionId][msg.sender] = 0;
        // return bid amount to the bidder
        PaymentLib.transferToken(
            _auctions[_auctionId].paymentToken,
            address(this),
            msg.sender,
            bidAmount
        );
    }

    /**
     * @dev Ends an auction and transfers the NFT to the highest bidder.
     * @dev will return NFT to seller if no bid is made.
     * @param _auctionId The ID of the auction to be ended.
     */
    function endAuction(uint256 _auctionId) external {
        Auction storage _auction = _auctions[_auctionId];
        if (
            _auctionStatus(_auctionId) != AuctionStatus.Ended ||
            _auction.status != AuctionStatus.Open
        ) revert AARTMarket_AuctionPeriodNotEnded(_auctionId, _auction.endTime);
        uint256 tokenId = _auction.tokenId;
        // update auction status
        _auction.status = AuctionStatus.Ended;

        address buyer;
        if (_auction.highestBidder != address(0)) {
            buyer = _auction.highestBidder;

            // handle payment
            _handlePayment(
                tokenId,
                _auction.seller,
                address(this),
                _auction.paymentToken,
                _auction.highestBid
            );

            // transfer nft to the highest bidder
            nftContract.safeTransferFrom(address(this), buyer, tokenId);
        } else {
            // transfer nft back to the seller
            nftContract.safeTransferFrom(
                address(this),
                _auction.seller,
                tokenId
            );
        }

        emit AuctionEnded(_auctionId, buyer);
    }

    /**
     * @dev Cancels an ongoing auction, called by the seller.
     * @dev auction must in open state.
     * @param _auctionId The ID of the auction to be canceled.
     */
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

    /**
     * @dev Checks if the provided user is the owner of the AART NFT.
     * @param _tokenId The ID of the NFT.
     * @param user The address to be checked.
     */
    function _isAARTTokenOwner(uint256 _tokenId, address user) internal view {
        // check that the user is the owner of the token
        // also reverts if the token does not exists in the AART collection
        if (nftContract.ownerOf(_tokenId) != user)
            revert AARTMarket_OnlyTokenOwner(_tokenId);
    }

    /**
     * @dev Checks if the provided ERC20 token is allowed in the marketplace.
     * @dev native ETH is supported by default.
     * @param token The ERC20 token address to be checked.
     */
    function _allowedToken(address token) internal view {
        if (token != address(0)) {
            if (!_erc20Tokensmapping[token])
                revert AARTMarket_UnsupportedToken(token);
        }
    }

    /**
     * @dev Handles the payment for an NFT purchase, offer acceptance, or auction.
     * @param tokenId The ID of the NFT.
     * @param seller The address of the seller.
     * @param buyer The address of the buyer.
     * @param paymentToken The token used for payment, address(0) for ETH.
     * @param price The total payment amount.
     */
    function _handlePayment(
        uint256 tokenId,
        address seller,
        address buyer,
        address paymentToken,
        uint256 price
    ) internal {
        (address royaltyReceiver, uint256 royaltyAmount) = nftContract
            .royaltyInfo(tokenId, price);

        uint256 feeAmount = (price * fee) / PRECISION;

        // pay platform fee
        PaymentLib.transferToken(paymentToken, buyer, feeRecipient, feeAmount);

        uint256 finalAmount;
        unchecked {
            finalAmount = price - feeAmount;
        }

        if (seller != royaltyReceiver && royaltyAmount != 0) {
            // pay NFT creator royalty fee
            PaymentLib.transferToken(
                paymentToken,
                buyer,
                royaltyReceiver,
                royaltyAmount
            );

            unchecked {
                finalAmount -= royaltyAmount;
            }

            emit RoyaltyPaid(tokenId, royaltyReceiver, royaltyAmount);
        }

        // pay seller remaining amount
        PaymentLib.transferToken(paymentToken, buyer, seller, finalAmount);
    }

    /**
     * @dev Checks the status of an offer.
     * @param tokenId The ID of the NFT for which the offer status is checked.
     * @param offerId The ID of the offer.
     * @return status The status of the offer.
     */
    function _offerStatus(
        uint256 tokenId,
        uint256 offerId
    ) internal view returns (OfferStatus) {
        Offer storage offer = _offers[tokenId][offerId];
        if (offer.expireTime < uint48(block.timestamp)) {
            return OfferStatus.Ended;
        } else {
            return offer.status;
        }
    }

    /**
     * @dev Checks the status of an auction.
     * @param auctionId The ID of the auction.
     * @return status The status of the auction.
     */
    function _auctionStatus(
        uint256 auctionId
    ) internal view returns (AuctionStatus) {
        Auction storage auction = _auctions[auctionId];
        AuctionStatus status = auction.status;
        uint48 timestamp = uint48(block.timestamp);
        if (
            status == AuctionStatus.Canceled ||
            status == AuctionStatus.DirectBuy
        ) {
            return status;
        } else if (auction.startTime > timestamp) {
            return AuctionStatus.Closed;
        } else if (timestamp <= auction.endTime) {
            return AuctionStatus.Open;
        } else {
            return AuctionStatus.Ended;
        }
    }

    // ***************** //
    //      Getters      //
    // ***************** //

    /**
     * @dev Retrieves all current listings in the marketplace.
     */
    function getListings() external view returns (Listing[] memory) {
        return _listings;
    }

    /**
     * @dev Retrieves all current auctions in the marketplace.
     */
    function getAuctions() external view returns (Auction[] memory) {
        return _auctions;
    }

    /**
     * @dev Retrieves the status of an auction.
     * @param _auctionId The ID of the auction.
     * @return status The status of the auction.
     */
    function getAuctionStatus(
        uint256 _auctionId
    ) external view returns (AuctionStatus) {
        return _auctionStatus(_auctionId);
    }

    /**
     * @dev Retrieves all offers made for a specific NFT.
     * @param tokenId The ID of the NFT.
     * @return offers An array of all Offers structures.
     */
    function getTokenBuyOffers(
        uint256 tokenId
    ) external view returns (Offer[] memory) {
        return _offers[tokenId];
    }

    /**
     * @dev Retrieves the bid amount placed by a specific user in an auction.
     * @param auctionId The ID of the auction.
     * @param account The address of the user.
     * @return bidAmount The bid amount placed by the user.
     */
    function getUserBidAmount(
        uint256 auctionId,
        address account
    ) external view returns (uint256) {
        return auctionBidderAmounts[auctionId][account];
    }

    /**
     * @dev ERC721 receiver callback to accept incoming NFT transfers.
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // ********************** //
    //     Owner functions    //
    // ********************** //

    /**
     * @dev Sets the trade fee percentage.
     * @dev callable by the owner
     * @param _fee The new trade fee percentage.
     */
    function setFee(uint256 _fee) external onlyOwner {
        if (_fee > MAX_FEE) revert AARTMarket_InvalidFee(_fee);
        fee = _fee;

        emit NewFee(_fee);
    }

    /**
     * @dev Sets the recipient of market fees.
     * @dev callable by the owner
     * @param _newRecipient The new address to receive trade fees.
     */
    function setFeeRecipient(address _newRecipient) external onlyOwner {
        feeRecipient = _newRecipient;
    }

    /**
     * @dev Adds support for a new ERC20 token in the marketplace.
     * @dev callable by the owner.
     * @param _token The address of the ERC20 token to be supported.
     */
    function addSupportedToken(address _token) external onlyOwner {
        if (_erc20Tokensmapping[_token])
            revert AARTMarket_AlreadySupported(_token);
        _erc20Tokensmapping[_token] = true;
        supportedERC20tokens.push(_token);

        emit NewSupportedToken(_token);
    }
}
